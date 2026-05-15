import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { createChildLogger } from "./logger";

const log = createChildLogger("r2");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "findmycut";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  key: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Process image: convert to WebP + resize + compress, then upload to R2.
 * Accepts Buffer, Uint8Array, or base64 string.
 */
export async function processAndUpload(
  input: Buffer | Uint8Array | string,
  folder: string = "uploads"
): Promise<UploadResult> {
  const startTime = Date.now();

  // Handle base64 input
  let buffer: Buffer;
  if (typeof input === "string") {
    // Remove data:image/xxx;base64, prefix if present
    const base64 = input.replace(/^data:image\/\w+;base64,/, "");
    buffer = Buffer.from(base64, "base64");
  } else {
    buffer = Buffer.from(input);
  }

  const originalSize = buffer.length;

  // Process with Sharp: WebP + resize + compress
  const processed = await sharp(buffer)
    .resize(1080, 1080, {
      fit: "inside",        // Maintain aspect ratio, max 1080px
      withoutEnlargement: true, // Don't upscale small images
    })
    .webp({
      quality: 80,          // Good quality, reasonable size
      effort: 4,            // Balance between speed and compression
    })
    .toBuffer({ resolveWithObject: true });

  const { data: webpData, info } = processed;
  const key = `${folder}/${uuid()}.webp`;

  // Upload to R2
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: webpData,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000", // 1 year cache
    })
  );

  const elapsed = Date.now() - startTime;
  const compression = Math.round((1 - webpData.length / originalSize) * 100);

  log.info(
    {
      key,
      original_kb: Math.round(originalSize / 1024),
      webp_kb: Math.round(webpData.length / 1024),
      compression: `${compression}%`,
      dimensions: `${info.width}x${info.height}`,
      elapsed_ms: elapsed,
    },
    `📸 Image processed: ${compression}% smaller`
  );

  return {
    key,
    url: `${R2_PUBLIC_URL}/${key}`,
    width: info.width,
    height: info.height,
    sizeBytes: webpData.length,
  };
}

/**
 * Download image from URL and upload to R2 (for Replicate generated images).
 */
export async function downloadAndUpload(
  imageUrl: string,
  folder: string = "generated"
): Promise<UploadResult> {
  const startTime = Date.now();

  log.info({ imageUrl }, "⬇️ Downloading image from external URL");

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  log.info(
    { downloaded_kb: Math.round(buffer.length / 1024) },
    "⬇️ Download complete"
  );

  // Process and upload
  const result = await processAndUpload(buffer, folder);

  log.info(
    { elapsed_ms: Date.now() - startTime },
    "✅ External image saved to R2"
  );

  return result;
}
