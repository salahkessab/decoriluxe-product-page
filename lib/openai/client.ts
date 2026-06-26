import OpenAI from "openai";
import { appConfig } from "@/lib/config";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!appConfig.openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  client ??= new OpenAI({
    apiKey: appConfig.openaiApiKey,
  });

  return client;
}
