import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';
import { createPaymentSchema } from '@/lib/validations';
import { generatePaymentReference } from '@/lib/mockPaymentGateway';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const parseResult = createPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid payment initiation parameters.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { orderId, method } = parseResult.data;

    // Fetch parent order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendorOrders: true,
        payments: true,
      },
    });

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    if (order.customerId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: You do not own this order.', 403);
    }

    if (order.paymentStatus === 'PAID') {
      return errorResponse('This order has already been paid.', 400);
    }

    // Recompute payable amount server-side from parent Order.totalAmount (never trust client)
    const payableAmount = order.totalAmount;
    const referenceId = generatePaymentReference();

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: user.id,
        amount: payableAmount,
        currency: 'PKR',
        method: method || 'MOCK_GATEWAY',
        referenceId,
        status: 'PENDING',
        provider: method === 'COD' ? 'cod' : 'mock-gateway',
      },
    });

    return successResponse(payment, 201);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error initiating payment:', error);
    return errorResponse('Failed to initiate payment.', 500);
  }
}
