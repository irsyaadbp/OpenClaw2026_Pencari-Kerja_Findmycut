import { processAndUpload } from "../lib/r2";

export async function uploadPhoto(input: Buffer | Uint8Array | string) {
  return processAndUpload(input, "photos");
}
