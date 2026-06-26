import { NextResponse } from "next/server";
import { appConfig, supportedImageTypes } from "@/lib/config";
import { generateProductCopy } from "@/lib/copy-generator";

export const runtime = "nodejs";
export const maxDuration = 90;

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

    const result = await generateProductCopy(image, {
      productName,
      material,
      dimensions,
      color,
      deliveryInfo,
      existingDescription,
      language,
      features,
      style: "premium-catalog",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate product copy.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
