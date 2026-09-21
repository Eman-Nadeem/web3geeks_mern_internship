import { NextRequest } from 'next/server';
import { requireVendor, successResponse, errorResponse, assertSettlementOwnership, AppError } from '@/lib/guards';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { vendor } = await requireVendor();
    const { id } = await params;

    const settlement = await assertSettlementOwnership(id, vendor.id);

    return successResponse(settlement);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching vendor settlement:', error);
    return errorResponse('Failed to fetch settlement.', 500);
  }
}
