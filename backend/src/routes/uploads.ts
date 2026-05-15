import { Hono } from "hono";
import * as uploadService from "../services/upload.service";

const uploads = new Hono();

uploads.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.uploadPhoto(buffer, file.type);

    return c.json({
      id: crypto.randomUUID(),
      url: result.url,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default uploads;
