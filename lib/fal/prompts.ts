import {
  CatalogFormInput,
  GenerationStyle,
  LockedIdentitySummary,
} from "@/lib/types";

function formatList(items: string[], fallback: string) {
  if (items.length === 0) {
    return fallback;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function getSceneRouting(identity: LockedIdentitySummary) {
  const category = identity.category.toLowerCase();

  if (category.includes("nightstand") || category.includes("bedside")) {
    return "Route the scene to a calm luxury bedroom with bed, soft textiles, warm lamps, and refined bedside styling.";
  }

  if (category.includes("side table") || category.includes("end table")) {
    return "Route the scene to either a bedroom or living room, choosing the setting that best fits the product scale and style.";
  }

  if (category.includes("console")) {
    return "Route the scene to an entryway or living room with tasteful wall art, sculptural decor, and premium architectural details.";
  }

  if (
    category.includes("buffet") ||
    category.includes("cabinet") ||
    category.includes("sideboard")
  ) {
    return "Route the scene to a living room or dining room with elegant storage styling, ceramics, art, and warm ambient light.";
  }

  return "Route the scene to the most appropriate luxury furniture interior based on the product category, scale, and visible function.";
}

function getFullProductFramingPolicy(
  style: GenerationStyle,
  identity: LockedIdentitySummary,
) {
  const searchableIdentity = [
    identity.category,
    identity.style,
    identity.shape,
    identity.proportions,
    identity.visibleStructure,
    ...identity.visibleFeatures,
    ...identity.visibleDetailNotes,
  ]
    .join(" ")
    .toLowerCase();
  const isTallProduct = [
    "table lamp",
    "floor lamp",
    "lamp",
    "vase",
    "mirror",
    "shelf",
    "bookcase",
    "etagere",
    "étagère",
  ].some((keyword) => searchableIdentity.includes(keyword));

  if (style === "material-close-up") {
    return [
      "Framing policy:",
      "This is the only style allowed to crop into product details.",
      "Even when using close-up crops, include one smaller full-product reference view so the selling item remains identifiable.",
      "Do not use the close-up crop as the only representation of the product.",
    ].join("\n");
  }

  return [
    "Framing policy:",
    "The full product must be visible from top to bottom.",
    "Do not crop the product, top, shade, base, legs, handles, drawers, hardware, edges, or any important visible part of the selling item.",
    "Show the entire item with comfortable safe margins around the object.",
    "Center the product properly and preserve the full silhouette.",
    "Do not zoom in too tightly. The product must remain the hero object and fully readable.",
    "For white background, lifestyle scene, and premium catalog hero shot, the main product view must show the complete product.",
    isTallProduct
      ? "Tall or vertical object rule: show the full item from top to bottom with comfortable margins. Do not crop any part of the product. Keep the entire silhouette visible inside the 4:5 canvas."
      : "If the product is a tall or vertical object, show the full item from top to bottom with comfortable margins. Do not crop any part of the product. Keep the entire silhouette visible.",
  ].join("\n");
}

function getStyleInstructions(
  style: GenerationStyle,
  identity: LockedIdentitySummary,
) {
  const sceneRouting = getSceneRouting(identity);

  const instructions: Record<GenerationStyle, string[]> = {
    "white-background": [
      "Style: White background product photo.",
      "Create a clean e-commerce product photo on a pure white background. Show the entire product fully visible from top to bottom with comfortable margins on all sides. Do not crop the object. Preserve the full silhouette and keep the product centered in the frame.",
      "Use full-product e-commerce framing, not a detail crop, close-up crop, macro crop, or dramatic tight composition.",
      "Center the product vertically and horizontally. Leave comfortable white space above, below, left, and right of the full object.",
      "If the product is tall or vertical, such as a lamp, vase, mirror, shelf, or floor lamp, automatically zoom out enough so the full object fits naturally inside the 4:5 canvas.",
      "Never prioritize close framing over full visibility for this style. Full product visibility is more important than dramatic composition.",
      "Use soft luxury studio lighting, a subtle grounded shadow, clean edges, and realistic material rendering.",
      "Do not create a collage, room scene, decorative props, panel layout, text, logos, or labels.",
    ],
    "lifestyle-room": [
      "Style: Lifestyle room scene.",
      sceneRouting,
      "Create a real luxury interior scene with the exact product naturally placed and clearly visible as the hero.",
      "Frame the complete product in the room. Keep the entire selling item visible with comfortable margins.",
      "Merge decor styling into this scene: use premium but restrained props such as ceramics, books, lamps, art, textiles, plants, or trays when appropriate.",
      "Use warm natural light, realistic floor contact shadows, refined beige/white/wood tones, and a luxury furniture brand mood.",
      "Do not turn this into a collage, catalog board, isolated product shot, text layout, or advertisement with copy.",
    ],
    "premium-catalog": [
      "Style: Premium catalog layout.",
      "Create a refined 4:5 luxury furniture catalog composition with a strong hero product area plus 2 to 4 distinct detail panels derived from visible product features.",
      "Use a clean editorial layout with balanced spacing, safe margins, subtle icons, short French feature labels, and a neutral beige/white luxury palette.",
      "Keep all text and icons inside generous safe margins. Do not place text close to canvas edges, panel edges, or crop boundaries. Do not crop titles, labels, icons, or callouts.",
      "Show the hero product clearly with more breathing room. Do not zoom too tightly. The main hero product must be fully visible from top to bottom, visually balanced, and not crowded by panels or decor.",
      "Make each detail panel highlight a different visible feature. Avoid repetitive crops or duplicate panel subjects.",
      "Useful panel ideas when grounded in the visible product: surface material, wood grain, visible hardware, handles, drawer front, legs, rounded edges, base shape, finish texture, construction detail.",
      "Keep decor minimal and secondary. Accessories must never dominate, hide, or compete with the product.",
      "Show the product on a clean white or warm-white background with editorial grid alignment, premium negative space, and clear visual hierarchy.",
      "Do not invent new true product angles from one uploaded image. Use visible close-up crops and faithful layout framing.",
      "If callouts are included, keep them minimal, premium, and grounded in visible product details only.",
    ],
    "material-close-up": [
      "Style: Material close-up.",
      "Create a refined material study board focused on close-up views of visible materials, finishes, edges, hardware, drawer fronts, legs, handles, grain, texture, and rounded details.",
      "At least 70 percent of the canvas should be close-up or macro material/detail views.",
      "Include one smaller whole-product reference view only to keep the selling item identifiable.",
      "Use premium lighting and realistic texture fidelity. Make the details feel tactile and expensive.",
      "Do not make this a lifestyle room scene, hero advertisement, or text-heavy feature graphic. Avoid readable text unless it is absolutely necessary.",
    ],
  };

  return instructions[style].join("\n");
}

function getTextPolicy(formInput: CatalogFormInput) {
  const languageName =
    formInput.language === "en"
      ? "English"
      : formInput.language === "es"
        ? "Spanish"
        : "French";

  if (formInput.style !== "premium-catalog") {
    return [
      "On-image text policy:",
      "This selected style does not need text. Do not add readable words, labels, headings, captions, numbers, dimensions, logos, watermarks, or badges.",
      "Use styling, lighting, composition, props, and close crops instead of written explanations.",
    ].join("\n");
  }

  return [
    "On-image text policy for premium catalog layout:",
    `If any text is rendered inside the image, write it in ${languageName}. French is the default unless the user selected another language.`,
    "Use short, correct, natural, premium furniture catalog wording.",
    "Prefer very short labels and callouts only when they improve the catalog layout.",
    "Keep text safely inset from all image edges and panel edges. Leave enough padding around every label so no text is cropped.",
    "Preferred French label examples for visible details: Plateau en marbre naturel, Base cylindrique cannelee, Bords arrondis et finition lisse, Materiaux de qualite, Design moderne, Finitions premium.",
    "Do not add unnecessary text. Do not add long paragraphs. Do not mix languages. Do not create gibberish text.",
    "Do not show dimensions unless the user provided real dimensions, and never invent dimensions.",
    "Do not add fake logos, brand names, watermarks, badges, technical specifications, SKU codes, ratings, or sale labels.",
    formInput.language === "fr"
      ? "Good French label examples: Table de chevet, Design moderne, Finitions premium, Matériaux de qualité, Rangement pratique, Angles arrondis, Glissières fluides, Pieds robustes, Entretien facile."
      : "If using the selected non-French language, keep labels equally short, clean, and premium.",
  ].join("\n");
}

function getMasterPreservationPrompt(identity: LockedIdentitySummary) {
  return [
    "Master product preservation rules used for every generation:",
    "The uploaded product is the real selling item and must remain visually consistent.",
    "Preserve exact product shape, proportions, structure, drawers, handles, legs, visible hardware, materials, colors, wood grain, rounded edges, and visible construction.",
    "Do not redesign the product, simplify it, stylize it into another object, change drawer count, change handle style, change leg style, change visible hardware, change materials, change color, or alter proportions.",
    "If the source image is a phone screenshot or app screenshot, do not reproduce phone UI, app controls, black bars, text overlays, navigation icons, screenshot borders, or screen artifacts. Use only the actual product as the visual reference.",
    "Do not invent dimensions, technical specifications, logos, brand marks, watermarks, badges, numbers, or fake branding.",
    "Locked product identity summary:",
    `- category: ${identity.category}`,
    `- style: ${identity.style}`,
    `- shape: ${identity.shape}`,
    `- proportions: ${identity.proportions}`,
    `- color: ${identity.color}`,
    `- materials: ${identity.materials}`,
    `- drawer count: ${identity.drawerCount}`,
    `- handles: ${identity.handleStyle}`,
    `- legs: ${identity.legStyle}`,
    `- visible hardware: ${identity.visibleHardware}`,
    `- wood grain: ${identity.woodGrain}`,
    `- rounded edges: ${identity.roundedCorners}`,
    `- visible structure: ${identity.visibleStructure}`,
    `- possible room use: ${identity.possibleRoomUse}`,
    "Visible product features:",
    formatList(identity.visibleFeatures, "- unknown"),
    "Visible detail notes:",
    formatList(identity.visibleDetailNotes, "- unknown"),
  ].join("\n");
}

export function buildProductAnalysisPrompt(formInput: CatalogFormInput) {
  const dimensionsRule = formInput.dimensions
    ? `The user provided real dimensions for internal reference only: ${formInput.dimensions}. Do not invent or change dimensions.`
    : "The user did not provide dimensions. Do not include or invent dimensions.";

  return [
    "Analyze this furniture product image once and create a locked identity summary for future image generations.",
    "Use the model only for product understanding and identity extraction.",
    "Return strict JSON only, with no markdown and no prose outside JSON.",
    "Describe only visible facts from the uploaded image.",
    "If the upload is a phone screenshot or social/app screenshot, ignore interface chrome, black bars, text overlays, icons, navigation bars, and screen controls. Analyze only the actual product.",
    "Never invent dimensions, technical specifications, brand marks, hidden materials, unseen angles, or unverified product details.",
    "Identify the likely product category, such as nightstand, side table, console, buffet, cabinet, sideboard, table, chair, table lamp, floor lamp, vase, mirror, shelf, bookcase, or unknown.",
    "For table lamp, floor lamp, vase, mirror, shelf, or bookcase products, explicitly identify that vertical/tall product category when visible.",
    "Capture the product style, color, materials, visible hardware, wood grain, rounded edges, drawers, handles, legs, visible features, and possible room use.",
    dimensionsRule,
    formInput.productName
      ? `Optional product name from the user: ${formInput.productName}`
      : "No product name was provided.",
    "Optional real feature bullets from the user:",
    formatList(
      formInput.features,
      "- No extra feature bullets were provided. Only use grounded visible product details.",
    ),
    "Use this exact JSON schema:",
    "{",
    '  "category": "string",',
    '  "style": "string",',
    '  "shape": "string",',
    '  "proportions": "string",',
    '  "color": "string",',
    '  "materials": "string",',
    '  "drawerCount": "string",',
    '  "handleStyle": "string",',
    '  "legStyle": "string",',
    '  "visibleHardware": "string",',
    '  "woodGrain": "string",',
    '  "roundedCorners": "string",',
    '  "visibleStructure": "string",',
    '  "possibleRoomUse": "string",',
    '  "visibleFeatures": ["string"],',
    '  "visibleDetailNotes": ["string"],',
    '  "sourceImageCount": 1',
    "}",
    "sourceImageCount must be 1.",
    "If something is unclear, say unknown instead of guessing.",
  ].join("\n");
}

export function buildCatalogGenerationPrompt(
  identity: LockedIdentitySummary,
  formInput: CatalogFormInput,
) {
  const dimensionsBlock = formInput.dimensions
    ? `Dimensions are internal context only: ${formInput.dimensions}. Do not render dimensions as visible text.`
    : "No real dimensions were provided. Do not show or invent dimensions.";

  return [
    "Create one high-quality 4:5 luxury furniture brand image for Shopify product content.",
    getStyleInstructions(formInput.style, identity),
    getFullProductFramingPolicy(formInput.style, identity),
    getMasterPreservationPrompt(identity),
    getTextPolicy(formInput),
    dimensionsBlock,
    "Output quality direction:",
    "Make the image feel expensive, realistic, editorial, and suitable for a premium furniture brand.",
    "Use realistic shadows, believable lighting, high material fidelity, and clean composition.",
    "Keep product fidelity stricter than styling creativity.",
    `Selected style id: ${formInput.style}. Make this output clearly match that style and not any other style.`,
  ].join("\n");
}
