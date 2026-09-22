import { ZodSchema, ZodError } from "zod";
import { AppError, FieldError } from "./AppError";

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: FieldError[] = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    throw new AppError(400, errors[0]?.message || "Validation failed", errors);
  }
  return result.data;
}

export function formatZodError(error: ZodError): FieldError[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}
