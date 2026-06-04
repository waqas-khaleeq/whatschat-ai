import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function mimeToMediaType(mime) {
  if (!mime) return "document";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

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
    const { media_url, user_id } = body;

    if (!media_url || !media_url.startsWith("wa-media-id:")) {
      return Response.json({ error: "Invalid media URL — must start with wa-media-id:" }, { status: 400 });
    }

    const userId = user_id || user.id;
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id: userId, is_active: true });
    if (!configs.length) {
      return Response.json({ error: "No WhatsApp config for this user" }, { status: 400 });
    }
    const accessToken = configs[0].access_token;

    // Step A: Get temporary download URL from Meta
    const mediaId = media_url.replace("wa-media-id:", "");
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const metaData = await metaRes.json();
    if (!metaRes.ok || !metaData.url) {
      console.error("Media ID lookup failed:", JSON.stringify(metaData));
      return Response.json({ error: metaData.error?.message || "Could not fetch media info from Meta" }, { status: 400 });
    }

    // Step B: Download media bytes
    const mediaRes = await fetch(metaData.url, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      console.error("Media fetch failed:", mediaRes.status);
      return Response.json({ error: "Failed to fetch media from WhatsApp" }, { status: 400 });
    }

    // Prefer Content-Type header from actual download over Meta metadata
    const mimeType = mediaRes.headers.get("content-type") || metaData.mime_type || "application/octet-stream";
    const buffer = await mediaRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const mediaType = mimeToMediaType(mimeType);

    // Try to extract filename from URL path
    let filename = "file";
    try {
      const urlPath = new URL(metaData.url).pathname;
      const parts = urlPath.split("/");
      const last = parts[parts.length - 1];
      if (last && last.includes(".")) filename = last.split("?")[0];
    } catch (_) {}

    return new Response(JSON.stringify({ data_url: dataUrl, mime_type: mimeType, media_type: mediaType, filename }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("getWhatsAppMedia error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});