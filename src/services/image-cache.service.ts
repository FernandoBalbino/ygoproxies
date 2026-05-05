export async function downloadCardImage(imageUrl: string): Promise<Buffer> {
  if (!imageUrl) {
    throw new Error("Imagem da carta nao encontrada.");
  }

  const response = await fetch(imageUrl, {
    cache: "no-store",
    headers: {
      Accept: "image/jpeg,image/*",
      "User-Agent": "ygoproxies-vercel/0.1",
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao baixar a imagem da carta.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("A URL retornou um arquivo que nao e imagem.");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  if (!imageBuffer.length) {
    throw new Error("Imagem da carta nao encontrada.");
  }

  return imageBuffer;
}
