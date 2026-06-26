import { NextResponse } from "next/server";
import { appConfig, supportedImageTypes } from "@/lib/config";
import { generateCatalogComposition } from "@/lib/fal/catalog-service";
import { GenerationStyle } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

function parseFeatures(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || !rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

const generationStyles = new Set<GenerationStyle>([
  "white-background",
  "white-background-alt-angle",
  "lifestyle-room",
  "premium-catalog",
  "material-close-up",
]);

function parseStyle(rawValue: FormDataEntryValue | null): GenerationStyle {
  const style = String(rawValue ?? "premium-catalog");

  if (generationStyles.has(style as GenerationStyle)) {
    return style as GenerationStyle;
  }

  return "premium-catalog";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Please upload one product image." },
        { status: 400 },
      );
    }

    if (!supportedImageTypes.has(image.type)) {
      return NextResponse.json(
        {
          error: "Unsupported image type. Please upload a PNG, JPG, or WEBP image.",
        },
        { status: 400 },
      );
    }

    if (image.size > appConfig.maxUploadSizeBytes) {
      return NextResponse.json(
        { error: "The uploaded image is too large for this MVP." },
        { status: 400 },
      );
    }

    const productName = String(formData.get("productName") ?? "").trim();
    const material = String(formData.get("material") ?? "").trim();
    const dimensions = String(formData.get("dimensions") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim();
    const deliveryInfo = String(formData.get("deliveryInfo") ?? "").trim();
    const existingDescription = String(
      formData.get("existingDescription") ?? "",
    ).trim();
    const language = String(formData.get("language") ?? "fr").trim() || "fr";
    const features = parseFeatures(formData.get("features"));
    const style = parseStyle(formData.get("style"));

    const result = await generateCatalogComposition(image, {
      productName,
      material,
      dimensions,
      color,
      deliveryInfo,
      existingDescription,
      language,
      features,
      style,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate catalog image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
