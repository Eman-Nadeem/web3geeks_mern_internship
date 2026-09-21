import { NextRequest } from 'next/server';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { uploadToCloudinary } from '@/lib/cloudinary';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

      // Server-side MIME type validation
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return errorResponse(
          `Invalid file type: "${file.type}". Only JPEG, PNG, WebP, and GIF images are allowed.`,
          400
        );
      }

      // Server-side file size validation
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse(
          `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB.`,
          400
        );
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

      if (image) {
        // Base64 or Data URI validation
        if (typeof image !== 'string') {
          return errorResponse('Image data must be a valid string', 400);
        }

        if (image.startsWith('data:')) {
          const match = image.match(/^data:image\/(?:jpeg|png|webp|gif);base64,/i);
          if (!match) {
            return errorResponse('Invalid image format. Only JPEG, PNG, WebP, and GIF data URIs are allowed.', 400);
          }
        } else if (!image.startsWith('http://') && !image.startsWith('https://')) {
          return errorResponse('Invalid image format. Must be an image data URI (data:image/...) or HTTP URL.', 400);
        }

        // Approx size check for base64
        const estimatedSize = (image.length * 3) / 4;
        if (estimatedSize > MAX_FILE_SIZE) {
          return errorResponse('Image payload exceeds maximum allowed size of 5 MB.', 400);
        }
      }

      if (url && typeof url === 'string') {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return errorResponse('Image URL must use http or https protocol', 400);
          }
        } catch {
          return errorResponse('Invalid image URL format', 400);
        }
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
