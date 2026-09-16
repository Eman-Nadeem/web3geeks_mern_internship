import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { errorResponse, successResponse } from '@/lib/guards';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Invalid input', 400, result.error.flatten().fieldErrors);
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { vendor: true },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await setSessionCookie(token);

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
            status: user.vendor.status,
          }
        : null,
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Internal server error during login', 500);
  }
}
