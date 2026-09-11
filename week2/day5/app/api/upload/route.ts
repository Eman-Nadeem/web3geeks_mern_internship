import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    const hasSignedConfig = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));
    const hasUnsignedConfig = Boolean(cloudName && uploadPreset);

    if (!hasSignedConfig && !hasUnsignedConfig) {
      return NextResponse.json(
        {
          error:
            "Cloudinary credentials are not set in .env. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL / CLOUDINARY_UPLOAD_PRESET).",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image" }, { status: 400 });
    }

    // Max 10MB file size limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image file size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // 1. Unsigned preset upload via Cloudinary REST API
    if (hasUnsignedConfig && !hasSignedConfig) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", dataUri);
      uploadFormData.append("upload_preset", uploadPreset!);
      uploadFormData.append("folder", "syncdocs/avatars");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to upload to Cloudinary");
      }

      return NextResponse.json({
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
      });
    }

    // 2. Signed upload with Cloudinary SDK
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "syncdocs/avatars",
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload image to Cloudinary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
