import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { AppError } from "@/server/http/AppError";
import { successResponse } from "@/server/http/response";
import { env } from "@/server/config/env";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

export const POST = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (req: NextRequest, ctx: OrgRoleContext) => {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        throw AppError.badRequest("Invalid multipart form data");
      }

      const file = formData.get("file") as File | null;

      if (!file) {
        throw AppError.badRequest("No image file provided");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw AppError.badRequest("File size exceeds 2MB limit");
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw AppError.badRequest("Invalid file type. Only PNG, JPEG, WebP, and GIF are allowed");
      }

      let logoUrl = "";

      if (env.BLOB_READ_WRITE_TOKEN) {
        const ext = file.name.split(".").pop() || "png";
        const blob = await put(`org-logos/${ctx.organization.id}-${Date.now()}.${ext}`, file, {
          access: "public",
          token: env.BLOB_READ_WRITE_TOKEN,
        });
        logoUrl = blob.url;
      } else {
        // Fallback for local development without Vercel Blob token
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        logoUrl = `data:${file.type};base64,${base64}`;
      }

      return successResponse(
        { url: logoUrl },
        "Logo uploaded successfully",
        200
      );
    })
  )
);
