import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { errorResponse, successResponse } from '@/lib/guards';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const { name, email, password } = result.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return errorResponse('An account with this email address already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await setSessionCookie(token);

    return successResponse(user, 201);
  } catch (err) {
    console.error('Registration error:', err);
    return errorResponse('Internal server error during registration', 500);
  }
}
