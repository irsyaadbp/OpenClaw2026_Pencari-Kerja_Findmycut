import { uploadToR2 } from "../lib/r2";

export async function uploadPhoto(file: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(file, contentType, "photos");
}
