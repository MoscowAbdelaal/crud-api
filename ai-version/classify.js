import crypto from "node:crypto";
import { loadPrompt } from "./prompt-loader.js";
import { inputSchema, outputSchema } from "./schema.js";
import { getCached, setCached } from "./cache.js";

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 30_000);
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES || 2);

const PROMPT_VERSION = "v1";
const PROMPT_FILE = "classify.v1.txt";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function isRetryableError(error) {
  return (
    error?.name === "AbortError" ||
    error?.code === "ECONNRESET" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNREFUSED"
  );
}

function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model response does not contain JSON");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function validateModelResponse(content) {
  const json = extractJson(content);
  return outputSchema.parse(json);
}

function logUsage(usage = {}, metadata = {}) {
  const promptTokens =
    usage.prompt_tokens ??
    usage.input_tokens ??
    0;

  const completionTokens =
    usage.completion_tokens ??
    usage.output_tokens ??
    0;

  const totalTokens =
    usage.total_tokens ??
    promptTokens + completionTokens;

  const cost =
    usage.cost ??
    usage.total_cost ??
    0;

  console.info(JSON.stringify({
    event: "llm_usage",
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
    ...metadata,
  }));
}

async function requestModel(messages, {
  stream = false,
  onChunk,
} = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL ||
            "http://localhost:3000",
          "X-Title":
            process.env.OPENROUTER_APP_NAME ||
            "Support Classifier",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          max_tokens: 300,
          stream,
          messages,
        }),
      });

      if (!response.ok) {
        const body = await response.text();

        const error = new Error(
          `OpenRouter returned HTTP ${response.status}`,
        );

        error.status = response.status;
        error.body = body;

        if (!isRetryableStatus(response.status)) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_RETRIES) {
          await sleep(250 * 2 ** attempt);
          continue;
        }

        throw error;
      }

      if (stream) {
        return await consumeSSE(response, onChunk);
      }

      const json = await response.json();

      logUsage(json.usage, {
        attempt,
        streaming: false,
      });

      return {
        content:
          json.choices?.[0]?.message?.content || "",
        usage: json.usage,
        model: json.model,
      };
    } catch (error) {
      lastError = error;

      const retryable =
        isRetryableError(error) ||
        !error.status;

      if (retryable && attempt < MAX_RETRIES) {
        await sleep(250 * 2 ** attempt);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

async function consumeSSE(response, onChunk) {
  if (!response.body) {
    throw new Error("OpenRouter returned an empty body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let content = "";
  let usage = null;
  let model = null;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();

      if (payload === "[DONE]") {
        continue;
      }

      let event;

      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      model = event.model || model;

      const delta =
        event.choices?.[0]?.delta?.content || "";

      if (delta) {
        content += delta;
        onChunk?.(delta);
      }

      if (event.usage) {
        usage = event.usage;
      }
    }
  }

  logUsage(usage, {
    streaming: true,
  });

  return {
    content,
    usage,
    model,
  };
}

async function repairResponse(text, invalidOutput) {
  const prompt = `
The previous classification response was invalid.

Return ONLY a valid JSON object matching this schema:

{
  "category": "billing|bug|feature|other",
  "urgency": "low|normal|high",
  "confidence": 0.0,
  "reason": "string"
}

Do not use Markdown or code fences.

Support message:
${text}

Invalid response:
${invalidOutput}
`;

  return requestModel([
    {
      role: "system",
      content: prompt,
    },
  ]);
}

async function quarantine(text, error, rawResponse) {
  console.error(JSON.stringify({
    event: "classification_quarantine",
    textHash: crypto
      .createHash("sha256")
      .update(text)
      .digest("hex"),
    error: error.message,
    rawResponse,
  }));

  // Replace this with a durable queue/database in production.
}

function stubClassify(text) {
  const value = text.toLowerCase();

  let category = "other";

  if (
    /\b(invoice|charged|charge|refund|payment|billing|subscription|price)\b/
      .test(value)
  ) {
    category = "billing";
  } else if (
    /\b(error|bug|broken|crash|failure|failed|not working)\b/
      .test(value)
  ) {
    category = "bug";
  } else if (
    /\b(feature|request|please add|would like|support .*ability)\b/
      .test(value)
  ) {
    category = "feature";
  }

  const urgency =
    /\b(urgent|asap|critical|outage|security|immediately)\b/
      .test(value)
      ? "high"
      : "normal";

  return {
    category,
    urgency,
    confidence: 0.99,
    reason: "Deterministic stub classification.",
  };
}

export async function classify(text, {
  stream = false,
  onChunk,
} = {}) {
  const input = inputSchema.parse({ text });

  const cached = getCached(input.text);

  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  if (process.env.LLM_ENABLED === "false") {
    throw Object.assign(
      new Error("LLM classification is disabled"),
      { code: "LLM_DISABLED" },
    );
  }

  if (process.env.LLM_STUB === "1") {
    const result = stubClassify(input.text);
    setCached(input.text, result);

    return {
      ...result,
      cached: false,
      stub: true,
    };
  }

  const promptTemplate = await loadPrompt(PROMPT_FILE);
  const prompt = promptTemplate.replace(
    "{{TEXT}}",
    input.text,
  );

  let response;

  try {
    response = await requestModel(
      [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: input.text,
        },
      ],
      {
        stream,
        onChunk,
      },
    );

    try {
      const result = validateModelResponse(
        response.content,
      );

      setCached(input.text, result);

      return {
        ...result,
        cached: false,
        repaired: false,
      };
    } catch (validationError) {
      // Exactly one repair attempt.
      const repaired = await repairResponse(
        input.text,
        response.content,
      );

      try {
        const result = validateModelResponse(
          repaired.content,
        );

        setCached(input.text, result);

        return {
          ...result,
          cached: false,
          repaired: true,
        };
      } catch (finalError) {
        await quarantine(
          input.text,
          finalError,
          repaired.content,
        );

        throw Object.assign(
          new Error(
            "Classification failed validation after repair",
          ),
          {
            code: "CLASSIFICATION_QUARANTINED",
            cause: finalError,
          },
        );
      }
    }
  } catch (error) {
    throw error;
  }
}

export {
  validateModelResponse,
  extractJson,
  stubClassify,
};