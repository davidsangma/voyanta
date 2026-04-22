const heroCache = new Map();
const HERO_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function json(data, status = 200) {
  return Response.json(data, { status });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function buildPrompt(destination, kind) {
  if (kind === "hotel") {
    return `Photorealistic luxury hotel room in ${destination}, warm natural lighting, elegant interior, travel brochure style, no text, no logos, landscape composition.`;
  }

  return `Photorealistic cinematic travel scene of ${destination}, iconic landmarks or coastline, golden hour, atmospheric, no text, no logos, landscape composition.`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination");
    const kind = normalize(searchParams.get("kind")) === "hotel" ? "hotel" : "destination";

    if (!destination) return json({ image_url: null });
    if (!process.env.OPENAI_API_KEY) return json({ image_url: null });

    const key = `${kind}:${normalize(destination)}`;
    const now = Date.now();
    const cached = heroCache.get(key);
    if (cached && cached.expires_at > now) {
      return json({ image_url: cached.image_url, cached: true });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: buildPrompt(destination, kind),
        size: "1536x1024",
      }),
    });

    if (!response.ok) {
      return json({ image_url: null, error: "image_generation_failed" });
    }

    const payload = await response.json();
    const first = Array.isArray(payload?.data) ? payload.data[0] : null;
    const imageUrl = first?.url || (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

    if (!imageUrl) return json({ image_url: null });

    heroCache.set(key, {
      image_url: imageUrl,
      expires_at: now + HERO_TTL_MS,
    });

    return json({ image_url: imageUrl, cached: false });
  } catch {
    return json({ image_url: null });
  }
}
