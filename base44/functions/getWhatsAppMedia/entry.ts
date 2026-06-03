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
    const { media_id, media_url } = body;

    let fetchUrl = media_url;

    // If we have a media_id (not a full URL), get the URL first
    if (media_id && !media_url) {
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${media_id}`, {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.url) {
        return Response.json({ error: metaData.error?.message || "Could not get media URL" }, { status: 400 });
      }
      fetchUrl = metaData.url;
    }

    if (!fetchUrl) {
      return Response.json({ error: "No media URL provided" }, { status: 400 });
    }

    // Fetch the actual media bytes with the access token
    const mediaRes = await fetch(fetchUrl, {
      headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
    });

    if (!mediaRes.ok) {
      return Response.json({ error: "Failed to fetch media" }, { status: 400 });
    }

    const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
    const buffer = await mediaRes.arrayBuffer();

    // Return as base64 data URL so the frontend can display it directly
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataUrl = `data:${contentType};base64,${base64}`;

    return Response.json({ data_url: dataUrl, content_type: contentType });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});