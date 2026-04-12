const REQUIRED_FIELDS = ["source_city", "destination_city", "departure_date"];

const CITY_ALIASES = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  calcutta: "kolkata",
  delhi: "new delhi",
  nyc: "new york",
  blr: "BLR",
  dxb: "DXB",
  bom: "BOM",
  del: "DEL",
  lhr: "LHR",
  cdg: "CDG",
  jfk: "JFK",
};

const IATA_STOPWORDS = new Set(["THE", "AND", "FOR", "AIR", "YOU", "ARE"]);
const DUFFEL_BASE_URL = "https://api.duffel.com";
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || "v2";
const DUFFEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DUFFEL_MAX_PAGES = 12;
const DUFFEL_MAX_CODES_PER_REQUEST = 12;

const duffelAirlineCache = {
  byCode: new Map(),
  expiresAt: 0,
};

function json(data, status = 200) {
  return Response.json(data, { status });
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;

  const direct = safeJsonParse(text, null);
  if (direct && typeof direct === "object") return direct;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  return safeJsonParse(match[0], null);
}

function toISODate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getNextWeekday(baseDate, targetWeekday) {
  const d = new Date(baseDate);
  const current = d.getDay();
  let diff = (targetWeekday - current + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseRelativeDate(text, baseDate = new Date()) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (/\btoday\b/.test(value)) return toISODate(baseDate);
  if (/\btomorrow\b/.test(value)) return toISODate(addDays(baseDate, 1));
  if (/\bday after tomorrow\b/.test(value)) return toISODate(addDays(baseDate, 2));

  const inDays = value.match(/\bin\s+(\d{1,2})\s+day/);
  if (inDays) return toISODate(addDays(baseDate, Number(inDays[1])));

  const inWeeks = value.match(/\bin\s+(\d{1,2})\s+week/);
  if (inWeeks) return toISODate(addDays(baseDate, Number(inWeeks[1]) * 7));

  if (/\bnext week\b/.test(value)) return toISODate(getNextWeekday(baseDate, 1));
  if (/\bnext weekend\b/.test(value)) return toISODate(getNextWeekday(baseDate, 6));

  if (/\bnext month\b/.test(value)) {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + 1, 1);
    return toISODate(d);
  }

  return null;
}

function normalizeDate(value, historyText = "") {
  const text = normalizeWhitespace(value);

  if (!text || text.toLowerCase() === "null") {
    return parseRelativeDate(historyText);
  }

  const relative = parseRelativeDate(text);
  if (relative) return relative;

  const parsed = toISODate(text);
  if (parsed) return parsed;

  return parseRelativeDate(historyText);
}

function parseHistory(searchParams) {
  const historyParam = searchParams.get("history");
  const message = searchParams.get("message");

  if (historyParam) {
    const parsed = safeJsonParse(historyParam, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  if (message && normalizeWhitespace(message)) {
    return [{ role: "user", content: normalizeWhitespace(message) }];
  }

  return [];
}

function normalizeHistory(history) {
  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        normalizeWhitespace(item.content)
    )
    .map((item) => ({
      role: item.role,
      content: normalizeWhitespace(item.content),
    }));
}

function getLatestUserMessage(history) {
  return [...history].reverse().find((m) => m.role === "user")?.content || "";
}

function getRecentUserCorpus(history, limit = 8) {
  return history
    .filter((m) => m.role === "user")
    .slice(-limit)
    .map((m) => m.content)
    .join(" ");
}

function createDefaultState() {
  return {
    source_city: null,
    destination_city: null,
    departure_date: null,
    return_date: null,
    class: "economy",
    airline_brand: null,
    hotel_required: "no",
    hotel_star_rating: null,
    hotel_brand: null,
    direct_only: false,
    budget_mode: "balanced",
    slot_status: {
      source_city: "unknown",
      destination_city: "unknown",
      departure_date: "unknown",
      return_date: "unknown",
      class: "inferred",
      airline_brand: "unknown",
      hotel_required: "inferred",
      hotel_star_rating: "unknown",
      hotel_brand: "unknown",
      direct_only: "inferred",
      budget_mode: "inferred",
    },
  };
}

function normalizeStateSnapshot(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== "object") return base;

  const next = { ...base, ...raw };
  next.source_city = normalizeWhitespace(next.source_city || "") || null;
  next.destination_city = normalizeWhitespace(next.destination_city || "") || null;
  next.departure_date = normalizeDate(next.departure_date);
  next.return_date = normalizeDate(next.return_date);

  const klass = String(next.class || "economy").toLowerCase();
  next.class = ["economy", "premium_economy", "business", "first"].includes(klass)
    ? klass
    : "economy";
  next.airline_brand = normalizeWhitespace(next.airline_brand || "") || null;

  const hotel = String(next.hotel_required || "no").toLowerCase();
  next.hotel_required = ["yes", "no"].includes(hotel) ? hotel : "no";

  next.hotel_star_rating =
    next.hotel_star_rating == null || next.hotel_star_rating === ""
      ? null
      : Number(next.hotel_star_rating);

  if (Number.isNaN(next.hotel_star_rating)) next.hotel_star_rating = null;
  next.hotel_brand = normalizeWhitespace(next.hotel_brand || "") || null;

  next.direct_only = Boolean(next.direct_only);
  next.budget_mode = ["budget", "balanced", "luxury"].includes(next.budget_mode)
    ? next.budget_mode
    : "balanced";

  if (!next.slot_status || typeof next.slot_status !== "object") {
    next.slot_status = base.slot_status;
  }

  return next;
}

function parseInputState(searchParams) {
  const stateParam = searchParams.get("state");
  const parsed = stateParam ? safeJsonParse(stateParam, null) : null;
  return normalizeStateSnapshot(parsed);
}

function extractPreferences(history) {
  const text = getRecentUserCorpus(history).toLowerCase();

  return {
    cheap: /\b(cheap|budget|low cost|lowest fare|affordable)\b/.test(text),
    direct: /\b(direct|non[- ]?stop|no stops|only direct)\b/.test(text),
    flightPremium: /\b(premium economy|business class|first class|business|first)\b/.test(text),
    hotelIntent: /\b(hotel|hotels|accommodation|accomodation|stay|room|resort|lodging)\b/.test(text),
    hotelLuxury: /\b(5 star|five star|luxury hotel|luxury stay)\b/.test(text),
  };
}

function extractStarRatingFromText(text) {
  const value = String(text || "").toLowerCase();
  if (/\b5\s*star\b|\bfive\s*star\b/.test(value)) return 5;
  if (/\b4\s*star\b|\bfour\s*star\b/.test(value)) return 4;
  if (/\b3\s*star\b|\bthree\s*star\b/.test(value)) return 3;
  return null;
}

function extractHotelBrandFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  const clearPattern =
    /\b(any hotel|any brand|no brand|without brand|remove brand|clear brand|all hotels)\b|\b(clear|remove)\b.*\bhotel\b.*\bbrand\b/;
  if (clearPattern.test(value)) return "";

  const exactMatch =
    value.match(/\bonly\s+([a-z0-9&.' -]{2,40}?)\s+(?:hotel|hotels|resort|resorts)\b/) ||
    value.match(/\bi only want\s+([a-z0-9&.' -]{2,40}?)\s+(?:hotel|hotels|resort|resorts)\b/) ||
    value.match(/\bi want\s+([a-z0-9&.' -]{2,40}?)\s+(?:hotel|hotels|resort|resorts)\b/) ||
    value.match(/\bshow\s+([a-z0-9&.' -]{2,40}?)\s+(?:hotel|hotels|resort|resorts)\b/) ||
    value.match(/\b([a-z0-9&.' -]{2,40}?)\s+(?:hotel|hotels|resort|resorts)\s+only\b/);

  if (!exactMatch?.[1]) return null;
  const candidate = normalizeWhitespace(exactMatch[1])
    .replace(/^(show|me|only|just)\s+/i, "")
    .replace(/\s+(please|pls)$/i, "")
    .trim();
  return candidate || null;
}

function extractAirlineBrandFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  const clearPattern =
    /\b(any airline|any carrier|no airline preference|without airline filter|remove airline filter|clear airline filter|all airlines)\b|\b(clear|remove)\b.*\b(airline|carrier)\b.*\b(filter|preference)\b/;
  if (clearPattern.test(value)) return "";

  const exactMatch =
    value.match(/\bi only want\s+([a-z0-9&.' -]{2,50})\s+(?:flights?|airlines?|carrier|carriers)\b/) ||
    value.match(/\bi want only\s+([a-z0-9&.' -]{2,50})\s+(?:flights?|airlines?|carrier|carriers)\b/) ||
    value.match(/\bonly show me\s+([a-z0-9&.' -]{2,50})\s+(?:flights?|airlines?|carrier|carriers)?\b/) ||
    value.match(/\bshow me only\s+([a-z0-9&.' -]{2,50})\s+(?:flights?|airlines?|carrier|carriers)?\b/) ||
    value.match(/\bonly\s+([a-z0-9&.' -]{2,50})\s+(?:flights?|airlines?|carrier|carriers)\b/) ||
    value.match(/\bshow\s+([a-z0-9&.' -]{2,50})\s+flights\b/) ||
    value.match(/\b([a-z0-9&.' -]{2,50})\s+(?:airlines?|carriers?)\s+only\b/);

  if (!exactMatch?.[1]) return null;

  const candidate = normalizeWhitespace(exactMatch[1])
    .replace(/\b(flights?|airlines?|carrier|carriers)\b/gi, "")
    .replace(/\b(please|pls)\b/gi, "")
    .replace(/^(show|me|only|just)\s+/i, "")
    .trim();
  if (!candidate) return null;
  if (/\b(hotel|hotels|resort|stay|accommodation|room|lodging)\b/i.test(candidate)) return null;

  const blocked = new Set([
    "direct",
    "non stop",
    "non-stop",
    "cheapest",
    "cheap",
    "business class",
    "first class",
    "premium economy",
    "economy",
  ]);

  return blocked.has(candidate.toLowerCase()) ? null : candidate;
}

function simplifyBrandText(value) {
  const cleaned = normalizeWhitespace(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Helps match common minor misspellings like "mariott" vs "marriott".
  return cleaned.replace(/([a-z])\1+/g, "$1");
}

function detectIntent(history) {
  const latest = getLatestUserMessage(history).toLowerCase();

  if (/\b(compare|comparison|which is better)\b/.test(latest)) return "compare_request";
  if (/\b(replan|change|update|modify|switch|instead)\b/.test(latest)) return "modify_constraint";
  if (/\bfrom\b|\bto\b|\bclass\b|\bdirect\b|\bhotel\b|\bdate\b|\bairline\b|\bcarrier\b/.test(latest)) return "clarification_answer";
  return "new_search";
}

function normalizeCabinClass(value, preferences) {
  const input = String(value || "").toLowerCase();

  if (input.includes("premium")) return "premium_economy";
  if (input.includes("business")) return "business";
  if (input.includes("first")) return "first";
  if (input.includes("economy")) return "economy";
  if (preferences.flightPremium) return "business";

  return null;
}

function normalizeHotelRequired(value) {
  if (typeof value === "boolean") return value ? "yes" : "no";

  const text = String(value || "").toLowerCase().trim();
  if (["yes", "true", "required", "need", "needed", "include"].includes(text)) return "yes";
  if (["no", "false", "not required", "skip"].includes(text)) return "no";
  return null;
}

function setSlot(state, key, value, status = "inferred") {
  if (value == null || value === "") return;
  state[key] = value;
  state.slot_status[key] = status;
}

function clearSlot(state, key) {
  state[key] = null;
  state.slot_status[key] = "unknown";
}

function applyRuleOverrides(state, history, preferences) {
  const latest = getLatestUserMessage(history).toLowerCase();

  if (preferences.direct) {
    setSlot(state, "direct_only", true, "confirmed");
  }

  if (preferences.cheap) {
    setSlot(state, "budget_mode", "budget", "confirmed");
  }

  if (preferences.flightPremium) {
    setSlot(state, "class", "business", "confirmed");
  }

  if (preferences.hotelIntent) {
    setSlot(state, "hotel_required", "yes", "confirmed");
  }

  if (/\b(no hotel|without hotel|skip hotel)\b/.test(latest)) {
    setSlot(state, "hotel_required", "no", "confirmed");
  }

  if (/\b(no|without|remove)\b.*\b(star|rating|constraint)\b/.test(latest)) {
    clearSlot(state, "hotel_star_rating");
  }

  const explicitStars = extractStarRatingFromText(latest);
  if (explicitStars != null) {
    setSlot(state, "hotel_required", "yes", "confirmed");
    setSlot(state, "hotel_star_rating", explicitStars, "confirmed");
    if (explicitStars >= 5) {
      setSlot(state, "budget_mode", "luxury", "confirmed");
    }
  }

  const requestedBrand = extractHotelBrandFromText(latest);
  if (requestedBrand === "") {
    clearSlot(state, "hotel_brand");
  } else if (requestedBrand) {
    setSlot(state, "hotel_required", "yes", "confirmed");
    setSlot(state, "hotel_brand", requestedBrand, "confirmed");
  }

  const requestedAirline = extractAirlineBrandFromText(latest);
  if (requestedAirline === "") {
    clearSlot(state, "airline_brand");
  } else if (requestedAirline) {
    setSlot(state, "airline_brand", requestedAirline, "confirmed");
  }
}

function buildSystemPrompt(todayIso, currentState) {
  return `You are a travel planning extractor.
Today is ${todayIso}.
Current state JSON:\n${JSON.stringify(currentState)}

Task:
- Read chat history and infer slot updates from user intent.
- Preserve existing details unless user changes them.
- Convert relative dates to YYYY-MM-DD.
- If user does not mention a field this turn, return null for that field.

Return only JSON with keys:
{
  "source_city": string|null,
  "destination_city": string|null,
  "departure_date": string|null,
  "return_date": string|null,
  "class": string|null,
  "airline_brand": string|null,
  "hotel_required": boolean|string|null,
  "hotel_star_rating": number|null,
  "hotel_brand": string|null,
  "direct_only": boolean|null,
  "budget_mode": "budget"|"balanced"|"luxury"|null
}`;
}

async function parseTripUpdateWithAI(history, currentState) {
  const todayIso = toISODate(new Date()) || "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0,
      messages: [
        { role: "system", content: buildSystemPrompt(todayIso, currentState) },
        ...history,
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return extractJsonObject(content) || {};
}

function applyParsedUpdate(state, parsedUpdate, history, preferences) {
  const next = normalizeStateSnapshot(state);
  const corpus = getRecentUserCorpus(history);

  const source = normalizeWhitespace(parsedUpdate?.source_city || "") || null;
  const destination = normalizeWhitespace(parsedUpdate?.destination_city || "") || null;
  const departureDate = normalizeDate(parsedUpdate?.departure_date, corpus);
  const returnDate = normalizeDate(parsedUpdate?.return_date, corpus);
  const klass = normalizeCabinClass(parsedUpdate?.class, preferences);
  const parsedAirlineBrand = normalizeWhitespace(parsedUpdate?.airline_brand || "") || null;
  const hotelRequired = normalizeHotelRequired(parsedUpdate?.hotel_required);
  const parsedHotelBrand = normalizeWhitespace(parsedUpdate?.hotel_brand || "") || null;

  const parsedDirectOnly =
    typeof parsedUpdate?.direct_only === "boolean" ? parsedUpdate.direct_only : null;
  const parsedBudget =
    ["budget", "balanced", "luxury"].includes(parsedUpdate?.budget_mode)
      ? parsedUpdate.budget_mode
      : null;

  if (source) setSlot(next, "source_city", source, "inferred");
  if (destination) setSlot(next, "destination_city", destination, "inferred");
  if (departureDate) setSlot(next, "departure_date", departureDate, "inferred");
  if (returnDate) setSlot(next, "return_date", returnDate, "inferred");
  if (klass) setSlot(next, "class", klass, "inferred");
  if (parsedAirlineBrand) setSlot(next, "airline_brand", parsedAirlineBrand, "inferred");
  if (hotelRequired) setSlot(next, "hotel_required", hotelRequired, "inferred");
  if (parsedHotelBrand) setSlot(next, "hotel_brand", parsedHotelBrand, "inferred");

  if (parsedUpdate?.hotel_star_rating != null && parsedUpdate?.hotel_star_rating !== "") {
    const stars = Number(parsedUpdate.hotel_star_rating);
    if (!Number.isNaN(stars)) setSlot(next, "hotel_star_rating", stars, "inferred");
  }

  if (parsedDirectOnly != null) setSlot(next, "direct_only", parsedDirectOnly, "inferred");
  if (parsedBudget) setSlot(next, "budget_mode", parsedBudget, "inferred");

  applyRuleOverrides(next, history, preferences);

  if (next.hotel_required === "no") {
    clearSlot(next, "hotel_star_rating");
    clearSlot(next, "hotel_brand");
  }

  return next;
}

function validateState(state) {
  const missing = REQUIRED_FIELDS.filter((field) => !state[field]);
  return { missing };
}

function buildFollowUpQuestion(missing, state) {
  const field = missing[0];

  if (field === "source_city") {
    return state.destination_city
      ? `Great, traveling to ${state.destination_city}. Where are you traveling from?`
      : "Where are you traveling from?";
  }

  if (field === "destination_city") {
    return state.source_city
      ? `Nice, departing from ${state.source_city}. Where do you want to go?`
      : "Where do you want to go?";
  }

  if (field === "departure_date") {
    return "When should I set the departure (e.g., tomorrow, next weekend, or YYYY-MM-DD)?";
  }

  return "Could you share a bit more detail?";
}

function normalizeCityCandidate(city) {
  return normalizeWhitespace(city)
    .replace(/\b(from|to|in)\b/gi, "")
    .replace(/\b(next week|this week|next month|tomorrow|today|in \d+ weeks?)\b/gi, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAirportCandidates(city) {
  const cleaned = normalizeCityCandidate(city);
  const lower = cleaned.toLowerCase();
  const alias = CITY_ALIASES[lower];

  return [cleaned, cleaned.split(" ").slice(0, 2).join(" "), alias]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function extractIataFromText(text) {
  if (!text) return null;
  const matches = String(text).match(/\b[A-Z]{3}\b/g) || [];
  return matches.find((token) => !IATA_STOPWORDS.has(token)) || null;
}

function withTimeout(promise, timeoutMs = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
  ]);
}

function findAirlineIataCode(flight) {
  const labels = Array.isArray(flight?.flight_numbers) ? flight.flight_numbers : [];

  for (const label of labels) {
    const text = String(label || "").trim();
    const match = text.match(/\b([A-Z0-9]{2})\s?\d{1,4}\b/);
    if (match?.[1]) return match[1].toUpperCase();
  }

  return null;
}

function collectAirlineCodesFromFlights(flights) {
  const seen = new Set();

  for (const flight of flights) {
    const code = findAirlineIataCode(flight);
    if (!code) continue;
    seen.add(code);
    if (seen.size >= DUFFEL_MAX_CODES_PER_REQUEST) break;
  }

  return [...seen];
}

async function fetchDuffelAirlinesPage(after = null) {
  const params = new URLSearchParams({ limit: "200" });
  if (after) params.set("after", after);

  const res = await withTimeout(
    fetch(`${DUFFEL_BASE_URL}/air/airlines?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
        "Duffel-Version": DUFFEL_VERSION,
      },
    }),
    5000
  );

  if (!res.ok) {
    throw new Error(`duffel_airlines_failed:${res.status}`);
  }

  const payload = await res.json().catch(() => ({}));
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    after: payload?.meta?.after || null,
  };
}

async function loadDuffelAirlineCache() {
  if (!process.env.DUFFEL_API_KEY) return;
  if (duffelAirlineCache.expiresAt > Date.now() && duffelAirlineCache.byCode.size > 0) return;

  const nextMap = new Map();
  let after = null;

  for (let page = 0; page < DUFFEL_MAX_PAGES; page += 1) {
    const pageResult = await fetchDuffelAirlinesPage(after);
    for (const airline of pageResult.data) {
      const code = normalizeWhitespace(airline?.iata_code || "").toUpperCase();
      if (!code) continue;
      nextMap.set(code, {
        name: normalizeWhitespace(airline?.name || "") || null,
        iata_code: code,
        icao_code: normalizeWhitespace(airline?.icao_code || "") || null,
        logo_url:
          airline?.logo_symbol_url ||
          airline?.logo_lockup_url ||
          airline?.logo_square_url ||
          airline?.logo_url ||
          null,
      });
    }

    after = pageResult.after;
    if (!after) break;
  }

  if (nextMap.size > 0) {
    duffelAirlineCache.byCode = nextMap;
    duffelAirlineCache.expiresAt = Date.now() + DUFFEL_CACHE_TTL_MS;
  }
}

async function enrichFlightsWithDuffel(flights) {
  if (!process.env.DUFFEL_API_KEY || !Array.isArray(flights) || flights.length === 0) {
    return flights;
  }

  try {
    const codes = collectAirlineCodesFromFlights(flights);
    if (codes.length === 0) return flights;

    await loadDuffelAirlineCache();
    if (duffelAirlineCache.byCode.size === 0) return flights;

    return flights.map((flight) => {
      const code = findAirlineIataCode(flight);
      if (!code) return flight;

      const info = duffelAirlineCache.byCode.get(code);
      if (!info) return { ...flight, airline_iata_code: code };

      return {
        ...flight,
        airline: info.name || flight.airline,
        airline_iata_code: info.iata_code || code,
        airline_logo_url: info.logo_url || null,
      };
    });
  } catch {
    return flights;
  }
}

async function lookupAirportByFlightsEngine(query) {
  const res = await fetch(
    `https://serpapi.com/search.json?engine=google_flights_airports&q=${encodeURIComponent(
      query
    )}&api_key=${process.env.SERPAPI_KEY}`
  );

  const data = await res.json().catch(() => ({}));
  const code = data?.airports?.[0]?.iata_code || data?.airport_results?.[0]?.iata_code || null;

  return { ok: res.ok, code, apiError: data?.error || null };
}

async function lookupAirportByGoogleSearch(query) {
  const res = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
      `${query} airport IATA code`
    )}&api_key=${process.env.SERPAPI_KEY}`
  );

  const data = await res.json().catch(() => ({}));
  const snippets = [
    data?.answer_box?.answer,
    data?.answer_box?.snippet,
    data?.knowledge_graph?.description,
    ...(data?.organic_results || []).slice(0, 5).map((r) => `${r?.title || ""} ${r?.snippet || ""}`),
  ]
    .filter(Boolean)
    .join(" ");

  return { ok: res.ok, code: extractIataFromText(snippets), apiError: data?.error || null };
}

async function resolveAirportCode(city) {
  const raw = normalizeWhitespace(city);
  if (!raw) return { code: null, reason: "missing_city" };

  if (/^[A-Za-z]{3}$/.test(raw)) {
    return { code: raw.toUpperCase(), reason: null };
  }

  const candidates = buildAirportCandidates(raw);
  const attempts = [];

  for (const candidate of candidates) {
    const flightsLookup = await lookupAirportByFlightsEngine(candidate).catch((error) => ({
      ok: false,
      code: null,
      apiError: error instanceof Error ? error.message : "lookup_failed",
    }));

    attempts.push({ method: "flights_airports", query: candidate, ...flightsLookup });
    if (flightsLookup.code) return { code: flightsLookup.code, reason: null };

    const googleLookup = await lookupAirportByGoogleSearch(candidate).catch((error) => ({
      ok: false,
      code: null,
      apiError: error instanceof Error ? error.message : "lookup_failed",
    }));

    attempts.push({ method: "google_search", query: candidate, ...googleLookup });
    if (googleLookup.code) return { code: googleLookup.code, reason: null };
  }

  const apiError = attempts.find((a) => a.apiError)?.apiError;
  return { code: null, reason: apiError ? `serpapi_error: ${apiError}` : "no_airport_match" };
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;

  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

function formatDurationMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "N/A";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatStopsLabel(stops) {
  if (!Number.isFinite(stops) || stops <= 0) return "Non-stop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function getFlightLabel(segment) {
  const airline = normalizeWhitespace(segment?.airline || "");
  const number = segment?.flight_number;
  const hasNumber = typeof number === "string" || typeof number === "number";
  if (!airline && !hasNumber) return null;
  return hasNumber ? `${airline} ${String(number)}`.trim() : airline;
}

function collectFlightLabels(flight) {
  const outboundSegments = Array.isArray(flight?.flights) ? flight.flights : [];
  const returnSegments = Array.isArray(flight?.return_flights) ? flight.return_flights : [];
  const allSegments = [...outboundSegments, ...returnSegments];

  return allSegments
    .map((segment) => getFlightLabel(segment))
    .filter(Boolean)
    .filter((label, index, arr) => arr.indexOf(label) === index);
}

function normalizeScore(values, index, inverse = false) {
  if (!values.length) return 0;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 0;

  const normalized = (values[index] - min) / (max - min);
  return inverse ? 1 - normalized : normalized;
}

function rankFlights(flights, state) {
  if (!flights.length) return [];

  const weights = { price: 0.45, duration: 0.35, stops: 0.2 };

  if (state.budget_mode === "budget") {
    weights.price = 0.7;
    weights.duration = 0.2;
    weights.stops = 0.1;
  }

  if (state.budget_mode === "luxury") {
    weights.price = 0.2;
    weights.duration = 0.4;
    weights.stops = 0.4;
  }

  if (state.direct_only) {
    weights.stops = Math.max(weights.stops, 0.55);
    weights.price = Math.max(0.2, 1 - (weights.duration + weights.stops));
  }

  const prices = flights.map((f) => f.price_value ?? Number.MAX_SAFE_INTEGER / 10);
  const durations = flights.map((f) => f.duration_value ?? Number.MAX_SAFE_INTEGER / 10);
  const stops = flights.map((f) => f.stops ?? 0);

  return flights
    .map((flight, index) => ({
      ...flight,
      _score:
        normalizeScore(prices, index) * weights.price +
        normalizeScore(durations, index) * weights.duration +
        normalizeScore(stops, index) * weights.stops,
    }))
    .sort((a, b) => a._score - b._score)
    .map((item) => {
      const cleaned = { ...item };
      delete cleaned._score;
      return cleaned;
    });
}

function mapCabinClassToSerpValue(cabinClass) {
  const normalized = String(cabinClass || "").toLowerCase().trim();
  if (normalized === "economy") return "1";
  if (normalized === "premium_economy") return "2";
  if (normalized === "business") return "3";
  if (normalized === "first") return "4";
  return "";
}

function matchesAirlineBrand(flight, requestedAirline) {
  if (!requestedAirline) return true;

  const needle = simplifyBrandText(requestedAirline);
  if (!needle) return true;

  const labels = [
    flight?.airline,
    flight?.airline_iata_code,
    ...(Array.isArray(flight?.flight_numbers) ? flight.flight_numbers : []),
  ]
    .map((value) => simplifyBrandText(value || ""))
    .filter(Boolean);

  return labels.some((label) => label.includes(needle));
}

async function fetchFlights(origin, destination, state) {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: state.departure_date,
    adults: "1",
    currency: "INR",
    hl: "en",
    gl: "in",
    api_key: process.env.SERPAPI_KEY,
  });

  const travelClass = mapCabinClassToSerpValue(state.class);
  if (travelClass) params.set("travel_class", travelClass);

  if (state.return_date) {
    params.set("type", "1");
    params.set("return_date", state.return_date);
  } else {
    params.set("type", "2");
  }

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!res.ok) return [];

  const data = await res.json();
  const sourceFlights = data?.best_flights || data?.other_flights || [];

  const normalized = sourceFlights.slice(0, 15).map((flight) => {
    const segments = flight?.flights || [];
    const first = segments[0];
    const last = segments[segments.length - 1];
    const allFlightLabels = collectFlightLabels(flight);

    const duration = Number(flight?.total_duration) || null;
    const priceValue = parsePrice(flight?.price);
    const stops = Math.max(0, segments.length - 1);
    const flightNumber = allFlightLabels[0] || "N/A";
    const departureTime = first?.departure_airport?.time || first?.departure_time || "N/A";

    return {
      airline: first?.airline || "Unknown",
      airline_iata_code: findAirlineIataCode({ flight_numbers: allFlightLabels }),
      price: priceValue != null ? `${priceValue} INR` : "N/A",
      price_value: priceValue,
      cabin_class: state.class || "economy",
      trip_type: state.return_date ? "round_trip" : "one_way",
      duration: duration != null ? formatDurationMinutes(duration) : "N/A",
      duration_value: duration,
      origin: first?.departure_airport?.id || origin,
      destination: last?.arrival_airport?.id || destination,
      departure_time: departureTime,
      flight_number: flightNumber,
      flight_numbers: allFlightLabels,
      stops,
      stops_label: formatStopsLabel(stops),
    };
  });

  const enrichedFlights = await enrichFlightsWithDuffel(normalized);
  const airlineFiltered = state.airline_brand
    ? enrichedFlights.filter((flight) => matchesAirlineBrand(flight, state.airline_brand))
    : enrichedFlights;

  const ranked = rankFlights(airlineFiltered, state);
  if (state.direct_only) {
    const directOnly = ranked.filter((f) => f.stops === 0);
    if (directOnly.length > 0) return directOnly.slice(0, 5);
  }

  return ranked.slice(0, 5);
}

function rankHotels(hotels, state) {
  if (!hotels.length) return [];

  const prices = hotels.map((h) => h.price_value ?? Number.MAX_SAFE_INTEGER / 10);
  const ratings = hotels.map((h) => (typeof h.rating === "number" ? h.rating : 0));

  return hotels
    .map((hotel, index) => {
      let score = normalizeScore(prices, index) * 0.55 + normalizeScore(ratings, index, true) * 0.45;

      if (state.budget_mode === "luxury") {
        score = normalizeScore(prices, index) * 0.2 + normalizeScore(ratings, index, true) * 0.8;
      }

      if (state.budget_mode === "budget") {
        score = normalizeScore(prices, index) * 0.75 + normalizeScore(ratings, index, true) * 0.25;
      }

      return { ...hotel, _score: score };
    })
    .sort((a, b) => a._score - b._score)
    .map((item) => {
      const cleaned = { ...item };
      delete cleaned._score;
      return cleaned;
    });
}

function matchesHotelBrand(hotel, requestedBrand) {
  if (!requestedBrand) return true;
  const haystack = simplifyBrandText(hotel?.name || "");
  const needle = simplifyBrandText(requestedBrand);
  if (!haystack || !needle) return true;
  return haystack.includes(needle);
}

function shouldRequestHotels(history, state) {
  if (state.hotel_required === "yes") return true;
  const latest = getLatestUserMessage(history).toLowerCase();
  return /\b(hotel|hotels|accommodation|accomodation|stay|room|resort|lodging)\b/.test(latest);
}

function parseHotelClass(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const match = value.match(/(\d(?:\.\d+)?)/);
    if (!match) return null;
    const num = Number(match[1]);
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

function meetsHotelStarConstraint(hotel, requestedStars) {
  if (!requestedStars) return true;

  // Prefer actual hotel class (star category) when available.
  if (typeof hotel.hotel_class === "number") {
    return hotel.hotel_class >= requestedStars;
  }

  // Fallback to review rating only when class is missing.
  const rating = typeof hotel.rating === "number" ? hotel.rating : null;
  if (rating == null) return false;

  const fallbackThresholds = {
    5: 4.4,
    4: 4.0,
    3: 3.5,
  };

  const threshold = fallbackThresholds[requestedStars] ?? requestedStars;
  return rating >= threshold;
}

async function fetchHotels(state) {
  const params = new URLSearchParams({
    engine: "google_hotels",
    q: `hotels in ${state.destination_city}`,
    check_in_date: state.departure_date,
    check_out_date: state.return_date || toISODate(addDays(new Date(state.departure_date), 2)) || "",
    currency: "INR",
    hl: "en",
    gl: "in",
    api_key: process.env.SERPAPI_KEY,
  });

  async function fetchProperties(urlParams) {
    const res = await fetch(`https://serpapi.com/search.json?${urlParams.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.properties || [];
  }

  function mapHotels(rawHotels) {
    return rawHotels.slice(0, 20).map((hotel) => ({
      name: hotel?.name || "Unknown",
      rating: typeof hotel?.overall_rating === "number" ? hotel.overall_rating : null,
      hotel_class: parseHotelClass(hotel?.extracted_hotel_class ?? hotel?.hotel_class ?? hotel?.type),
      price: hotel?.rate_per_night?.lowest || "N/A",
      price_value: parsePrice(hotel?.rate_per_night?.lowest),
      link: hotel?.link || "#",
    }));
  }

  let rawHotels = await fetchProperties(params);

  if (rawHotels.length === 0) {
    const fallback = new URLSearchParams({
      engine: "google_hotels",
      q: `hotels in ${state.destination_city}`,
      currency: "INR",
      hl: "en",
      gl: "in",
      api_key: process.env.SERPAPI_KEY,
    });
    rawHotels = await fetchProperties(fallback);
  }

  let hotels = mapHotels(rawHotels).filter((h) => h.name && h.name !== "Unknown");

  if (state.hotel_star_rating) {
    hotels = hotels.filter((h) => meetsHotelStarConstraint(h, state.hotel_star_rating));
  }

  if (state.hotel_brand) {
    hotels = hotels.filter((h) => matchesHotelBrand(h, state.hotel_brand));
  }

  return rankHotels(hotels, state).slice(0, 5);
}

function buildActions(state) {
  const actions = [
    "Compare top 3 flights",
    state.direct_only ? "Allow layovers" : "Only direct flights",
    state.budget_mode === "budget" ? "Balanced options" : "Cheaper options",
  ];

  if (state.hotel_required === "yes") {
    actions.push("Remove hotel star filter");
    if (state.hotel_brand) actions.push("Clear hotel brand filter");
  } else {
    actions.push("Add hotels");
  }

  if (state.airline_brand) {
    actions.push("Clear airline filter");
  }

  return actions;
}

function formatStateValue(key, value) {
  if (value == null) return "cleared";
  if (key === "direct_only") return value ? "on" : "off";
  if (key === "hotel_required") return value === "yes" ? "enabled" : "disabled";
  if (key === "airline_brand") return String(value);
  if (key === "hotel_brand") return String(value);
  return String(value);
}

function getChangedSlots(previousState, nextState) {
  const keys = [
    "source_city",
    "destination_city",
    "departure_date",
    "return_date",
    "class",
    "airline_brand",
    "hotel_required",
    "hotel_star_rating",
    "hotel_brand",
    "direct_only",
    "budget_mode",
  ];

  return keys.filter((key) => {
    const prev = previousState?.[key];
    const next = nextState?.[key];
    return JSON.stringify(prev) !== JSON.stringify(next);
  });
}

function buildUpdateSummary(previousState, nextState) {
  const changed = getChangedSlots(previousState, nextState);
  if (changed.length === 0) return "";

  const labels = {
    source_city: "source",
    destination_city: "destination",
    departure_date: "departure",
    return_date: "return",
    class: "cabin",
    airline_brand: "airline",
    hotel_required: "hotels",
    hotel_star_rating: "hotel stars",
    hotel_brand: "hotel brand",
    direct_only: "direct flights",
    budget_mode: "budget mode",
  };

  const snippets = changed.slice(0, 3).map((key) => {
    return `${labels[key]}: ${formatStateValue(key, nextState[key])}`;
  });

  const suffix = changed.length > 3 ? " and more." : ".";
  return `Updated ${snippets.join(", ")}${suffix}`;
}

export async function GET(request) {
  try {
    if (!process.env.OPENAI_API_KEY || !process.env.SERPAPI_KEY) {
      return json({ error: "Server is missing OPENAI_API_KEY or SERPAPI_KEY." }, 500);
    }

    const { searchParams } = new URL(request.url);
    const history = normalizeHistory(parseHistory(searchParams));

    if (history.length === 0) {
      const stateSnapshot = createDefaultState();
      return json({
        type: "follow_up",
        intent_detected: "new_search",
        message: "Tell me where you want to travel, from which city, and your preferred date.",
        state_snapshot: stateSnapshot,
      });
    }

    const previousState = parseInputState(searchParams);
    const intent = detectIntent(history);
    const preferences = extractPreferences(history);

    const parsedUpdate = await parseTripUpdateWithAI(history, previousState);
    const state = applyParsedUpdate(previousState, parsedUpdate, history, preferences);
    const updateSummary = buildUpdateSummary(previousState, state);

    const { missing } = validateState(state);
    if (missing.length > 0) {
      return json({
        type: "follow_up",
        intent_detected: intent,
        message: buildFollowUpQuestion(missing, state),
        update_summary: updateSummary,
        missing,
        collected: state,
        state_snapshot: state,
        actions: buildActions(state),
      });
    }

    const [sourceAirport, destinationAirport] = await Promise.all([
      resolveAirportCode(state.source_city),
      resolveAirportCode(state.destination_city),
    ]);

    if (!sourceAirport.code || !destinationAirport.code) {
      return json({
        type: "follow_up",
        intent_detected: intent,
        message:
          "I could not resolve one of the airports. Please share source and destination as city or IATA code (for example BLR to DXB).",
        update_summary: updateSummary,
        debug: {
          source_city: state.source_city,
          destination_city: state.destination_city,
          source_lookup_reason: sourceAirport.reason,
          destination_lookup_reason: destinationAirport.reason,
        },
        state_snapshot: state,
        actions: buildActions(state),
      });
    }

    const hotelRequested = shouldRequestHotels(history, state);

    const [bestFlights, hotels] = await Promise.all([
      fetchFlights(sourceAirport.code, destinationAirport.code, state),
      hotelRequested ? fetchHotels(state) : Promise.resolve([]),
    ]);

    return json({
      type: "result",
      intent_detected: intent,
      update_summary: updateSummary,
      trip: {
        ...state,
        source_airport: sourceAirport.code,
        destination_airport: destinationAirport.code,
      },
      best_flights: bestFlights,
      hotels,
      state_snapshot: state,
      actions: buildActions(state),
      meta: {
        ranked_by: ["price", "duration", "stops", "hotel_quality"],
        hotel_requested: hotelRequested,
        hotel_count: hotels.length,
      },
    });
  } catch (error) {
    return json(
      {
        error: "Something went wrong",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
