import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { GenerationStyle } from "@/lib/types";

const outputWidth = 1080;
const outputHeight = 1350;
const webpQuality = 90;
const maxInlineWebPBytes = 2_750_000;

function buildGeneratedFileName(style: GenerationStyle) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  return `decoriluxe-catalog-${style}-${timestamp}.webp`;
}

async function saveWebPToLocalPublic(fileName: string, webpBuffer: Buffer) {
  const outputDirectory = path.join(process.cwd(), "public", "generated");
  const outputPath = path.join(outputDirectory, fileName);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, webpBuffer);

  return `/generated/${fileName}`;
}

function buildWebPDataUrl(webpBuffer: Buffer) {
  return `data:image/webp;base64,${webpBuffer.toString("base64")}`;
}

async function saveWebPForDownload(
  fileName: string,
  webpBuffer: Buffer,
  providerImageUrl: string,
) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`generated/${fileName}`, webpBuffer, {
        access: "public",
        contentType: "image/webp",
      });

      return blob.url;
    } catch (error) {
      if (!process.env.VERCEL) {
        throw error;
      }
    }
  }

  if (process.env.VERCEL) {
    if (webpBuffer.byteLength <= maxInlineWebPBytes) {
      return buildWebPDataUrl(webpBuffer);
    }

    return providerImageUrl;
  }

  return saveWebPToLocalPublic(fileName, webpBuffer);
}

export async function convertGeneratedImageToWebP(
  imageUrl: string,
  style: GenerationStyle,
) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Unable to fetch generated image for WebP export.");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const fileName = buildGeneratedFileName(style);

  const webpBuffer = await sharp(imageBuffer)
    .resize(outputWidth, outputHeight, {
      background: "#ffffff",
      // Keep the full provider image visible. "cover" fills 4:5 but crops
      // catalog text/details when the provider returns a different ratio.
      fit: "contain",
      position: "center",
    })
    .webp({ quality: webpQuality })
    .toBuffer();

  const exportedImageUrl = await saveWebPForDownload(
    fileName,
    webpBuffer,
    imageUrl,
  );

  return {
    imageUrl: exportedImageUrl,
    fileName,
  };
}
