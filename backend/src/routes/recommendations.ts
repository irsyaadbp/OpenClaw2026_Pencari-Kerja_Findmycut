import { Hono } from "hono";
import * as recService from "../services/recommendation.service";

const recommendations = new Hono();

recommendations.get("/:id/recommendations", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await recService.getRecommendations(id, c.req.raw.headers);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 404);
  }
});

export default recommendations;
