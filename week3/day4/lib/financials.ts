import prisma from './prisma';

/**
 * Standard half-up currency rounding to exactly 2 decimal places.
 * Prevents floating-point drift in ledger calculations.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Retrieves the current effective marketplace commission rate from the append-only history.
 * Default is 0.10 (10%) if no custom setting has been configured.
 */
export async function getCurrentCommissionRate(client: any = prisma): Promise<number> {
  const latestSetting = await client.commissionSetting.findFirst({
    where: {
      effectiveFrom: {
        lte: new Date(),
      },
    },
    orderBy: [
      { effectiveFrom: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return latestSetting ? latestSetting.rate : 0.10;
}

/**
 * Calculates commission and vendor net earnings with strict rounding.
 * Gross amount = VendorOrder.subtotal (commissionable product base).
 */
export function calculateCommission(grossAmount: number, rate: number) {
  const normalizedGross = roundCurrency(grossAmount);
  const commissionAmount = roundCurrency(normalizedGross * rate);
  const vendorEarning = roundCurrency(normalizedGross - commissionAmount);

  return {
    grossAmount: normalizedGross,
    commissionRate: rate,
    commissionAmount,
    vendorEarning,
  };
}

/**
 * Calculates 5-figure vendor financial metrics derived server-side.
 */
export async function getVendorEarningsSummary(vendorId: string, client: any = prisma) {
  // Fetch all commission records for this vendor
  const commissionRecords = await client.commissionRecord.findMany({
    where: { vendorId },
    include: {
      settlementItem: true,
    },
  });

  let totalSales = 0;
  let platformCommission = 0;
  let netEarnings = 0;
  let pendingEarnings = 0;
  let availableBalance = 0;

  for (const record of commissionRecords) {
    // Non-cancelled and non-refunded records contribute to sales and earnings metrics
    if (record.status !== 'CANCELLED' && record.status !== 'REFUNDED') {
      totalSales = roundCurrency(totalSales + record.grossAmount);
      platformCommission = roundCurrency(platformCommission + record.commissionAmount);
      netEarnings = roundCurrency(netEarnings + record.vendorEarning);

      if (record.status === 'PENDING') {
        pendingEarnings = roundCurrency(pendingEarnings + record.vendorEarning);
      } else if (record.status === 'EARNED' && !record.settlementItem) {
        // Available Balance = EARNED with no SettlementItem attached
        availableBalance = roundCurrency(availableBalance + record.vendorEarning);
      }
    }
  }

  return {
    totalSales,
    platformCommission,
    netEarnings,
    pendingEarnings,
    availableBalance,
  };
}

/**
 * Returns all EARNED, unsettled commission records available for payout to the vendor.
 */
export async function getVendorAvailableCommissionRecords(vendorId: string, client: any = prisma) {
  return await client.commissionRecord.findMany({
    where: {
      vendorId,
      status: 'EARNED',
      settlementItem: null,
    },
    orderBy: { createdAt: 'asc' },
  });
}
