import { Hono } from "hono";
import { processAndUpload } from "../lib/r2";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("uploads");
const uploads = new Hono();

/**
 * POST /api/v1/uploads
 *
 * Accepts:
 * - multipart/form-data with "file" field (image file)
 * - JSON with "image_base64" field (base64 data URL from canvas)
 *
 * Returns: { id, url, width, height, size_bytes }
 */
uploads.post("/", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";

    let input: Buffer | string;
    let source: string;

    if (contentType.includes("multipart/form-data")) {
      // File upload mode
      const body = await c.req.parseBody();
      const file = body["file"];

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      input = Buffer.from(await file.arrayBuffer());
      source = `file:${file.name}`;
    } else {
      // Base64 mode (from canvas.toDataURL)
      const { image_base64 } = await c.req.json();

      if (!image_base64) {
        return c.json({ error: "Provide 'file' (multipart) or 'image_base64' (JSON)" }, 400);
      }

      input = image_base64;
      source = "base64";
    }

    const result = await processAndUpload(input, "photos");

    log.info({ source, url: result.url }, "Upload complete");

    return c.json({
      id: result.key.split("/").pop()?.replace(".webp", ""),
      url: result.url,
      width: result.width,
      height: result.height,
      size_bytes: result.sizeBytes,
    });
  } catch (err: any) {
    log.error({ err }, "Upload failed");
    return c.json({ error: err.message }, 500);
  }
});

export default uploads;
