import { createHash } from "crypto";
import { appConfig } from "@/lib/config";
import { getFalClient } from "@/lib/fal/client";
import {
  buildCatalogGenerationPrompt,
  buildProductAnalysisPrompt,
} from "@/lib/fal/prompts";
import {
  getGenerationSettings,
  serializeFalGenerationInput,
} from "@/lib/fal/model-adapter";
import { convertGeneratedImageToWebP } from "@/lib/image-export";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  CatalogFormInput,
  GenerationResult,
  GenerationStyle,
  LockedIdentitySummary,
} from "@/lib/types";

type PromptBuildResult = {
  identity?: Partial<LockedIdentitySummary>;
} & Partial<LockedIdentitySummary>;

const analysisCache = new Map<string, Promise<LockedIdentitySummary>>();

function fileBufferToDataUrl(file: File, buffer: Buffer) {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function getImageCacheKey(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function extractJsonObject(rawOutput: string) {
  const trimmed = rawOutput.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fencedContent = fencedMatch[1].trim();
    if (fencedContent.startsWith("{") && fencedContent.endsWith("}")) {
      return fencedContent;
    }
  }

  const firstBraceIndex = trimmed.indexOf("{");
  const lastBraceIndex = trimmed.lastIndexOf("}");
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  throw new Error(
    "Vision analysis did not return valid JSON. Please try again with a clearer product image.",
  );
}

function normalizeIdentity(
  identity: Partial<LockedIdentitySummary> | undefined,
): LockedIdentitySummary {
  const parsed = identity ?? {};

  return {
    category: parsed.category?.trim() || "unknown",
    style: parsed.style?.trim() || "unknown",
    shape: parsed.shape?.trim() || "unknown",
    proportions: parsed.proportions?.trim() || "unknown",
    color: parsed.color?.trim() || "unknown",
    materials: parsed.materials?.trim() || "unknown",
    drawerCount: parsed.drawerCount?.trim() || "unknown",
    handleStyle: parsed.handleStyle?.trim() || "unknown",
    legStyle: parsed.legStyle?.trim() || "unknown",
    visibleHardware: parsed.visibleHardware?.trim() || "unknown",
    woodGrain: parsed.woodGrain?.trim() || "unknown",
    roundedCorners: parsed.roundedCorners?.trim() || "unknown",
    visibleStructure: parsed.visibleStructure?.trim() || "unknown",
    possibleRoomUse: parsed.possibleRoomUse?.trim() || "unknown",
    visibleFeatures: Array.isArray(parsed.visibleFeatures)
      ? parsed.visibleFeatures
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    visibleDetailNotes: Array.isArray(parsed.visibleDetailNotes)
      ? parsed.visibleDetailNotes
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [],
    sourceImageCount: 1,
  };
}

function parsePromptBuildOutput(output: string) {
  const parsed = JSON.parse(extractJsonObject(output)) as PromptBuildResult;
  return normalizeIdentity(parsed.identity ?? parsed);
}

function extractImageUrl(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "images" in payload &&
    Array.isArray((payload as { images?: Array<{ url?: string }> }).images)
  ) {
    return (
      (payload as { images?: Array<{ url?: string }> }).images?.[0]?.url ?? ""
    );
  }

  return "";
}

function parseCropValidation(output: string) {
  const parsed = JSON.parse(extractJsonObject(output)) as {
    cropped?: unknown;
    reason?: unknown;
  };

  return {
    cropped: parsed.cropped === true,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

function requiresWhiteBackgroundFramingValidation(style: GenerationStyle) {
  return (
    style === "white-background" || style === "white-background-alt-angle"
  );
}

async function analyzeProductImageAndBuildPrompt(
  sourceImageDataUrl: string,
  formInput: CatalogFormInput,
  model: string,
) {
  const client = getOpenAIClient();

  const result = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildProductAnalysisPrompt(formInput),
          },
          {
            type: "input_image",
            image_url: sourceImageDataUrl,
            detail: "low",
          },
        ],
      },
    ],
    max_output_tokens: 1400,
  });

  const output =
    "output_text" in result && typeof result.output_text === "string"
      ? result.output_text
      : "";

  if (!output) {
    throw new Error("gpt-5-mini returned an empty product analysis response.");
  }

  return parsePromptBuildOutput(output);
}

async function analyzeProductImageAndBuildPromptWithFallback(
  sourceImageDataUrl: string,
  formInput: CatalogFormInput,
) {
  try {
    return await analyzeProductImageAndBuildPrompt(
      sourceImageDataUrl,
      formInput,
      appConfig.openaiAnalysisModel,
    );
  } catch (primaryError) {
    if (
      !appConfig.openaiAnalysisFallbackModel ||
      appConfig.openaiAnalysisFallbackModel === appConfig.openaiAnalysisModel
    ) {
      throw primaryError;
    }

    return analyzeProductImageAndBuildPrompt(
      sourceImageDataUrl,
      formInput,
      appConfig.openaiAnalysisFallbackModel,
    );
  }
}

async function validateWhiteBackgroundFramingWithModel(
  sourceImageUrl: string,
  generatedImageUrl: string,
  model: string,
) {
  const client = getOpenAIClient();

  const result = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Compare the source product reference image with the generated white-background product photo.",
              "The generated image is valid only if the selling product is fully visible from top to bottom and left to right.",
              "Mark cropped true if any important part of the product is cut off at the top, bottom, left, or right edge.",
              "For lamps, mark cropped true if the shade top, stem, body, base, cord, or any visible important lamp part is cut off.",
              "Ignore harmless whitespace. Focus on whether the full product silhouette is visible.",
              "Return strict JSON only: {\"cropped\": boolean, \"reason\": \"short reason\"}.",
            ].join("\n"),
          },
          {
            type: "input_image",
            image_url: sourceImageUrl,
            detail: "low",
          },
          {
            type: "input_image",
            image_url: generatedImageUrl,
            detail: "low",
          },
        ],
      },
    ],
    max_output_tokens: 300,
  });

  const output =
    "output_text" in result && typeof result.output_text === "string"
      ? result.output_text
      : "";

  if (!output) {
    return { cropped: false, reason: "" };
  }

  return parseCropValidation(output);
}

async function validateWhiteBackgroundFraming(
  sourceImageUrl: string,
  generatedImageUrl: string,
) {
  try {
    return await validateWhiteBackgroundFramingWithModel(
      sourceImageUrl,
      generatedImageUrl,
      appConfig.openaiAnalysisModel,
    );
  } catch (primaryError) {
    if (
      !appConfig.openaiAnalysisFallbackModel ||
      appConfig.openaiAnalysisFallbackModel === appConfig.openaiAnalysisModel
    ) {
      throw primaryError;
    }

    return validateWhiteBackgroundFramingWithModel(
      sourceImageUrl,
      generatedImageUrl,
      appConfig.openaiAnalysisFallbackModel,
    );
  }
}

async function getCachedAnalysis(
  cacheKey: string,
  sourceImageDataUrl: string,
  formInput: CatalogFormInput,
) {
  const cachedAnalysis = analysisCache.get(cacheKey);

  if (cachedAnalysis) {
    return cachedAnalysis;
  }

  const analysisPromise = analyzeProductImageAndBuildPromptWithFallback(
    sourceImageDataUrl,
    formInput,
  );
  analysisCache.set(cacheKey, analysisPromise);

  try {
    return await analysisPromise;
  } catch (error) {
    analysisCache.delete(cacheKey);
    throw error;
  }
}

async function generateWithModel(
  modelId: string,
  sourceImageUrl: string,
  prompt: string,
  formInput: CatalogFormInput,
) {
  const client = getFalClient();

  const result = await client.subscribe(modelId, {
    input: serializeFalGenerationInput(modelId, {
      sourceImageUrl,
      prompt,
      style: formInput.style,
    }),
  });

  const imageUrl = extractImageUrl(result.data);
  if (!imageUrl) {
    throw new Error(`Generation model ${modelId} did not return an image URL.`);
  }

  return {
    imageUrl,
    modelUsed: modelId,
  };
}

async function generateWithFramingRetry(
  modelId: string,
  sourceImageUrl: string,
  prompt: string,
  formInput: CatalogFormInput,
) {
  const generated = await generateWithModel(
    modelId,
    sourceImageUrl,
    prompt,
    formInput,
  );

  if (!requiresWhiteBackgroundFramingValidation(formInput.style)) {
    return generated;
  }

  let validation: { cropped: boolean; reason: string };

  try {
    validation = await validateWhiteBackgroundFraming(
      sourceImageUrl,
      generated.imageUrl,
    );
  } catch {
    return generated;
  }

  if (!validation.cropped) {
    return generated;
  }

  return generateWithModel(
    modelId,
    sourceImageUrl,
    [
      prompt,
      "Retry: show the complete product fully visible with extra safe margins. Do not crop any part of the item.",
      "For white background product styles, full product visibility is mandatory and more important than dramatic composition.",
    ].join("\n"),
    formInput,
  );
}

export async function analyzeUploadedProductImage(
  sourceImage: File,
  formInput: CatalogFormInput,
) {
  const sourceImageBuffer = Buffer.from(await sourceImage.arrayBuffer());
  const sourceImageDataUrl = fileBufferToDataUrl(sourceImage, sourceImageBuffer);
  const analysisCacheKey = getImageCacheKey(sourceImageBuffer);

  return getCachedAnalysis(analysisCacheKey, sourceImageDataUrl, formInput);
}

export async function generateCatalogComposition(
  sourceImage: File,
  formInput: CatalogFormInput,
): Promise<GenerationResult> {
  const client = getFalClient();
  const sourceImageUrl = await client.storage.upload(sourceImage);
  const analysis = await analyzeUploadedProductImage(sourceImage, formInput);
  const prompt = buildCatalogGenerationPrompt(analysis, formInput);
  const generationSettings = getGenerationSettings(formInput.style);

  try {
    const generated = await generateWithFramingRetry(
      appConfig.imageModel,
      sourceImageUrl,
      prompt,
      formInput,
    );
    const exported = await convertGeneratedImageToWebP(
      generated.imageUrl,
      formInput.style,
    );

    return {
      ...generated,
      imageUrl: exported.imageUrl,
      analysis,
      style: formInput.style,
      ...generationSettings,
    };
  } catch (primaryError) {
    if (!appConfig.fallbackImageModel) {
      throw primaryError;
    }

    const fallbackGenerated = await generateWithFramingRetry(
      appConfig.fallbackImageModel,
      sourceImageUrl,
      prompt,
      formInput,
    );
    const exported = await convertGeneratedImageToWebP(
      fallbackGenerated.imageUrl,
      formInput.style,
    );

    return {
      ...fallbackGenerated,
      imageUrl: exported.imageUrl,
      analysis,
      style: formInput.style,
      ...generationSettings,
    };
  }
}
