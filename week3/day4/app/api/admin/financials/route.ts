import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, successResponse, errorResponse, AppError } from '@/lib/guards';
import { roundCurrency } from '@/lib/financials';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const vendorId = searchParams.get('vendorId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    // Date filter clause
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Build filters for commission records
    const commWhere: any = {};
    if (vendorId) commWhere.vendorId = vendorId;
    if (startDate || endDate) commWhere.createdAt = dateFilter;

    // Build filters for settlements
    const settWhere: any = {};
    if (vendorId) settWhere.vendorId = vendorId;
    if (startDate || endDate) settWhere.createdAt = dateFilter;

    // Fetch underlying rows directly to calculate aggregates
    const [allCommissionRecords, allSettlements] = await Promise.all([
      prisma.commissionRecord.findMany({
        where: commWhere,
      }),
      prisma.settlement.findMany({
        where: settWhere,
      }),
    ]);

    let totalMarketplaceSales = 0;
    let totalPlatformCommission = 0;
    let totalVendorEarnings = 0;
    let refundAmount = 0;

    for (const record of allCommissionRecords) {
      if (record.status !== 'CANCELLED' && record.status !== 'REFUNDED') {
        totalMarketplaceSales = roundCurrency(totalMarketplaceSales + record.grossAmount);
        totalPlatformCommission = roundCurrency(totalPlatformCommission + record.commissionAmount);
        totalVendorEarnings = roundCurrency(totalVendorEarnings + record.vendorEarning);
      } else if (record.status === 'REFUNDED') {
        refundAmount = roundCurrency(refundAmount + record.grossAmount);
      }
    }

    let pendingSettlements = 0;
    let completedSettlements = 0;

    for (const settlement of allSettlements) {
      if (settlement.status === 'PENDING' || settlement.status === 'PROCESSING') {
        pendingSettlements = roundCurrency(pendingSettlements + settlement.amount);
      } else if (settlement.status === 'PAID') {
        completedSettlements = roundCurrency(completedSettlements + settlement.amount);
      }
    }

    return successResponse({
      totalMarketplaceSales,
      totalPlatformCommission,
      totalVendorEarnings,
      pendingSettlements,
      completedSettlements,
      refundAmount,
      totalRecords: allCommissionRecords.length,
      totalSettlementRequests: allSettlements.length,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching admin financials:', error);
    return errorResponse('Failed to fetch admin financials.', 500);
  }
}
