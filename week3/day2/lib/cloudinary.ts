import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abcdefghijklmnopqrstuvwxyz01234',
  secure: true,
});

export { cloudinary };

/**
 * Uploads a file buffer or base64 data string to Cloudinary
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer | string,
  options?: {
    folder?: string;
    publicId?: string;
    tags?: string[];
  }
): Promise<{ url: string; publicId: string; format: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // If credentials are placeholder/missing, provide clear diagnostics
    const isConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (!isConfigured) {
      // In dev mode when keys aren't set, we can return a high quality mock/unsplash/data representation
      console.warn('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) not fully configured. Using fallback handling.');
    }

    const uploadOptions = {
      folder: options?.folder || 'nexusmarket/products',
      public_id: options?.publicId,
      tags: options?.tags || ['nexusmarket', 'product-image'],
      resource_type: 'auto' as const,
    };

    if (typeof fileBuffer === 'string') {
      // Base64 or remote URL string
      cloudinary.uploader.upload(fileBuffer, uploadOptions, (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      });
    } else {
      // Stream Buffer
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload stream failed'));
        }
        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      });
      stream.end(fileBuffer);
    }
  });
}
