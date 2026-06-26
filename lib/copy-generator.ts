import { appConfig } from "@/lib/config";
import { analyzeUploadedProductImage } from "@/lib/fal/catalog-service";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  CatalogFormInput,
  LockedIdentitySummary,
  ProductCopyResult,
} from "@/lib/types";

type ProductCopyPayload = Omit<ProductCopyResult, "analysis">;

function extractJsonObject(rawOutput: string) {
  const trimmed = rawOutput.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = trimmed.indexOf("{");
  const lastBraceIndex = trimmed.lastIndexOf("}");
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  throw new Error("Product copy generation did not return valid JSON.");
}

function cleanStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit);
}

function formatManualInfo(formInput: CatalogFormInput) {
  return [
    `- product name: ${formInput.productName || "not provided"}`,
    `- material: ${formInput.material || "not provided"}`,
    `- dimensions: ${formInput.dimensions || "not provided"}`,
    `- color: ${formInput.color || "not provided"}`,
    `- delivery info: ${formInput.deliveryInfo || "not provided"}`,
    `- key features: ${formInput.features.join(", ") || "not provided"}`,
    `- existing product description: ${
      formInput.existingDescription || "not provided"
    }`,
  ].join("\n");
}

function buildCopyPrompt(
  identity: LockedIdentitySummary,
  formInput: CatalogFormInput,
) {
  const colorRule = formInput.color
    ? `The user manually provided this color: ${formInput.color}. You may mention this color as a factual detail.`
    : "The user did not manually provide a color. Do not mention color anywhere in the product title, description, or materials/features section. Do not write phrases like couleur beige, finition blanche, ton noyer, coloris naturel, noir, blanc, beige, bois naturel, or any other color/coloris/finish claim.";
  const materialRule = formInput.material
    ? `The user manually provided this material: ${formInput.material}. You may mention this material as a factual detail.`
    : "The user did not manually provide a material. Do not mention material as a factual specification. Do not claim wood, marble, metal, fabric, ceramic, glass, leather, MDF, veneer, or any other material.";
  const dimensionsRule = formInput.dimensions
    ? `The user manually provided these dimensions: ${formInput.dimensions}. You may mention these dimensions exactly.`
    : "The user did not manually provide dimensions. Do not mention dimensions, size measurements, height, width, depth, diameter, or scale as specifications.";
  const deliveryRule = formInput.deliveryInfo
    ? `The user manually provided this delivery information: ${formInput.deliveryInfo}. You may mention it exactly.`
    : "The user did not manually provide delivery information. Do not mention delivery, shipping time, stock status, installation, assembly, or packaging.";

  return [
    "Generate Shopify-ready product copy in French for Decoriluxe.",
    "Do not search the web. Do not use external product information.",
    "Combine visual analysis from the uploaded product image with trusted manual user-entered information and the optional pasted existing product description.",
    "Manual user-entered information is the source of truth.",
    "Use the pasted existing product description only as reference information to rewrite. Do not copy it word for word.",
    "If the pasted description conflicts with manual fields, manual fields win.",
    "If the pasted description contains useful technical details, use them only if they do not conflict with manual fields.",
    "Use image analysis only for general visual/style description: product type, silhouette, style direction, shape, design details, and possible room use.",
    "Do not use image analysis to create factual product specifications.",
    "If a factual detail is not entered manually, do not claim it as fact.",
    "Write original, natural, elegant French suitable for a premium furniture/home decor store.",
    "French language quality rules:",
    "- The user may write with spelling mistakes, grammar mistakes, mixed English/French, or incomplete wording.",
    "- Understand the intended meaning, then correct spelling, grammar, accents, and phrasing.",
    "- Do not copy the user's language mistakes into the final copy.",
    "- Use correct French orthography, correct accents, and natural product-page French.",
    "- Avoid awkward literal translation from English.",
    "- Keep sentences clear, elegant, professional, and easy to read.",
    "- If the user's input is unclear, rewrite safely without inventing technical details.",
    "Keep the copy ready to paste directly into Shopify.",
    "Output only JSON with product title in French, long French product description, and materials/features section.",
    "Product title rule: never mention price or dimensions in the product title, even if price or dimensions are provided elsewhere.",
    "Strict rules:",
    "- Do not invent color.",
    "- Do not invent material.",
    "- Do not invent dimensions.",
    "- Do not invent weight.",
    "- Do not invent warranty.",
    "- Do not invent delivery details.",
    "- Do not invent plug type.",
    "- Do not add fake certifications, brand claims, technical specifications, or care instructions unless provided manually.",
    "- Do not create a color field automatically.",
    "- If the user provides dimensions, material, or color manually, use exactly the user's wording for those details.",
    "- Do not write color, material, dimensions, weight, warranty, or delivery as specifications unless the user entered them manually.",
    "- Do not mention claims like handmade, solid wood, marble, papier-mache, papier-mâché, EU plug, UK adapter, delivery time, or certification unless provided by the user or clearly present in the pasted existing description.",
    colorRule,
    materialRule,
    dimensionsRule,
    deliveryRule,
    "Weight and warranty rule: never mention weight or warranty unless manually provided in trusted user information.",
    "Trusted manual information from user:",
    formatManualInfo(formInput),
    "Visual image analysis for general style context only. The color/material observations below are not permission to mention color or material in copy unless manually provided:",
    `- category: ${identity.category}`,
    `- style: ${identity.style}`,
    `- shape: ${identity.shape}`,
    `- proportions: ${identity.proportions}`,
    `- visible color: ${identity.color}`,
    `- visible materials/material look: ${identity.materials}`,
    `- visible hardware: ${identity.visibleHardware}`,
    `- wood grain: ${identity.woodGrain}`,
    `- rounded edges: ${identity.roundedCorners}`,
    `- visible structure: ${identity.visibleStructure}`,
    `- possible room use: ${identity.possibleRoomUse}`,
    `- visible features: ${identity.visibleFeatures.join(", ") || "unknown"}`,
    `- visible detail notes: ${identity.visibleDetailNotes.join(", ") || "unknown"}`,
  ].join("\n");
}

function normalizeCopyPayload(payload: Partial<ProductCopyPayload>) {
  return {
    titleFr: String(payload.titleFr ?? "").trim(),
    descriptionFr: String(payload.descriptionFr ?? "").trim(),
    materialsFeatures: cleanStringArray(payload.materialsFeatures, 12),
  };
}

async function generateWithModel(
  model: string,
  identity: LockedIdentitySummary,
  formInput: CatalogFormInput,
): Promise<ProductCopyPayload> {
  const client = getOpenAIClient();

  const result = await client.responses.create({
    model,
    input: buildCopyPrompt(identity, formInput),
    text: {
      format: {
        type: "json_schema",
        name: "decoriluxe_product_copy",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            titleFr: { type: "string" },
            descriptionFr: { type: "string" },
            materialsFeatures: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["titleFr", "descriptionFr", "materialsFeatures"],
        },
      },
    },
    max_output_tokens: 1800,
  });

  const output =
    "output_text" in result && typeof result.output_text === "string"
      ? result.output_text
      : "";

  if (!output) {
    throw new Error("Product copy generation returned an empty response.");
  }

  return normalizeCopyPayload(
    JSON.parse(extractJsonObject(output)) as Partial<ProductCopyPayload>,
  );
}

async function generateWithFallback(
  identity: LockedIdentitySummary,
  formInput: CatalogFormInput,
) {
  try {
    return await generateWithModel(
      appConfig.openaiAnalysisModel,
      identity,
      formInput,
    );
  } catch (primaryError) {
    if (
      !appConfig.openaiAnalysisFallbackModel ||
      appConfig.openaiAnalysisFallbackModel === appConfig.openaiAnalysisModel
    ) {
      throw primaryError;
    }

    return generateWithModel(
      appConfig.openaiAnalysisFallbackModel,
      identity,
      formInput,
    );
  }
}

export async function generateProductCopy(
  sourceImage: File,
  formInput: CatalogFormInput,
): Promise<ProductCopyResult> {
  const analysis = await analyzeUploadedProductImage(sourceImage, formInput);
  const copy = await generateWithFallback(analysis, formInput);

  return {
    ...copy,
    analysis,
  };
}
