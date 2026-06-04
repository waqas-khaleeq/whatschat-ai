import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getCached, setCached, isLoading, setLoading, hasKey } from "./mediaCache";

export function useProxiedMedia(mediaUrl, userId) {
  const [result, setResult] = useState(() => getCached(mediaUrl));
  const [loading, setLoadingState] = useState(() => isLoading(mediaUrl));
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!mediaUrl || !mediaUrl.startsWith("wa-media-id:")) {
      if (mediaUrl) setResult({ data_url: mediaUrl, media_type: "image", mime_type: "", filename: "" });
      return;
    }

    const cached = getCached(mediaUrl);
    if (cached) { setResult(cached); return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoadingState(true);
    setLoading(mediaUrl);

    base44.functions.invoke("getWhatsAppMedia", { media_url: mediaUrl, user_id: userId })
      .then(res => {
        if (res?.data?.data_url) {
          const val = {
            data_url: res.data.data_url,
            mime_type: res.data.mime_type,
            media_type: res.data.media_type,
            filename: res.data.filename || "file",
          };
          setCached(mediaUrl, val);
          setResult(val);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoadingState(false));
  }, [mediaUrl, userId]);

  return { result, loading, error };
}