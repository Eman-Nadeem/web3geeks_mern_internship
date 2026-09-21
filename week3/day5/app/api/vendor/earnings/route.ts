import { NextRequest } from 'next/server';
import { requireVendor, successResponse, errorResponse, AppError } from '@/lib/guards';
import { getVendorEarningsSummary } from '@/lib/financials';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();

    const summary = await getVendorEarningsSummary(vendor.id);

    return successResponse({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
      },
      ...summary,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching vendor earnings:', error);
    return errorResponse('Failed to fetch vendor earnings.', 500);
  }
}
