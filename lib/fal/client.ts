import { fal } from "@fal-ai/client";
import { appConfig } from "@/lib/config";

let configured = false;

export function getFalClient() {
  if (!appConfig.falKey) {
    throw new Error("Missing FAL_KEY environment variable.");
  }

  if (!configured) {
    fal.config({
      credentials: appConfig.falKey,
    });
    configured = true;
  }

  return fal;
}
