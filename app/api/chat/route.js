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

const COUNTRY_NAMES = new Set(
  [
    "india",
    "japan",
    "china",
    "thailand",
    "france",
    "germany",
    "italy",
    "spain",
    "switzerland",
    "australia",
    "singapore",
    "malaysia",
    "indonesia",
    "vietnam",
    "uae",
    "united arab emirates",
    "united states",
    "usa",
    "uk",
    "united kingdom",
    "canada",
    "mexico",
    "turkey",
    "qatar",
    "saudi arabia",
    "sri lanka",
    "nepal",
    "bhutan",
    "new zealand",
    "south korea",
    "korea",
    "russia",
    "netherlands",
    "belgium",
    "portugal",
    "greece",
    "egypt",
    "south africa",
    "brazil",
    "argentina",
  ].map((v) => v.toLowerCase())
);

const COUNTRY_CITY_EXAMPLES = {
  india: ["Delhi", "Mumbai", "Bengaluru"],
  japan: ["Tokyo", "Osaka", "Kyoto"],
  thailand: ["Bangkok", "Phuket", "Chiang Mai"],
  china: ["Beijing", "Shanghai", "Guangzhou"],
  france: ["Paris", "Nice", "Lyon"],
  germany: ["Berlin", "Frankfurt", "Munich"],
  italy: ["Rome", "Milan", "Venice"],
  spain: ["Madrid", "Barcelona", "Seville"],
  switzerland: ["Zurich", "Geneva", "Basel"],
  australia: ["Sydney", "Melbourne", "Brisbane"],
  singapore: ["Singapore"],
  malaysia: ["Kuala Lumpur", "Penang", "Langkawi"],
  indonesia: ["Jakarta", "Bali", "Surabaya"],
  vietnam: ["Hanoi", "Ho Chi Minh City", "Da Nang"],
  uae: ["Dubai", "Abu Dhabi", "Sharjah"],
  "united arab emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  "united states": ["New York", "San Francisco", "Chicago"],
  usa: ["New York", "San Francisco", "Chicago"],
  uk: ["London", "Manchester", "Edinburgh"],
  "united kingdom": ["London", "Manchester", "Edinburgh"],
  canada: ["Toronto", "Vancouver", "Montreal"],
  mexico: ["Mexico City", "Cancun", "Guadalajara"],
  turkey: ["Istanbul", "Ankara", "Antalya"],
  qatar: ["Doha"],
  "saudi arabia": ["Riyadh", "Jeddah", "Dammam"],
  "sri lanka": ["Colombo", "Kandy", "Galle"],
  nepal: ["Kathmandu", "Pokhara", "Lalitpur"],
  bhutan: ["Thimphu", "Paro", "Punakha"],
  "new zealand": ["Auckland", "Wellington", "Christchurch"],
  "south korea": ["Seoul", "Busan", "Incheon"],
  korea: ["Seoul", "Busan", "Incheon"],
  russia: ["Moscow", "Saint Petersburg", "Kazan"],
  netherlands: ["Amsterdam", "Rotterdam", "The Hague"],
  belgium: ["Brussels", "Antwerp", "Bruges"],
  portugal: ["Lisbon", "Porto", "Faro"],
  greece: ["Athens", "Santorini", "Thessaloniki"],
  egypt: ["Cairo", "Alexandria", "Hurghada"],
  "south africa": ["Cape Town", "Johannesburg", "Durban"],
  brazil: ["Sao Paulo", "Rio de Janeiro", "Brasilia"],
  argentina: ["Buenos Aires", "Cordoba", "Mendoza"],
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
    trip_type: null,
    package_required: null,
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
      trip_type: "unknown",
      package_required: "unknown",
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
  next.trip_type = ["one_way", "round_trip"].includes(next.trip_type) ? next.trip_type : null;
  const packageRequired = String(next.package_required || "").toLowerCase();
  next.package_required = ["yes", "no"].includes(packageRequired) ? packageRequired : null;

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

function normalizeCabinClass(value) {
  const input = String(value || "").toLowerCase();

  if (input.includes("premium")) return "premium_economy";
  if (input.includes("business")) return "business";
  if (input.includes("first")) return "first";
  if (input.includes("economy")) return "economy";

  return null;
}

function extractCabinClassFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (
    /\b(first\s*class|1st\s*class|switch to first|go first class|first class trip|first class tickets?|tickets? in first class|only first class)\b/.test(
      value
    )
  ) {
    return "first";
  }

  if (
    /\b(business\s*class|switch to business|go business class|business trip|business tickets?|tickets? in business class|only business class)\b/.test(
      value
    )
  ) {
    return "business";
  }

  if (/\b(premium\s*economy|premium tickets?)\b/.test(value)) return "premium_economy";
  if (/\b(economy(\s*class)?|economy tickets?|only economy)\b/.test(value)) return "economy";

  return null;
}

function extractDirectOnlyFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (
    /\b(only direct|direct flights only|non[- ]?stop only|non[- ]?stop flights only|no layover|without layover|without layovers|no stops?)\b/.test(
      value
    )
  ) {
    return true;
  }

  if (/\b(with layovers?|allow layovers?|stops are okay|connecting flights are okay)\b/.test(value)) {
    return false;
  }

  return null;
}

function extractBudgetModeFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (/\b(luxury|premium|best experience|high[- ]end)\b/.test(value)) return "luxury";
  if (/\b(cheap|budget|low cost|affordable|cheapest)\b/.test(value)) return "budget";
  if (/\b(balanced|mid range|middle)\b/.test(value)) return "balanced";
  return null;
}

function extractHotelRequiredFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (
    /\b(add hotels?|show hotels?|include hotels?|need hotels?|hotel required|book hotels?|stay included)\b/.test(
      value
    )
  ) {
    return "yes";
  }

  if (
    /\b(no hotels?|without hotels?|skip hotels?|hotel not required|flight only|only flights)\b/.test(value)
  ) {
    return "no";
  }

  return null;
}

function normalizeTripType(value) {
  const input = String(value || "").toLowerCase().trim();
  if (["round_trip", "roundtrip", "round trip", "return"].includes(input)) return "round_trip";
  if (["one_way", "one way", "single", "single trip"].includes(input)) return "one_way";
  return null;
}

function normalizePackageRequired(value) {
  if (typeof value === "boolean") return value ? "yes" : "no";
  const input = String(value || "").toLowerCase().trim();
  if (["yes", "true", "required", "need", "include", "package"].includes(input)) return "yes";
  if (["no", "false", "skip", "not required", "no package"].includes(input)) return "no";
  return null;
}

function extractTripTypeFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (/\b(one[- ]?way|single trip|flight only|only onward)\b/.test(value)) return "one_way";
  if (/\b(round[- ]?trip|return trip|two way|with return|come back|return on|back on)\b/.test(value)) {
    return "round_trip";
  }

  return null;
}

function extractPackageRequiredFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (
    /\b(package|bundle|flight\s*\+\s*hotel|flight and hotel|complete itinerary|full itinerary)\b/.test(
      value
    )
  ) {
    return "yes";
  }

  if (/\b(no package|without package|flights only|only flights|just flight)\b/.test(value)) {
    return "no";
  }

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

  const explicitDirectOnly = extractDirectOnlyFromText(latest);
  if (explicitDirectOnly != null) setSlot(state, "direct_only", explicitDirectOnly, "confirmed");
  else if (preferences.direct) setSlot(state, "direct_only", true, "confirmed");

  const explicitBudgetMode = extractBudgetModeFromText(latest);
  if (explicitBudgetMode) setSlot(state, "budget_mode", explicitBudgetMode, "confirmed");
  else if (preferences.cheap) setSlot(state, "budget_mode", "budget", "confirmed");

  const explicitCabinClass = extractCabinClassFromText(latest);
  if (explicitCabinClass) {
    setSlot(state, "class", explicitCabinClass, "confirmed");
  }

  const explicitTripType = extractTripTypeFromText(latest);
  if (explicitTripType) {
    setSlot(state, "trip_type", explicitTripType, "confirmed");
    if (explicitTripType === "one_way") clearSlot(state, "return_date");
  }

  const explicitPackageRequired = extractPackageRequiredFromText(latest);
  if (explicitPackageRequired) {
    setSlot(state, "package_required", explicitPackageRequired, "confirmed");
  }

  const explicitHotelRequired = extractHotelRequiredFromText(latest);
  if (explicitHotelRequired) setSlot(state, "hotel_required", explicitHotelRequired, "confirmed");
  else if (preferences.hotelIntent) setSlot(state, "hotel_required", "yes", "confirmed");

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
  "trip_type": "one_way"|"round_trip"|null,
  "package_required": "yes"|"no"|null,
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
  const parsedTripType = normalizeTripType(parsedUpdate?.trip_type);
  const parsedPackageRequired = normalizePackageRequired(parsedUpdate?.package_required);
  const klass = normalizeCabinClass(parsedUpdate?.class);
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
  if (parsedTripType) setSlot(next, "trip_type", parsedTripType, "inferred");
  if (parsedPackageRequired) setSlot(next, "package_required", parsedPackageRequired, "inferred");
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

  if (next.return_date && !next.trip_type) {
    setSlot(next, "trip_type", "round_trip", "inferred");
  }

  if (next.trip_type === "one_way") {
    clearSlot(next, "return_date");
    if (next.package_required == null) {
      setSlot(next, "package_required", "no", "inferred");
    }
  }

  // Default stay recommendations for round trips unless user explicitly says no hotels.
  if (next.trip_type === "round_trip" && next.hotel_required !== "no") {
    setSlot(next, "hotel_required", "yes", "inferred");
  }

  if (next.hotel_required === "no") {
    clearSlot(next, "hotel_star_rating");
    clearSlot(next, "hotel_brand");
  }

  return next;
}

function validateState(state) {
  const missing = REQUIRED_FIELDS.filter((field) => !state[field]);

  if (missing.length === 0 && !state.trip_type) {
    missing.push("trip_type");
  }

  if (missing.length === 0 && state.trip_type === "round_trip" && !state.return_date) {
    missing.push("return_date");
  }

  if (missing.length === 0 && state.trip_type === "round_trip" && !state.package_required) {
    missing.push("package_required");
  }

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

  if (field === "trip_type") {
    return "Is this a one-way trip or a round-trip?";
  }

  if (field === "return_date") {
    return "What is your return date? (e.g., next Sunday or YYYY-MM-DD)";
  }

  if (field === "package_required") {
    return "Would you like me to create a complete package (outbound flight + hotel stay + return flight)?";
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

function isLikelyCountryName(value) {
  const normalized = normalizeWhitespace(value || "").toLowerCase();
  if (!normalized) return false;
  return COUNTRY_NAMES.has(normalized);
}

function getCityExamplesForCountry(countryName) {
  const normalized = normalizeWhitespace(countryName || "").toLowerCase();
  const examples = COUNTRY_CITY_EXAMPLES[normalized];
  if (Array.isArray(examples) && examples.length > 0) return examples.join(", ");
  return "a major city";
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

function inferCarrierFromFlightNumbers(flightNumbers) {
  const labels = Array.isArray(flightNumbers) ? flightNumbers : [];

  for (const rawLabel of labels) {
    const label = normalizeWhitespace(rawLabel || "");
    if (!label) continue;

    const nameAndCode = label.match(/^(.*?)\s+([A-Z0-9]{2})\s?\d{1,4}\b/);
    if (nameAndCode?.[2]) {
      const name = normalizeWhitespace(nameAndCode[1] || "") || null;
      const code = nameAndCode[2].toUpperCase();
      return { name, code };
    }

    const codeOnly = label.match(/\b([A-Z0-9]{2})\s?\d{1,4}\b/);
    if (codeOnly?.[1]) {
      return { name: null, code: codeOnly[1].toUpperCase() };
    }
  }

  return { name: null, code: null };
}

function resolveReturnCarrier(retFlight, outboundFlight) {
  const inferred = inferCarrierFromFlightNumbers(retFlight?.flight_numbers || []);
  const retCodeRaw = normalizeWhitespace(retFlight?.airline_iata_code || "").toUpperCase();
  const retCode = retCodeRaw || null;
  const inferredCode = inferred.code || null;
  const codeMismatch = Boolean(inferredCode && retCode && inferredCode !== retCode);

  return {
    airline: inferred.name || retFlight?.airline || outboundFlight?.airline || "Unknown",
    airline_iata_code: inferredCode || retCode,
    airline_logo_url: codeMismatch ? null : retFlight?.airline_logo_url || null,
  };
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

function collectSegmentLabels(segments) {
  return (Array.isArray(segments) ? segments : [])
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

function parseCurrencyCodeFromPrice(price) {
  const value = normalizeWhitespace(price || "");
  if (!value) return "INR";
  const match = value.match(/\b([A-Z]{3})\b/);
  return match?.[1] || "INR";
}

function formatPriceInInr(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `${Math.round(value)} INR`;
}

function getStayNights(state) {
  if (!state?.departure_date || !state?.return_date) return 1;
  const start = new Date(state.departure_date);
  const end = new Date(state.return_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
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

async function fetchSerpFlightsOneWay(origin, destination, departureDate, state) {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    adults: "1",
    currency: "INR",
    hl: "en",
    gl: "in",
    api_key: process.env.SERPAPI_KEY,
  });

  const travelClass = mapCabinClassToSerpValue(state.class);
  if (travelClass) params.set("travel_class", travelClass);

  params.set("type", "2");

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!res.ok) return [];

  const data = await res.json();
  const sourceFlights = data?.best_flights || data?.other_flights || [];

  const normalized = sourceFlights.slice(0, 15).map((flight) => {
    const segments = flight?.flights || [];
    const first = segments[0];
    const last = segments[segments.length - 1];
    const allFlightLabels = collectFlightLabels(flight);
    const outboundFlightLabels = collectSegmentLabels(segments);

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
      trip_type: "one_way",
      duration: duration != null ? formatDurationMinutes(duration) : "N/A",
      duration_value: duration,
      origin: first?.departure_airport?.id || origin,
      destination: last?.arrival_airport?.id || destination,
      departure_time: departureTime,
      arrival_time: last?.arrival_airport?.time || last?.arrival_time || "N/A",
      flight_number: flightNumber,
      flight_numbers: allFlightLabels,
      outbound_flight_numbers: outboundFlightLabels,
      onward_price: priceValue != null ? `${priceValue} INR` : "N/A",
      onward_price_value: priceValue,
      return_price: "N/A",
      return_price_value: null,
      return_airline: null,
      return_airline_iata_code: null,
      return_airline_logo_url: null,
      return_cabin_class: null,
      return_flight_numbers: [],
      return_departure_time: "N/A",
      return_arrival_time: "N/A",
      return_origin: destination,
      return_destination: origin,
      stops,
      stops_label: formatStopsLabel(stops),
    };
  });

  return normalized;
}

async function fetchFlights(origin, destination, state) {
  const outboundRaw = await fetchSerpFlightsOneWay(origin, destination, state.departure_date, state).catch(
    () => []
  );

  let returnRaw = [];
  if (state.return_date) {
    returnRaw = await fetchSerpFlightsOneWay(destination, origin, state.return_date, state).catch(() => []);
  }

  const enrichedOutbound = await enrichFlightsWithDuffel(outboundRaw);
  const enrichedReturn = await enrichFlightsWithDuffel(returnRaw);
  const airlineFiltered = state.airline_brand
    ? enrichedOutbound.filter((flight) => matchesAirlineBrand(flight, state.airline_brand))
    : enrichedOutbound;

  const returnAirlineFiltered =
    state.airline_brand && enrichedReturn.length > 0
      ? enrichedReturn.filter((flight) => matchesAirlineBrand(flight, state.airline_brand))
      : enrichedReturn;

  const ranked = rankFlights(airlineFiltered, state);
  const rankedReturn = rankFlights(returnAirlineFiltered, state);
  if (state.direct_only) {
    const directOnly = ranked.filter((f) => f.stops === 0);
    const baseOutbound = directOnly.length > 0 ? directOnly.slice(0, 5) : ranked.slice(0, 5);
    const returnBase =
      rankedReturn.length > 0
        ? (() => {
            const directReturn = rankedReturn.filter((f) => f.stops === 0);
            return directReturn.length > 0 ? directReturn : rankedReturn;
          })()
        : [];

    const combined = baseOutbound.map((outbound, index) => {
      const ret = returnBase.length > 0 ? returnBase[index % returnBase.length] : null;
      const returnCarrier = resolveReturnCarrier(ret, outbound);
      const onward = outbound.price_value;
      const retPrice = ret?.price_value ?? null;
      const total = Number.isFinite(onward) && Number.isFinite(retPrice) ? onward + retPrice : onward ?? null;

      return {
        ...outbound,
        trip_type: state.return_date ? "round_trip" : "one_way",
        price: total != null ? formatPriceInInr(total) : outbound.price,
        price_value: total != null ? total : outbound.price_value,
        return_price: ret?.price || "N/A",
        return_price_value: retPrice,
        return_airline: returnCarrier.airline,
        return_airline_iata_code: returnCarrier.airline_iata_code,
        return_airline_logo_url: returnCarrier.airline_logo_url,
        return_cabin_class: ret?.cabin_class || outbound.cabin_class || state.class || "economy",
        return_origin: ret?.origin || destination,
        return_destination: ret?.destination || origin,
        return_departure_time: ret?.departure_time || "N/A",
        return_arrival_time: ret?.arrival_time || "N/A",
        return_flight_numbers: ret?.flight_numbers || [],
      };
    });

    if (directOnly.length > 0) {
      return {
        flights: combined,
        direct_only_available: true,
        direct_fallback_used: false,
      };
    }

    return {
      flights: combined,
      direct_only_available: false,
      direct_fallback_used: true,
    };
  }

  const baseOutbound = ranked.slice(0, 5);
  const returnBase = rankedReturn.length > 0 ? rankedReturn : [];
  const combined = baseOutbound.map((outbound, index) => {
    const ret = returnBase.length > 0 ? returnBase[index % returnBase.length] : null;
    const returnCarrier = resolveReturnCarrier(ret, outbound);
    const onward = outbound.price_value;
    const retPrice = ret?.price_value ?? null;
    const total = Number.isFinite(onward) && Number.isFinite(retPrice) ? onward + retPrice : onward ?? null;

    return {
      ...outbound,
      trip_type: state.return_date ? "round_trip" : "one_way",
      price: total != null ? formatPriceInInr(total) : outbound.price,
      price_value: total != null ? total : outbound.price_value,
      return_price: ret?.price || "N/A",
      return_price_value: retPrice,
      return_airline: returnCarrier.airline,
      return_airline_iata_code: returnCarrier.airline_iata_code,
      return_airline_logo_url: returnCarrier.airline_logo_url,
      return_cabin_class: ret?.cabin_class || outbound.cabin_class || state.class || "economy",
      return_origin: ret?.origin || destination,
      return_destination: ret?.destination || origin,
      return_departure_time: ret?.departure_time || "N/A",
      return_arrival_time: ret?.arrival_time || "N/A",
      return_flight_numbers: ret?.flight_numbers || [],
    };
  });

  return {
    flights: combined,
    direct_only_available: null,
    direct_fallback_used: false,
  };
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

function buildPackages(flights, hotels, state) {
  if (!Array.isArray(flights) || !Array.isArray(hotels) || flights.length === 0 || hotels.length === 0) {
    return [];
  }

  const topFlights = flights.slice(0, 3);
  const topHotels = hotels.slice(0, 3);
  const nights = getStayNights(state);
  const packages = [];

  for (let i = 0; i < Math.min(topFlights.length, topHotels.length); i += 1) {
    const flight = topFlights[i];
    const hotel = topHotels[i];
    const onwardPrice = typeof flight?.onward_price_value === "number" ? flight.onward_price_value : null;
    const returnPrice = typeof flight?.return_price_value === "number" ? flight.return_price_value : null;
    const hotelNightly = typeof hotel?.price_value === "number" ? hotel.price_value : null;
    const total =
      onwardPrice != null && returnPrice != null && hotelNightly != null
        ? onwardPrice + returnPrice + hotelNightly * nights
        : null;
    const currency = parseCurrencyCodeFromPrice(flight?.price || hotel?.price || "INR");

    packages.push({
      id: `pkg_${i + 1}`,
      title: i === 0 ? "Best Value Bundle" : i === 1 ? "Comfort Bundle" : "Premium Bundle",
      flight,
      hotel,
      total_price: total != null ? `${Math.round(total)} ${currency}` : "N/A",
      total_price_value: total,
      nights,
      saving_hint:
        i === 0 ? "Balanced on price and quality" : i === 1 ? "Comfort-focused pick" : "Higher comfort option",
    });
  }

  return packages.sort((a, b) => {
    if (a.total_price_value == null && b.total_price_value == null) return 0;
    if (a.total_price_value == null) return 1;
    if (b.total_price_value == null) return -1;
    return a.total_price_value - b.total_price_value;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreToInt(value) {
  return Math.round(clamp(value, 0, 100));
}

function normalizeMetric(values, index, inverse = false) {
  if (!values.length) return 50;
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 50;

  const raw = (values[index] - min) / (max - min);
  const adjusted = inverse ? 1 - raw : raw;
  return scoreToInt(adjusted * 100);
}

function getCabinComfortScore(cabinClass) {
  const normalized = String(cabinClass || "economy").toLowerCase();
  if (normalized === "first") return 95;
  if (normalized === "business") return 80;
  if (normalized === "premium_economy") return 62;
  return 45;
}

function getHotelComfortScore(hotel) {
  const classScore =
    typeof hotel?.hotel_class === "number" ? scoreToInt((hotel.hotel_class / 5) * 100) : null;
  const ratingScore = typeof hotel?.rating === "number" ? scoreToInt((hotel.rating / 5) * 100) : null;

  if (classScore != null && ratingScore != null) return scoreToInt(classScore * 0.55 + ratingScore * 0.45);
  if (classScore != null) return classScore;
  if (ratingScore != null) return ratingScore;
  return 50;
}

function getVibeBaseScore(pkg) {
  const hotel = pkg?.hotel || {};
  const name = normalizeWhitespace(hotel?.name || "").toLowerCase();
  let score = getHotelComfortScore(hotel) * 0.7;

  if (/\b(resort|spa|palace|grand|boutique|heritage)\b/.test(name)) score += 10;
  if (/\b(airport|inn|hostel|motel)\b/.test(name)) score -= 8;

  return scoreToInt(score);
}

function getBudgetAlignmentBonus(state, packageAxes) {
  if (state.budget_mode === "budget") {
    return scoreToInt(packageAxes.price * 0.15);
  }

  if (state.budget_mode === "luxury") {
    return scoreToInt((packageAxes.comfort * 0.08) + (packageAxes.vibe * 0.12));
  }

  return scoreToInt((packageAxes.price + packageAxes.comfort + packageAxes.location) / 30);
}

function getAxisWeights(state) {
  const base = {
    price: 0.3,
    location: 0.25,
    comfort: 0.25,
    vibe: 0.2,
  };

  if (state.budget_mode === "budget") {
    base.price = 0.45;
    base.location = 0.25;
    base.comfort = 0.15;
    base.vibe = 0.15;
  }

  if (state.budget_mode === "luxury") {
    base.price = 0.15;
    base.location = 0.25;
    base.comfort = 0.3;
    base.vibe = 0.3;
  }

  if (state.direct_only) {
    base.location += 0.1;
    base.price = clamp(base.price - 0.05, 0.1, 1);
  }

  const total = base.price + base.location + base.comfort + base.vibe;
  return {
    price: base.price / total,
    location: base.location / total,
    comfort: base.comfort / total,
    vibe: base.vibe / total,
  };
}

function buildDecisionReasoning(primary, state) {
  if (!primary) return "Not enough data to make a package recommendation yet.";

  const axes = primary.scores;
  const entries = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const strongest = entries[0]?.[0] || "price";
  const weakest = entries[entries.length - 1]?.[0] || "vibe";
  const labels = {
    price: "price value",
    location: "location convenience",
    comfort: "comfort",
    vibe: "vibe",
  };

  const preferenceHint =
    state.budget_mode === "budget"
      ? "with a budget-first preference"
      : state.budget_mode === "luxury"
        ? "with a luxury-first preference"
        : "with balanced priorities";

  return `Chosen for the best overall trade-off in ${labels[strongest]} ${preferenceHint}; main compromise is ${labels[weakest]}.`;
}

function buildWhyForYou(primary, fallback, state, confidence) {
  if (!primary) return [];
  const axes = primary.scores;
  const sortedAxes = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const bestAxis = sortedAxes[0]?.[0] || "price";
  const weakAxis = sortedAxes[sortedAxes.length - 1]?.[0] || "vibe";
  const axisLabels = {
    price: "price",
    location: "location convenience",
    comfort: "comfort",
    vibe: "vibe",
  };

  const directHint = state.direct_only
    ? "Direct-flight preference is respected in this pick."
    : "Layovers are allowed to improve overall value when useful.";

  const budgetHint =
    state.budget_mode === "budget"
      ? "The package leans toward lower total trip spend."
      : state.budget_mode === "luxury"
        ? "The package favors comfort and experience quality."
        : "The package balances price, travel convenience, and stay quality.";

  const fallbackHint = fallback
    ? "A fallback is included in case you want a second strong option."
    : "No fallback shown because this recommendation has a clear lead.";

  return [
    `This pick aligns with your trip intent for ${state.source_city} to ${state.destination_city}.`,
    `Best overall trade-off: price ${axes.price}/100, location ${axes.location}/100, comfort ${axes.comfort}/100, vibe ${axes.vibe}/100.`,
    `What you gain: strongest fit on ${axisLabels[bestAxis]}. ${directHint}`,
    `What you compromise: ${axisLabels[weakAxis]} is the weakest axis for this option.`,
    `Decision confidence is ${confidence.label.toLowerCase()} (${confidence.score}/100). ${budgetHint} ${fallbackHint}`,
  ];
}

function buildTradeoffPayload(primary, fallback) {
  if (!primary) return null;

  return {
    axes: { ...primary.scores },
    comparison: fallback
      ? {
          primary: { ...primary.scores, composite: primary.composite_score },
          fallback: { ...fallback.scores, composite: fallback.composite_score },
        }
      : null,
  };
}

function buildDecisionPayload(packages, state, meta = {}) {
  if (!Array.isArray(packages) || packages.length === 0) {
    return {
      decision: null,
      why_for_you: [],
      tradeoff: null,
    };
  }

  const packageWithIndex = packages.map((pkg, index) => ({ ...pkg, _index: index }));
  const prices = packageWithIndex.map((pkg) => pkg.total_price_value ?? Number.MAX_SAFE_INTEGER / 10);
  const locationFriction = packageWithIndex.map((pkg) => {
    const duration = pkg?.flight?.duration_value ?? 1500;
    const stops = Number.isFinite(pkg?.flight?.stops) ? pkg.flight.stops : 2;
    return duration + stops * 120;
  });
  const comfortRaw = packageWithIndex.map((pkg) => {
    return scoreToInt(getCabinComfortScore(pkg?.flight?.cabin_class) * 0.35 + getHotelComfortScore(pkg?.hotel) * 0.65);
  });
  const vibeRaw = packageWithIndex.map((pkg) => getVibeBaseScore(pkg));

  const weights = getAxisWeights(state);
  const scored = packageWithIndex.map((pkg, index) => {
    const scores = {
      price: normalizeMetric(prices, index, true),
      location: normalizeMetric(locationFriction, index, true),
      comfort: normalizeMetric(comfortRaw, index, false),
      vibe: normalizeMetric(vibeRaw, index, false),
    };
    const budgetBonus = getBudgetAlignmentBonus(state, {
      ...scores,
      composite: 0,
    });

    const composite =
      scores.price * weights.price +
      scores.location * weights.location +
      scores.comfort * weights.comfort +
      scores.vibe * weights.vibe +
      budgetBonus * 0.08;

    return {
      package: pkg,
      scores,
      composite_score: scoreToInt(composite),
      data_gaps:
        (pkg?.total_price_value == null ? 1 : 0) +
        (pkg?.flight?.duration_value == null ? 1 : 0) +
        (pkg?.hotel?.rating == null && pkg?.hotel?.hotel_class == null ? 1 : 0),
    };
  });

  const ranked = scored.sort((a, b) => b.composite_score - a.composite_score);
  const primary = ranked[0] || null;
  const secondary = ranked[1] || null;

  const scoreGap = primary && secondary ? primary.composite_score - secondary.composite_score : 20;
  const inventoryDepth = ranked.length;
  const directPenalty = state.direct_only && meta.direct_fallback_used ? 12 : 0;
  const confidenceScore = scoreToInt(
    clamp(
      52 + scoreGap * 1.2 + Math.min(12, inventoryDepth * 4) - (primary?.data_gaps || 0) * 8 - directPenalty,
      25,
      95
    )
  );

  const confidenceLabel =
    confidenceScore >= 78 ? "High" : confidenceScore >= 60 ? "Medium" : "Low";

  const fallback = secondary && (confidenceScore < 72 || inventoryDepth < 3) ? secondary : null;
  const confidence = {
    score: confidenceScore,
    label: confidenceLabel,
    drivers: [
      `score_gap:${scoreGap}`,
      `inventory:${inventoryDepth}`,
      `data_gaps:${primary?.data_gaps || 0}`,
      state.direct_only && meta.direct_fallback_used ? "direct_fallback_penalty" : "no_direct_penalty",
    ],
  };

  const decision = {
    primary_recommendation: primary,
    fallback_recommendation: fallback,
    confidence,
    decision_reasoning: buildDecisionReasoning(primary, state),
  };

  return {
    decision,
    why_for_you: buildWhyForYou(primary, fallback, state, confidence).slice(0, 5),
    tradeoff: buildTradeoffPayload(primary, fallback),
  };
}

function matchesHotelBrand(hotel, requestedBrand) {
  if (!requestedBrand) return true;
  const haystack = simplifyBrandText(hotel?.name || "");
  const needle = simplifyBrandText(requestedBrand);
  if (!haystack || !needle) return true;
  return haystack.includes(needle);
}

function shouldRequestHotels(history, state) {
  if (state.trip_type === "round_trip" && state.hotel_required !== "no") return true;
  if (state.package_required === "yes") return true;
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

function getDefaultCheckoutDate(state) {
  return state.return_date || toISODate(addDays(new Date(state.departure_date), 2)) || "";
}

function dedupeHotels(hotels) {
  const byKey = new Map();

  hotels.forEach((hotel) => {
    if (!hotel?.name) return;
    const key = simplifyBrandText(hotel.name);
    if (!key) return;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, hotel);
      return;
    }

    // Prefer entries with richer data (price + rating + link).
    const score = (item) =>
      (typeof item.price_value === "number" ? 1 : 0) +
      (typeof item.rating === "number" ? 1 : 0) +
      (item.link && item.link !== "#" ? 1 : 0);

    if (score(hotel) > score(existing)) {
      byKey.set(key, hotel);
    }
  });

  return [...byKey.values()];
}

async function fetchHotelsFromSerpApi(state) {
  const params = new URLSearchParams({
    engine: "google_hotels",
    q: `hotels in ${state.destination_city}`,
    check_in_date: state.departure_date,
    check_out_date: getDefaultCheckoutDate(state),
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

  return mapHotels(rawHotels).filter((h) => h.name && h.name !== "Unknown");
}

async function fetchBookingDestination(destinationCity) {
  if (!process.env.RAPIDAPI_KEY) return null;

  const params = new URLSearchParams({ query: destinationCity });
  const res = await withTimeout(
    fetch(`https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?${params.toString()}`, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "booking-com15.p.rapidapi.com",
      },
    }),
    8000
  );

  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const list = Array.isArray(data?.data) ? data.data : [];
  if (list.length === 0) return null;

  const best =
    list.find((item) => item?.search_type === "city") ||
    list.find((item) => item?.dest_type === "city") ||
    list[0];

  if (!best?.dest_id || !best?.search_type) return null;
  return { dest_id: String(best.dest_id), search_type: String(best.search_type) };
}

function mapBookingHotels(rawHotels, nights = 1) {
  if (!Array.isArray(rawHotels)) return [];

  return rawHotels.slice(0, 20).map((entry) => {
    const property = entry?.property || {};
    const name = normalizeWhitespace(property?.name || "");
    const gross = parsePrice(property?.priceBreakdown?.grossPrice?.value);
    const perNight = gross != null ? gross / Math.max(1, nights) : null;
    const currency = normalizeWhitespace(property?.priceBreakdown?.grossPrice?.currency || "INR") || "INR";
    const fallbackLink = name
      ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}`
      : "#";

    return {
      name: name || "Unknown",
      rating: typeof property?.reviewScore === "number" ? property.reviewScore : null,
      hotel_class: parseHotelClass(property?.accuratePropertyClass ?? property?.propertyClass ?? null),
      price: perNight != null ? `${Math.round(perNight)} ${currency}/night` : "N/A",
      price_value: perNight,
      link: property?.url || property?.hotelUrl || fallbackLink,
    };
  });
}

async function fetchHotelsFromBookingApi(state) {
  if (!process.env.RAPIDAPI_KEY) return [];

  const destination = await fetchBookingDestination(state.destination_city).catch(() => null);
  if (!destination) return [];

  const params = new URLSearchParams({
    dest_id: destination.dest_id,
    search_type: destination.search_type,
    arrival_date: state.departure_date,
    departure_date: getDefaultCheckoutDate(state),
    adults: "1",
    children_age: "0,17",
    room_qty: "1",
    page_number: "1",
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "INR",
  });

  const res = await withTimeout(
    fetch(`https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels?${params.toString()}`, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "booking-com15.p.rapidapi.com",
      },
    }),
    10000
  );

  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const hotels = Array.isArray(data?.data?.hotels) ? data.data.hotels : [];

  return mapBookingHotels(hotels, getStayNights(state)).filter((h) => h.name && h.name !== "Unknown");
}

async function fetchHotels(state) {
  const [serpHotelsRaw, bookingHotelsRaw] = await Promise.all([
    fetchHotelsFromSerpApi(state).catch(() => []),
    fetchHotelsFromBookingApi(state).catch(() => []),
  ]);

  const mergedHotels = dedupeHotels([...serpHotelsRaw, ...bookingHotelsRaw]);
  let hotels = mergedHotels;

  if (state.hotel_star_rating) {
    hotels = hotels.filter((h) => meetsHotelStarConstraint(h, state.hotel_star_rating));
  }

  if (state.hotel_brand) {
    hotels = hotels.filter((h) => matchesHotelBrand(h, state.hotel_brand));
  }

  if (hotels.length > 0) {
    return {
      hotels: rankHotels(hotels, state).slice(0, 5),
      hotel_filter_relaxed: false,
      hotel_relax_reason: null,
    };
  }

  // If star filter is too restrictive, keep brand filter and relax only star rating.
  if (state.hotel_star_rating) {
    let relaxed = mergedHotels;
    if (state.hotel_brand) {
      relaxed = relaxed.filter((h) => matchesHotelBrand(h, state.hotel_brand));
    }

    if (relaxed.length > 0) {
      return {
        hotels: rankHotels(relaxed, state).slice(0, 5),
        hotel_filter_relaxed: true,
        hotel_relax_reason: "removed_hotel_star_rating",
      };
    }
  }

  return {
    hotels: [],
    hotel_filter_relaxed: false,
    hotel_relax_reason: null,
  };
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
  if (key === "package_required") return value === "yes" ? "enabled" : "disabled";
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
    "trip_type",
    "package_required",
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
    trip_type: "trip type",
    package_required: "package",
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

    if (isLikelyCountryName(state.source_city) || isLikelyCountryName(state.destination_city)) {
      const countryField = isLikelyCountryName(state.destination_city) ? "destination" : "source";
      const countryValue = countryField === "destination" ? state.destination_city : state.source_city;
      const cityExamples = getCityExamplesForCountry(countryValue);
      const prompt =
        countryField === "destination"
          ? `You entered "${countryValue}" as destination, which is a country. Please share a destination city (for example ${cityExamples}).`
          : `You entered "${countryValue}" as source, which is a country. Please share a source city (for example ${cityExamples}).`;

      return json({
        type: "follow_up",
        intent_detected: intent,
        message: prompt,
        update_summary: updateSummary,
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

    const [flightResult, hotelResult] = await Promise.all([
      fetchFlights(sourceAirport.code, destinationAirport.code, state),
      hotelRequested
        ? fetchHotels(state)
        : Promise.resolve({
            hotels: [],
            hotel_filter_relaxed: false,
            hotel_relax_reason: null,
          }),
    ]);
    const hotels = hotelResult.hotels;
    const packages = buildPackages(flightResult.flights, hotels, state);
    const decisionPayload = buildDecisionPayload(packages, state, {
      direct_fallback_used: flightResult.direct_fallback_used,
    });

    return json({
      type: "result",
      intent_detected: intent,
      update_summary: updateSummary,
      trip: {
        ...state,
        source_airport: sourceAirport.code,
        destination_airport: destinationAirport.code,
      },
      packages,
      best_flights: flightResult.flights,
      hotels,
      decision: decisionPayload.decision,
      why_for_you: decisionPayload.why_for_you,
      tradeoff: decisionPayload.tradeoff,
      state_snapshot: state,
      actions: buildActions(state),
      meta: {
        ranked_by: ["price", "duration", "stops", "hotel_quality"],
        package_requested: state.package_required === "yes",
        hotel_requested: hotelRequested,
        hotel_count: hotels.length,
        package_count: packages.length,
        hotel_filter_relaxed: hotelResult.hotel_filter_relaxed,
        hotel_relax_reason: hotelResult.hotel_relax_reason,
        hotel_star_rating_active: Boolean(state.hotel_star_rating),
        direct_only_requested: state.direct_only,
        direct_only_available: flightResult.direct_only_available,
        direct_fallback_used: flightResult.direct_fallback_used,
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
