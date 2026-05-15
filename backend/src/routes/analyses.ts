import { Hono } from "hono";
import * as analysisService from "../services/analysis.service";
import { runAgentAsync } from "../services/agent-runner.service";

const analyses = new Hono();

analyses.post("/", async (c) => {
  try {
    const { user_id, image_url, image_urls, latitude, longitude, tier } = await c.req.json();
    if (!user_id || (!image_url && !image_urls)) {
      return c.json({ error: "user_id and image_url (or image_urls[]) required" }, 400);
    }

    // Support single or multiple images
    const urls: string[] = image_urls || [image_url];

    const analysis = await analysisService.createAnalysis(user_id, urls[0]);

    // Trigger agent pipeline async (non-blocking)
    runAgentAsync({
      analysisId: analysis.id,
      imageUrls: urls,
      userLatitude: latitude,
      userLongitude: longitude,
      tier: tier || "free",
    });

    return c.json({ analysis_id: analysis.id, status: "processing" }, 202);
  } catch (err: any) {
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
