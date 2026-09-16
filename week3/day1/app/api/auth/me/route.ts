import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/guards';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse('Not authenticated', 401);
  }

  return successResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    vendor: user.vendor
      ? {
          id: user.vendor.id,
          name: user.vendor.name,
          slug: user.vendor.slug,
          description: user.vendor.description,
          logoUrl: user.vendor.logoUrl,
          status: user.vendor.status,
          email: user.vendor.email,
          phone: user.vendor.phone,
        }
      : null,
  });
}
