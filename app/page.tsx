"use client";

import Image from "next/image";
import {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GenerationStyle =
  | "white-background"
  | "white-background-alt-angle"
  | "lifestyle-room"
  | "premium-catalog"
  | "material-close-up";

type AnalysisSummary = {
  category: string;
  style: string;
  shape: string;
  proportions: string;
  color: string;
  materials: string;
  drawerCount: string;
  handleStyle: string;
  legStyle: string;
  visibleHardware: string;
  woodGrain: string;
  roundedCorners: string;
  visibleStructure: string;
  possibleRoomUse: string;
  visibleFeatures: string[];
  visibleDetailNotes: string[];
  sourceImageCount: number;
};

type GenerationResponse = {
  imageUrl: string;
  modelUsed: string;
  style: GenerationStyle;
  analysis: AnalysisSummary;
};

type ProductCopyResponse = {
  titleFr: string;
  descriptionFr: string;
  materialsFeatures: string[];
  analysis: AnalysisSummary;
};

type StyleOption = {
  id: GenerationStyle;
  title: string;
  description: string;
};

type ZoomPreview = {
  imageUrl: string;
  title: string;
  x: number;
  y: number;
};

const featureInputCount = 5;
const initialFeatures = Array.from({ length: featureInputCount }, () => "");

const styleOptions: StyleOption[] = [
  {
    id: "white-background",
    title: "White background product photo",
    description: "Clean marketplace-ready product image.",
  },
  {
    id: "white-background-alt-angle",
    title: "White background alternate angle",
    description: "Subtle 3/4 product view on pure white.",
  },
  {
    id: "lifestyle-room",
    title: "Lifestyle room scene",
    description: "Routed luxury room scene with decor styling.",
  },
  {
    id: "premium-catalog",
    title: "Premium catalog layout",
    description: "Hero product, detail panels, short French callouts.",
  },
  {
    id: "material-close-up",
    title: "Material close-up",
    description: "Detail-focused finish and texture visual.",
  },
];

function getStyleTitle(style: GenerationStyle) {
  return (
    styleOptions.find((option) => option.id === style)?.title ??
    "Generated image"
  );
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const workspaceVersionRef = useRef(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [material, setMaterial] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [productColor, setProductColor] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState("");
  const [existingDescription, setExistingDescription] = useState("");
  const [language, setLanguage] = useState("fr");
  const [features, setFeatures] = useState<string[]>(initialFeatures);
  const [selectedStyles, setSelectedStyles] = useState<GenerationStyle[]>([]);
  const [batchStyles, setBatchStyles] = useState<GenerationStyle[]>([]);
  const [results, setResults] = useState<Partial<Record<GenerationStyle, GenerationResponse>>>({});
  const [styleErrors, setStyleErrors] = useState<Partial<Record<GenerationStyle, string>>>({});
  const [error, setError] = useState("");
  const [generatingStyles, setGeneratingStyles] = useState<GenerationStyle[]>([]);
  const [downloadingStyle, setDownloadingStyle] = useState<GenerationStyle | null>(null);
  const [copyResult, setCopyResult] =
    useState<ProductCopyResponse | null>(null);
  const [copyError, setCopyError] = useState("");
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [zoomPreview, setZoomPreview] = useState<ZoomPreview | null>(null);

  const isGenerating = generatingStyles.length > 0;
  const hasResults = Object.keys(results).length > 0;
  const displayedResultStyles = batchStyles;
  const generatedStyleCount = Object.keys(results).length;
  const failedStyleCount = Object.keys(styleErrors).length;
  const requestedStyleCount = batchStyles.length;
  const finishedStyleCount = generatedStyleCount + failedStyleCount;
  const activeStyleNames = generatingStyles.map(getStyleTitle).join(", ");

  const uploadPreviewUrl = useMemo(() => {
    if (!imageFile) {
      return "";
    }

    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
      }
    };
  }, [uploadPreviewUrl]);

  useEffect(() => {
    if (!isGenerating || batchStyles.length === 0) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(scrollTimer);
  }, [batchStyles.length, isGenerating]);

  function updateFeature(index: number, value: string) {
    setFeatures((current) =>
      current.map((feature, currentIndex) =>
        currentIndex === index ? value : feature,
      ),
    );
  }

  function resetProductWorkspace(nextFile: File | null = null) {
    workspaceVersionRef.current += 1;
    setImageFile(nextFile);
    setBatchStyles([]);
    setResults({});
    setStyleErrors({});
    setSelectedStyles([]);
    setGeneratingStyles([]);
    setDownloadingStyle(null);
    setCopyResult(null);
    setCopyError("");
    setCopyMessage("");
    setIsGeneratingCopy(false);
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    resetProductWorkspace(event.target.files?.[0] ?? null);
  }

  function removeUploadedImage() {
    resetProductWorkspace(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function toggleStyle(style: GenerationStyle) {
    setSelectedStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style],
    );
  }

  function createBaseFormData() {
    if (!imageFile) {
      throw new Error("Please upload one product image first.");
    }

    const normalizedFeatures = features
      .map((feature) => feature.trim())
      .filter(Boolean)
      .slice(0, featureInputCount);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("productName", productName.trim());
    formData.append("material", material.trim());
    formData.append("dimensions", dimensions.trim());
    formData.append("color", productColor.trim());
    formData.append("deliveryInfo", deliveryInfo.trim());
    formData.append("existingDescription", existingDescription.trim());
    formData.append("language", language);
    formData.append("features", JSON.stringify(normalizedFeatures));

    return formData;
  }

  function createGenerationFormData(style: GenerationStyle) {
    const formData = createBaseFormData();
    formData.append("style", style);

    return formData;
  }

  async function generateOneStyle(
    style: GenerationStyle,
    workspaceVersion: number,
  ) {
    const response = await fetch("/api/generate", {
      method: "POST",
      body: createGenerationFormData(style),
    });

    const payload = (await response.json()) as
      | GenerationResponse
      | { error?: string };

    if (!response.ok || !("imageUrl" in payload)) {
      const failureMessage =
        "error" in payload ? payload.error : "Generation failed.";
      throw new Error(failureMessage ?? "Generation failed.");
    }

    if (workspaceVersion !== workspaceVersionRef.current) {
      return;
    }

    setResults((current) => ({
      ...current,
      [style]: payload,
    }));
  }

  async function generateSelectedStyles() {
    setError("");
    setStyleErrors({});

    if (!imageFile) {
      setError("Please upload one product image before generating.");
      return;
    }

    if (selectedStyles.length === 0) {
      setError("Please select at least one image style.");
      return;
    }

    const nextBatchStyles = [...selectedStyles];
    const queue = [...nextBatchStyles];
    const concurrency = 2;
    const workspaceVersion = workspaceVersionRef.current;
    setBatchStyles(nextBatchStyles);
    setResults({});
    setStyleErrors({});
    setGeneratingStyles(queue);

    async function worker() {
      while (queue.length > 0) {
        const style = queue.shift();

        if (!style) {
          return;
        }

        try {
          await generateOneStyle(style, workspaceVersion);
        } catch (submissionError) {
          if (workspaceVersion !== workspaceVersionRef.current) {
            return;
          }

          const message =
            submissionError instanceof Error
              ? submissionError.message
              : "Generation failed.";

          setStyleErrors((current) => ({
            ...current,
            [style]: message,
          }));
        } finally {
          if (workspaceVersion === workspaceVersionRef.current) {
            setGeneratingStyles((current) =>
              current.filter((item) => item !== style),
            );
          }
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, selectedStyles.length) }, () =>
        worker(),
      ),
    );
  }

  function onGenerateSelectedClick() {
    void generateSelectedStyles();
  }

  function updateZoomPreview(
    event: MouseEvent<HTMLDivElement>,
    result: GenerationResponse,
  ) {
    setZoomPreview({
      imageUrl: result.imageUrl,
      title: getStyleTitle(result.style),
      x: Math.max(16, Math.min(event.clientX + 24, window.innerWidth - 500)),
      y: Math.max(16, Math.min(event.clientY + 24, window.innerHeight - 640)),
    });
  }

  function clearZoomPreview() {
    setZoomPreview(null);
  }

  async function generateProductCopy() {
    setCopyError("");
    setCopyMessage("");

    if (!imageFile) {
      setCopyError("Please upload one product image before generating copy.");
      return;
    }

    setIsGeneratingCopy(true);
    const workspaceVersion = workspaceVersionRef.current;

    try {
      const response = await fetch("/api/copy-generator", {
        method: "POST",
        body: createBaseFormData(),
      });

      const payload = (await response.json()) as
        | ProductCopyResponse
        | { error?: string };

      if (!response.ok || !("titleFr" in payload)) {
        const failureMessage =
          "error" in payload ? payload.error : "Product copy generation failed.";
        throw new Error(failureMessage ?? "Product copy generation failed.");
      }

      if (workspaceVersion !== workspaceVersionRef.current) {
        return;
      }

      setCopyResult(payload);
    } catch (generationError) {
      if (workspaceVersion !== workspaceVersionRef.current) {
        return;
      }

      const message =
        generationError instanceof Error
          ? generationError.message
          : "Product copy generation failed.";
      setCopyError(message);
    } finally {
      if (workspaceVersion === workspaceVersionRef.current) {
        setIsGeneratingCopy(false);
      }
    }
  }

  function onGenerateCopyClick() {
    void generateProductCopy();
  }

  async function copyProductCopyToClipboard() {
    if (!copyResult) {
      return;
    }

    const copyText = [
      copyResult.titleFr,
      "",
      copyResult.descriptionFr,
      "",
      "Matériaux / caractéristiques :",
      ...copyResult.materialsFeatures.map((item) => `- ${item}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(copyText);
      setCopyMessage("Text copied to clipboard.");
    } catch {
      setCopyMessage("Unable to copy. Please select and copy the text manually.");
    }
  }

  async function downloadResult(result: GenerationResponse) {
    if (!result.imageUrl) {
      return;
    }

    setDownloadingStyle(result.style);
    setError("");

    try {
      const response = await fetch(result.imageUrl);
      if (!response.ok) {
        throw new Error("Unable to download the generated image.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `decoriluxe-catalog-${result.style}.webp`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the generated image.";
      setError(message);
    } finally {
      setDownloadingStyle(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_4%,rgba(201,122,61,0.22),transparent_26rem),radial-gradient(circle_at_84%_14%,rgba(111,143,104,0.16),transparent_24rem),linear-gradient(180deg,#1e1915_0%,#120f0d_44%,#0c0908_100%)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-tight text-[var(--foreground)] sm:text-5xl">
            Decoriluxe Catalog Generator
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
            Upload product, choose a style, generate image, download.
          </p>
        </header>

        <section
          className={
            imageFile
              ? "grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]"
              : "mx-auto max-w-[680px]"
          }
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Uploaded Product
              </h2>
              {imageFile ? (
                <span className="truncate text-xs text-[var(--text-muted)]">
                  {imageFile.name}
                </span>
              ) : null}
            </div>

            <label className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-soft)] transition hover:border-[var(--accent)]">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={onFileChange}
                ref={fileInputRef}
                type="file"
              />

              <div
                className={
                  imageFile
                    ? "flex min-h-[360px] items-center justify-center p-3"
                    : "flex min-h-[500px] items-center justify-center p-5"
                }
              >
                {uploadPreviewUrl ? (
                  <div className="relative flex w-full items-center justify-center">
                    <button
                      aria-label="Remove uploaded image"
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[#120f0d]/85 text-lg font-semibold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeUploadedImage();
                      }}
                      type="button"
                    >
                      ×
                    </button>
                    <Image
                      alt="Uploaded product preview"
                      className="max-h-[430px] w-auto object-contain"
                      height={900}
                      src={uploadPreviewUrl}
                      unoptimized
                      width={900}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-lg text-white shadow-[0_10px_24px_rgba(201,122,61,0.28)]">
                      +
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Upload product image
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      PNG, JPG, or WEBP
                    </p>
                  </div>
                )}
              </div>
            </label>

            {error ? (
              <p className="mt-3 rounded-xl border border-[#7f3d2c] bg-[#2a1511] px-3 py-2 text-sm text-[#f0b09b]">
                {error}
              </p>
            ) : null}
          </div>

          {imageFile ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Choose Image Style
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Select one or more styles, then generate them in parallel.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                  {styleOptions.map((option) => {
                    const isSelected = selectedStyles.includes(option.id);
                    const isActive = generatingStyles.includes(option.id);
                    const styleError = styleErrors[option.id];

                    return (
                      <div
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--selected)] shadow-[0_14px_34px_rgba(201,122,61,0.24)]"
                            : "border-[var(--border)] bg-[var(--card-soft)] hover:border-[var(--accent)] hover:bg-[#221b16]"
                        }`}
                        role="button"
                        tabIndex={0}
                        key={option.id}
                        onClick={() => toggleStyle(option.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleStyle(option.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3
                            className={`min-h-[40px] text-sm font-semibold leading-5 ${
                              isSelected
                                ? "text-[var(--selected-text)]"
                                : "text-[var(--foreground)]"
                            }`}
                          >
                            {option.title}
                          </h3>
                          <span
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--card)]"
                            }`}
                          />
                        </div>
                        <p
                          className={`mt-1 min-h-[40px] text-xs leading-5 ${
                            isSelected
                              ? "text-[#5c4b3c]"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {option.description}
                        </p>
                        {isActive ? (
                          <p className="mt-3 rounded-xl bg-[#2a211a] px-3 py-2 text-center text-sm font-semibold text-[var(--text-secondary)]">
                            Generating...
                          </p>
                        ) : styleError ? (
                          <p className="mt-3 rounded-xl border border-[#7f3d2c] bg-[#2a1511] px-3 py-2 text-xs leading-5 text-[#f0b09b]">
                            Failed
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <button
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--button)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(201,122,61,0.22)] transition hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:bg-[#5b4a3a] disabled:shadow-none"
                  disabled={isGenerating || selectedStyles.length === 0}
                  onClick={onGenerateSelectedClick}
                  type="button"
                >
                  {isGenerating
                    ? `Generating ${generatingStyles.length} style${
                        generatingStyles.length === 1 ? "" : "s"
                      }...`
                    : `Generate Selected Styles (${selectedStyles.length})`}
                </button>

                {requestedStyleCount > 0 ? (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[#211914] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {isGenerating
                          ? `Generating images: ${finishedStyleCount}/${requestedStyleCount} finished`
                          : `Generation finished: ${finishedStyleCount}/${requestedStyleCount}`}
                      </p>
                      {isGenerating ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                          Working
                        </span>
                      ) : null}
                    </div>
                    {isGenerating && activeStyleNames ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                        Now generating: {activeStyleNames}
                      </p>
                    ) : null}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#120f0d]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            8,
                            Math.round(
                              (finishedStyleCount / requestedStyleCount) * 100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Product Copy Generator
                    </h2>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
                      Combine visual analysis with trusted manual details to
                      write French Shopify copy. Empty fields are not guessed.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--accent)] bg-[var(--secondary-background)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--button)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[#75685b]"
                    disabled={isGeneratingCopy}
                    onClick={onGenerateCopyClick}
                    type="button"
                  >
                    {isGeneratingCopy
                      ? "Generating..."
                      : "Generate French Product Copy"}
                  </button>
                </div>

                <details className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)]">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      <span>Trusted Product Info</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Source of truth
                      </span>
                    </span>
                  </summary>

                  <div className="grid gap-3 border-t border-[var(--border)] p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Material
                      </span>
                      <input
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                        onChange={(event) => setMaterial(event.target.value)}
                        placeholder="Only if confirmed"
                        value={material}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Color
                      </span>
                      <input
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                        onChange={(event) =>
                          setProductColor(event.target.value)
                        }
                        placeholder="Only if confirmed"
                        value={productColor}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Dimensions
                      </span>
                      <input
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                        onChange={(event) => setDimensions(event.target.value)}
                        placeholder="Only if real"
                        value={dimensions}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Delivery info
                      </span>
                      <input
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                        onChange={(event) =>
                          setDeliveryInfo(event.target.value)
                        }
                        placeholder="Optional"
                        value={deliveryInfo}
                      />
                    </label>

                    <div className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Key features
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {features.map((feature, index) => (
                          <input
                            key={`copy-feature-${index}`}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                            onChange={(event) =>
                              updateFeature(index, event.target.value)
                            }
                            placeholder={`Feature ${index + 1}`}
                            value={feature}
                          />
                        ))}
                      </div>
                    </div>

                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Existing Product Description
                      </span>
                      <textarea
                        className="min-h-32 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                        onChange={(event) =>
                          setExistingDescription(event.target.value)
                        }
                        placeholder="Paste supplier or competitor product description here..."
                        value={existingDescription}
                      />
                    </label>
                  </div>
                </details>

                {copyError ? (
                  <p className="mt-3 rounded-xl border border-[#7f3d2c] bg-[#2a1511] px-3 py-2 text-sm text-[#f0b09b]">
                    {copyError}
                  </p>
                ) : null}

                {copyResult ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Product title in French
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                        {copyResult.titleFr}
                      </h3>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Long product description in French
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--text-secondary)]">
                        {copyResult.descriptionFr}
                      </p>
                    </div>

                    {copyResult.materialsFeatures.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          Materials / features found or provided
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                          {copyResult.materialsFeatures.map((item) => (
                            <li
                              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                              key={item}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
                      <button
                        className="inline-flex items-center justify-center rounded-2xl bg-[var(--button)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,122,61,0.2)] transition hover:bg-[var(--button-hover)]"
                        onClick={copyProductCopyToClipboard}
                        type="button"
                      >
                        Copy Text
                      </button>
                      <p className="text-xs leading-5 text-[var(--text-muted)]">
                        Copies the title, description, and materials/features.
                      </p>
                    </div>

                    {copyMessage ? (
                      <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        {copyMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <details className="rounded-2xl border border-[var(--border)] bg-[rgba(30,25,21,0.74)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)] marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span>Advanced Options</span>
                    <span className="text-xs text-[var(--text-muted)]">Optional</span>
                  </span>
                </summary>

                <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                      Product name
                    </span>
                    <input
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                      onChange={(event) => setProductName(event.target.value)}
                      placeholder="Optional"
                      value={productName}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                      Language
                    </span>
                    <select
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(201,122,61,0.18)]"
                      onChange={(event) => setLanguage(event.target.value)}
                      value={language}
                    >
                      <option value="fr">French</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
              </details>
            </div>
          ) : null}
        </section>

        {isGenerating || hasResults ? (
          <section
            className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] sm:p-5"
            ref={resultsSectionRef}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Generated Results
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Each style exports as a 1080x1350 WebP.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedResultStyles.map((style) => {
                const result = results[style];
                const isActive = generatingStyles.includes(style);
                const styleError = styleErrors[style];

                return (
                  <div
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3.5"
                    key={style}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {getStyleTitle(style)}
                      </h3>
                      {isActive ? (
                        <span className="rounded-full border border-[var(--accent)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          Generating
                        </span>
                      ) : result ? (
                        <span className="rounded-full border border-[var(--accent-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          Ready
                        </span>
                      ) : styleError ? (
                        <span className="rounded-full border border-[#7f3d2c] px-2.5 py-1 text-xs text-[#f0b09b]">
                          Failed
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[#100c0a] shadow-[inset_0_0_0_1px_rgba(247,239,229,0.08)] ${
                        result ? "cursor-zoom-in" : ""
                      }`}
                      onMouseLeave={clearZoomPreview}
                      onMouseMove={(event) => {
                        if (result) {
                          updateZoomPreview(event, result);
                        }
                      }}
                    >
                      {isActive ? (
                        <div className="flex aspect-[4/5] items-center justify-center px-6 text-center">
                          <div>
                            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--button)]" />
                            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                              Generating...
                            </p>
                          </div>
                        </div>
                      ) : result ? (
                        <Image
                          alt={`${getStyleTitle(style)} result`}
                          className="aspect-[4/5] h-auto w-full object-contain"
                          height={1350}
                          src={result.imageUrl}
                          unoptimized
                          width={1080}
                        />
                      ) : styleError ? (
                        <div className="flex aspect-[4/5] items-center justify-center px-6 text-center">
                          <p className="rounded-2xl border border-[#7f3d2c] bg-[#2a1511] px-4 py-3 text-sm leading-6 text-[#f0b09b]">
                            {styleError}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {result ? (
                      <button
                        className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--accent)] bg-[var(--secondary-background)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--button)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[#75685b]"
                        disabled={downloadingStyle === style}
                        onClick={() => downloadResult(result)}
                        type="button"
                      >
                        {downloadingStyle === style
                          ? "Downloading..."
                          : "Download Image"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
      {zoomPreview ? (
        <div
          className="pointer-events-none fixed z-50 hidden w-[470px] overflow-hidden rounded-3xl border border-[var(--accent)] bg-[#100c0a] shadow-[0_24px_70px_rgba(0,0,0,0.55)] lg:block"
          style={{
            left: zoomPreview.x,
            top: zoomPreview.y,
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
            <p className="truncate text-xs font-semibold text-white">
              Zoom preview
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {zoomPreview.title}
            </p>
          </div>
          <div className="aspect-[4/5] bg-white">
            <Image
              alt={`${zoomPreview.title} zoom preview`}
              className="h-full w-full object-contain"
              height={1350}
              src={zoomPreview.imageUrl}
              unoptimized
              width={1080}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

