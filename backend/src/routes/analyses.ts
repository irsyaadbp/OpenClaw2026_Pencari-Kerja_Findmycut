import { Hono } from "hono";
import * as analysisService from "../services/analysis.service";

const analyses = new Hono();

analyses.post("/", async (c) => {
  try {
    const { user_id, image_url } = await c.req.json();
    if (!user_id || !image_url) return c.json({ error: "user_id and image_url required" }, 400);

    const analysis = await analysisService.createAnalysis(user_id, image_url);

    // TODO: trigger agent pipeline async
    // runAgentPipeline(analysis.id, image_url)

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
