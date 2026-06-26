const defaultOpenAIAnalysisModel = "gpt-5-mini";
const defaultOpenAIAnalysisFallbackModel = "gpt-4.1-mini";
const defaultImageModel = "openai/gpt-image-2/edit";
const defaultFallbackImageModel = "fal-ai/flux-pro/kontext";
const defaultMaxUploadSizeMb = 10;

export const appConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiAnalysisModel:
    process.env.OPENAI_ANALYSIS_MODEL ?? defaultOpenAIAnalysisModel,
  openaiAnalysisFallbackModel:
    process.env.OPENAI_ANALYSIS_FALLBACK_MODEL ??
    defaultOpenAIAnalysisFallbackModel,
  falKey: process.env.FAL_KEY ?? "",
  imageModel: process.env.FAL_IMAGE_MODEL ?? defaultImageModel,
  fallbackImageModel:
    process.env.FAL_IMAGE_FALLBACK_MODEL ?? defaultFallbackImageModel,
  maxUploadSizeBytes:
    Number(process.env.MAX_UPLOAD_SIZE_MB ?? defaultMaxUploadSizeMb) * 1024 * 1024,
};

export const supportedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
