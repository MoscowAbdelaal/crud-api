import crypto from "node:crypto";

const TTL_MS = Number(
  process.env.CACHE_TTL_MS || 300_000,
);

const MAX_ENTRIES = Number(
  process.env.CACHE_MAX_ENTRIES || 1000,
);

const cache = new Map();

function makeKey(text) {
  return crypto
    .createHash("sha256")
    .update(text, "utf8")
    .digest("hex");
}

export function getCached(text) {
  const key = makeKey(text);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Refresh insertion order for LRU behavior.
  cache.delete(key);
  cache.set(key, entry);

  return entry.value;
}

export function setCached(text, value) {
  const key = makeKey(text);

  cache.delete(key);

  cache.set(key, {
    value,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  });

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }

    cache.delete(oldestKey);
  }
}

export function deleteCached(text) {
  cache.delete(makeKey(text));
}

export function clearCache() {
  cache.clear();
}

export function cacheSize() {
  return cache.size;
}