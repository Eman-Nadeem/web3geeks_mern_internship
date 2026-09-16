import { NextRequest } from 'next/server';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    // Authenticated active vendor only
    const { vendor } = await requireVendor(['ACTIVE']);

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return errorResponse('No file uploaded', 400);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await uploadToCloudinary(buffer, {
        folder: `nexusmarket/vendors/${vendor.slug}`,
      });

      return successResponse(result, 201);
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      const { image, url } = body;

      if (!image && !url) {
        return errorResponse('Please provide image data or a URL', 400);
      }

      const result = await uploadToCloudinary(image || url, {
        folder: `nexusmarket/vendors/${vendor.slug}`,
      });

      return successResponse(result, 201);
    } else {
      return errorResponse('Unsupported Content-Type. Please use multipart/form-data or application/json', 400);
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Cloudinary upload error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Image upload failed', 500);
  }
}
