export type PhotoPayload = { mime: "image/jpeg"; data: string };

const MAX_SIDE = 1200;

// Shrinks a picked/captured photo so uploads stay small and fast (even on mobile data).
export async function prepareImage(file: File): Promise<{ payload: PhotoPayload; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const previewUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { payload: { mime: "image/jpeg", data: previewUrl.split(",")[1] }, previewUrl };
}
