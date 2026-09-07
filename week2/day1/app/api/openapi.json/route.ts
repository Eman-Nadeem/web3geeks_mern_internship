import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/swagger";

export async function GET() {
  return NextResponse.json(getOpenApiSpec());
}
