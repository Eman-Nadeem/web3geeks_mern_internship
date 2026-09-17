import { NextRequest } from 'next/server';
import { requireVendor, assertVendorOrderOwnership, successResponse, errorResponse, AppError, ALLOWED_ORDER_TRANSITIONS } from '@/lib/guards';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { vendor } = await requireVendor();
    const { id: vendorOrderId } = await context.params;

    const vendorOrder = await assertVendorOrderOwnership(vendorOrderId, vendor.id);

    const allowedNextStatuses = ALLOWED_ORDER_TRANSITIONS[vendorOrder.status] || [];

    return successResponse({
      ...vendorOrder,
      allowedNextStatuses,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching vendor order detail:', error);
    return errorResponse('Failed to fetch vendor order detail.', 500);
  }
}
