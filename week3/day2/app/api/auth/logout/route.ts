import { clearSessionCookie } from '@/lib/auth';
import { successResponse } from '@/lib/guards';

export async function POST() {
  await clearSessionCookie();
  return successResponse({ message: 'Logged out successfully' });
}
