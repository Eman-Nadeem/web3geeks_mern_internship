import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Pre-computed dummy hash of a random string with cost 12 to mitigate timing attacks
const DUMMY_HASH =
  "$2a$12$e8Y6lF1H9wSgM0qG5ZqQ4e1yT/R2wF5bL/vG.F.kQ9E6w4y.j2z8O";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function verifyDummyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, DUMMY_HASH);
}
