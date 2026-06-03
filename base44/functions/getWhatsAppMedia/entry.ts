import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { media_url } = body;

    if (!media_url) {
      return Response.json({ error: "No media_url provided" }, { status: 400 });
    }

    let fetchUrl = media_url;

    // Handle our prefixed media ID format: "wa-media-id:<id>"
    if (media_url.startsWith("wa-media-id:")) {
      const mediaId = media_url.replace("wa-media-id:", "");
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.url) {
        console.error("Media ID lookup failed:", JSON.stringify(metaData));
        return Response.json({ error: metaData.error?.message || "Could not resolve media ID" }, { status: 400 });
      }
      fetchUrl = metaData.url;
    } else if (!media_url.startsWith("http")) {
      // Raw media ID (legacy)
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${media_url}`, {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.url) {
        return Response.json({ error: metaData.error?.message || "Could not resolve media ID" }, { status: 400 });
      }
      fetchUrl = metaData.url;
    }
    // else: it's already a full URL (e.g. graph.facebook.com direct URL) — use as-is with auth header

    // Fetch the actual media bytes with the access token
    const mediaRes = await fetch(fetchUrl, {
      headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
    });

    if (!mediaRes.ok) {
      console.error("Media fetch failed:", mediaRes.status, fetchUrl);
      return Response.json({ error: "Failed to fetch media from WhatsApp" }, { status: 400 });
    }

    const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
    const buffer = await mediaRes.arrayBuffer();

    // Return as base64 data URL so the frontend can display/download it directly
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataUrl = `data:${contentType};base64,${base64}`;

    return Response.json({ data_url: dataUrl, content_type: contentType });
  } catch (error) {
    console.error("getWhatsAppMedia error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});