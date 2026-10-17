import { IMAGE_INPUT_MAX_BYTES, IMAGE_MAX_BYTES, IMAGE_MAX_EDGE } from "./image-limits";

export async function prepareImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error("Scegli una foto JPG, PNG o WebP.");
  if (!file.size || file.size > IMAGE_INPUT_MAX_BYTES) throw new Error("Il file originale deve pesare al massimo 10 MB.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Immagine non valida. Scegli un’altra foto."); });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) throw new Error("Questa foto è troppo grande. Scegli un’immagine più piccola.");
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Non siamo riusciti a preparare la foto. Riprova.");
    for (const edge of [IMAGE_MAX_EDGE, 1000, 800, 600]) {
      const ratio = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= IMAGE_MAX_BYTES) return blob;
      }
    }
    throw new Error("Non siamo riusciti a ridurre la foto a 250 KB. Scegli un’altra immagine.");
  } finally { bitmap.close(); }
}
