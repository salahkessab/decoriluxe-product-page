import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { GenerationStyle } from "@/lib/types";

const outputWidth = 1080;
const outputHeight = 1350;
const webpQuality = 90;

function buildGeneratedFileName(style: GenerationStyle) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  return `decoriluxe-catalog-${style}-${timestamp}.webp`;
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
  const outputDirectory = path.join(process.cwd(), "public", "generated");
  const fileName = buildGeneratedFileName(style);
  const outputPath = path.join(outputDirectory, fileName);

  await mkdir(outputDirectory, { recursive: true });

  const webpBuffer = await sharp(imageBuffer)
    .resize(outputWidth, outputHeight, {
      background: "#ffffff",
      fit: style === "white-background" ? "contain" : "cover",
      position: "center",
    })
    .webp({ quality: webpQuality })
    .toBuffer();

  await writeFile(outputPath, webpBuffer);

  return {
    imageUrl: `/generated/${fileName}`,
    fileName,
  };
}
