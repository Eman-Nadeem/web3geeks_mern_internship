import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, successResponse, errorResponse, AppError } from '@/lib/guards';
import { commissionSettingSchema } from '@/lib/validations';
import { getCurrentCommissionRate } from '@/lib/financials';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const currentRate = await getCurrentCommissionRate();
    const history = await prisma.commissionSetting.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse({
      currentRate,
      currentRatePercentage: `${(currentRate * 100).toFixed(1)}%`,
      history,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching commission settings:', error);
    return errorResponse('Failed to fetch commission settings.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();

    const parseResult = commissionSettingSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid commission rate parameters.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { rate, effectiveFrom } = parseResult.data;

    // Append-only insertion: never updates existing rows to ensure historical accuracy
    const newSetting = await prisma.commissionSetting.create({
      data: {
        rate,
        effectiveFrom: effectiveFrom || new Date(),
        createdByUserId: user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse(
      {
        newSetting,
        message: `Commission rate successfully set to ${(rate * 100).toFixed(1)}%.`,
      },
      201
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error updating commission setting:', error);
    return errorResponse('Failed to update commission setting.', 500);
  }
}
