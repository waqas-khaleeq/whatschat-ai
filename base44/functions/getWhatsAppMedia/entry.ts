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

    if (!media_url) {
      return Response.json({ error: "No media_url provided" }, { status: 400 });
    }

    // Look up user config for the access token
    const userId = user_id || user.id;
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id: userId, is_active: true });
    const accessToken = configs.length > 0 ? configs[0].access_token : null;

    if (!accessToken) {
      return Response.json({ error: "No WhatsApp config found for user" }, { status: 400 });
    }

    let fetchUrl = media_url;

    if (media_url.startsWith("wa-media-id:")) {
      const mediaId = media_url.replace("wa-media-id:", "");
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.url) {
        console.error("Media ID lookup failed:", JSON.stringify(metaData));
        return Response.json({ error: metaData.error?.message || "Could not resolve media ID" }, { status: 400 });
      }
      fetchUrl = metaData.url;
    } else if (!media_url.startsWith("http")) {
      // Raw legacy media ID
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${media_url}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.url) {
        return Response.json({ error: metaData.error?.message || "Could not resolve media ID" }, { status: 400 });
      }
      fetchUrl = metaData.url;
    }

    const mediaRes = await fetch(fetchUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!mediaRes.ok) {
      console.error("Media fetch failed:", mediaRes.status, fetchUrl);
      return Response.json({ error: "Failed to fetch media from WhatsApp" }, { status: 400 });
    }

    const mimeType = mediaRes.headers.get("content-type") || "application/octet-stream";
    const buffer = await mediaRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const mediaType = mimeToMediaType(mimeType);

    return new Response(JSON.stringify({ data_url: dataUrl, mime_type: mimeType, media_type: mediaType }), {
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