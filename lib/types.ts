export type CatalogFormInput = {
  productName: string;
  material: string;
  dimensions: string;
  color: string;
  deliveryInfo: string;
  existingDescription: string;
  language: string;
  features: string[];
  style: GenerationStyle;
};

export type GenerationStyle =
  | "white-background"
  | "lifestyle-room"
  | "premium-catalog"
  | "material-close-up";

export type LockedIdentitySummary = {
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

export type GenerationResult = {
  imageUrl: string;
  modelUsed: string;
  analysis: LockedIdentitySummary;
  style: GenerationStyle;
  size: GenerationSize;
  quality: GenerationQuality;
};

export type GenerationSize = "1080x1350";

export type GenerationQuality = "medium";

export type ProductCopyResult = {
  titleFr: string;
  descriptionFr: string;
  materialsFeatures: string[];
  analysis: LockedIdentitySummary;
};
