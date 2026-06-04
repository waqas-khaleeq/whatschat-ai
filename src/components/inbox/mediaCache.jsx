// Module-level media cache — survives component re-renders
// Value shape: { data_url, mime_type, media_type, filename } | { loading: true }
const cache = new Map();

export function getCached(key) {
  const v = cache.get(key);
  return v && !v.loading ? v : null;
}

export function setCached(key, value) {
  cache.set(key, value);
}

export function isLoading(key) {
  return cache.get(key)?.loading === true;
}

export function setLoading(key) {
  cache.set(key, { loading: true });
}

export function hasKey(key) {
  return cache.has(key);
}