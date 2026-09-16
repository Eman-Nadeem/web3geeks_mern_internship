import { NextRequest } from 'next/server';
import { requireAuth, assertCustomerOrderOwnership, successResponse, errorResponse, AppError } from '@/lib/guards';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id: orderId } = await context.params;

    const order = await assertCustomerOrderOwnership(orderId, user.id);

    return successResponse(order);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching order details:', error);
    return errorResponse('Failed to fetch order details.', 500);
  }
}
