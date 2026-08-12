import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPT_DIR = path.resolve(
  __dirname,
  "../prompts",
);

const cache = new Map();

export async function loadPrompt(filename) {
  // Prevent path traversal and accidental loading
  // outside the versioned prompt directory.
  const safeName = path.basename(filename);

  if (safeName !== filename) {
    throw new Error("Invalid prompt filename");
  }

  if (!safeName.endsWith(".txt")) {
    throw new Error("Prompt files must use .txt");
  }

  if (cache.has(safeName)) {
    return cache.get(safeName);
  }

  const filePath = path.join(
    PROMPT_DIR,
    safeName,
  );

  const prompt = await fs.readFile(
    filePath,
    "utf8",
  );

  if (!prompt.trim()) {
    throw new Error(
      `Prompt file is empty: ${safeName}`,
    );
  }

  cache.set(safeName, prompt);

  return prompt;
}

export function clearPromptCache() {
  cache.clear();
}