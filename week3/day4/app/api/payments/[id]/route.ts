import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, assertPaymentOwnership, AppError } from '@/lib/guards';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const payment = await assertPaymentOwnership(id, user.id, user.role === 'ADMIN');

    return successResponse(payment);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching payment:', error);
    return errorResponse('Failed to fetch payment.', 500);
  }
}
