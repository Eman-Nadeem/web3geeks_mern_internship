import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";
import { FieldError } from "./AppError";

export function successResponse<T>(
  data?: T,
  message: string = "Success",
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    success: true,
    message,
  };

  if (data !== undefined) {
    body.data = data;
  }

  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status: number = 400,
  errors?: FieldError[]
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    body.errors = errors;
  }

  return NextResponse.json(body, { status });
}
