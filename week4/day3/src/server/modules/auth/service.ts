import { prisma } from "../../db/prisma";
import { hashPassword, verifyPassword, verifyDummyPassword } from "../../lib/password";
import { signToken } from "../../lib/jwt";
import { AppError } from "../../http/AppError";
import { UserDTO } from "@/types";
import { RegisterInput, LoginInput } from "./schemas";

export async function register(input: RegisterInput): Promise<{ user: UserDTO; token: string }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, "Email already in use");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
    },
  });

  const token = await signToken({ sub: user.id });

  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  };
}

export async function login(input: LoginInput): Promise<{ user: UserDTO; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      password: true,
      createdAt: true,
    },
  });

  if (!user) {
    // Mitigate timing attacks by running dummy bcrypt comparison
    await verifyDummyPassword(input.password);
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(input.password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = await signToken({ sub: user.id });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  };
}

export async function getMe(userId: string): Promise<UserDTO> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}
