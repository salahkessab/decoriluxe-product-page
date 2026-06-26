import { GenerationQuality, GenerationSize, GenerationStyle } from "@/lib/types";

type SharedGenerationInput = {
  sourceImageUrl: string;
  prompt: string;
  style: GenerationStyle;
};

type SupportedFalImageModel =
  | "fal-ai/flux-pro/kontext"
  | "openai/gpt-image-2/edit";

const modelSerializers: Record<
  SupportedFalImageModel,
  (input: SharedGenerationInput) => Record<string, unknown>
> = {
  "fal-ai/flux-pro/kontext": ({ sourceImageUrl, prompt }) => ({
    prompt,
    image_url: sourceImageUrl,
    output_format: "png",
    guidance_scale: 4,
    num_images: 1,
  }),
  "openai/gpt-image-2/edit": ({ sourceImageUrl, prompt, style }) => {
    const settings = getGenerationSettings(style);

    return {
      prompt,
      image_urls: [sourceImageUrl],
      output_format: "png",
      size: settings.size,
      quality: settings.quality,
    };
  },
};

export function getGenerationSettings(style: GenerationStyle): {
  size: GenerationSize;
  quality: GenerationQuality;
} {
  void style;

  return {
    size: "1080x1350",
    quality: "medium",
  };
}

export function serializeFalGenerationInput(
  modelId: string,
  input: SharedGenerationInput,
) {
  const serializer =
    modelSerializers[modelId as SupportedFalImageModel] ??
    modelSerializers["openai/gpt-image-2/edit"];

  return serializer(input);
}
