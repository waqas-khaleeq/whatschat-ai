import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { mediaCache } from "./mediaCache";

function needsProxy(url) {
  if (!url) return false;
  if (url.startsWith("wa-media-id:")) return true;
  if (!url.startsWith("http")) return true;
  if (url.includes("graph.facebook.com") || url.includes("lookaside.fbsbx.com") || url.includes("mmg.whatsapp.net")) return true;
  return false;
}

export function useProxiedMedia(mediaUrl, userId, enabled = true) {
  const [resolvedUrl, setResolvedUrl] = useState(() => mediaCache.get(mediaUrl) || null);
  const [mimeType, setMimeType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!mediaUrl || !enabled) return;
    if (!needsProxy(mediaUrl)) {
      setResolvedUrl(mediaUrl);
      return;
    }
    if (mediaCache.has(mediaUrl)) {
      const cached = mediaCache.get(mediaUrl);
      setResolvedUrl(cached.data_url);
      setMimeType(cached.mime_type);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    setError(false);

    base44.functions.invoke("getWhatsAppMedia", { media_url: mediaUrl, user_id: userId })
      .then(res => {
        if (res?.data?.data_url) {
          mediaCache.set(mediaUrl, { data_url: res.data.data_url, mime_type: res.data.mime_type });
          setResolvedUrl(res.data.data_url);
          setMimeType(res.data.mime_type);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [mediaUrl, userId, enabled]);

  return { resolvedUrl, mimeType, loading, error };
}