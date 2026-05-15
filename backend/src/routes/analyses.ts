import { Hono } from "hono";
import * as analysisService from "../services/analysis.service";
import { runAgentAsync } from "../services/agent-runner.service";
import { processAndUpload } from "../lib/r2";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("analyses");
const analyses = new Hono();

/**
 * POST /api/v1/analyses
 *
 * Accepts:
 * - { user_id, image_url }        — already uploaded to R2
 * - { user_id, image_urls[] }     — multiple URLs
 * - { user_id, image_base64 }     — base64 from canvas (auto-uploads to R2)
 * - { user_id, images_base64[] }  — multiple base64 (auto-uploads)
 *
 * Optional: { latitude, longitude, tier }
 *
 * Returns 202: { analysis_id, status: "processing" }
 */
analyses.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, latitude, longitude, tier } = body;

    if (!user_id) {
      return c.json({ error: "user_id required" }, 400);
    }

    // Resolve image URLs — support multiple input formats
    let imageUrls: string[] = [];

    if (body.image_urls && Array.isArray(body.image_urls)) {
      // Already URLs
      imageUrls = body.image_urls;
    } else if (body.image_url) {
      imageUrls = [body.image_url];
    } else if (body.images_base64 && Array.isArray(body.images_base64)) {
      // Multiple base64 — upload all to R2
      const uploads = await Promise.all(
        body.images_base64.map((b64: string) => processAndUpload(b64, "photos"))
      );
      imageUrls = uploads.map((u) => u.url);
    } else if (body.image_base64) {
      // Single base64 — upload to R2
      const upload = await processAndUpload(body.image_base64, "photos");
      imageUrls = [upload.url];
    } else {
      return c.json(
        { error: "Provide image_url, image_urls[], image_base64, or images_base64[]" },
        400
      );
    }

    log.info(
      { user_id, imageCount: imageUrls.length, tier },
      "Analysis request received"
    );

    const analysis = await analysisService.createAnalysis(user_id, imageUrls[0]);

    // Trigger agent pipeline async (non-blocking)
    runAgentAsync({
      analysisId: analysis.id,
      imageUrls,
      userLatitude: latitude,
      userLongitude: longitude,
      tier: tier || "free",
    });

    return c.json({ analysis_id: analysis.id, status: "processing" }, 202);
  } catch (err: any) {
    log.error({ err }, "Analysis creation failed");
    return c.json({ error: err.message }, 500);
  }
});

analyses.get("/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const status = await analysisService.getStatus(id);
    return c.json(status);
  } catch (err: any) {
    return c.json({ error: err.message }, 404);
  }
});

export default analyses;
