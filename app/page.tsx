"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type ApiHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type Flight = {
  airline: string;
  airline_iata_code?: string;
  airline_logo_url?: string | null;
  price: string;
  cabin_class?: string;
  trip_type?: "one_way" | "round_trip";
  duration: string;
  origin: string;
  destination: string;
  stops: number;
  stops_label?: string;
  departure_time?: string;
  arrival_time?: string;
  onward_price?: string;
  onward_price_value?: number | null;
  return_price?: string;
  return_price_value?: number | null;
  return_departure_time?: string;
  return_arrival_time?: string;
  return_origin?: string;
  return_destination?: string;
  flight_number?: string;
  flight_numbers?: string[];
  outbound_flight_numbers?: string[];
  return_flight_numbers?: string[];
};

type Hotel = {
  name: string;
  rating: number | null;
  price: string;
  link: string;
};

type TravelPackage = {
  id: string;
  title: string;
  flight: Flight;
  hotel: Hotel;
  total_price: string;
  nights?: number;
  saving_hint?: string;
};

type TripState = {
  source_city?: string | null;
  destination_city?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  trip_type?: "one_way" | "round_trip" | null;
  package_required?: "yes" | "no" | null;
  class?: string | null;
  airline_brand?: string | null;
  hotel_required?: "yes" | "no" | null;
  hotel_star_rating?: number | null;
  direct_only?: boolean;
  budget_mode?: "budget" | "balanced" | "luxury";
  slot_status?: Record<string, string>;
};

type FollowUpResponse = {
  type: "follow_up";
  message: string;
  missing?: string[];
  collected?: Record<string, unknown>;
  debug?: Record<string, unknown>;
  state_snapshot?: TripState;
  intent_detected?: string;
  update_summary?: string;
  actions?: string[];
};

type ResultResponse = {
  type: "result";
  trip?: Record<string, unknown>;
  packages?: TravelPackage[];
  best_flights?: Flight[];
  hotels?: Hotel[];
  state_snapshot?: TripState;
  intent_detected?: string;
  update_summary?: string;
  actions?: string[];
  meta?: {
    hotel_requested?: boolean;
    hotel_count?: number;
    hotel_filter_relaxed?: boolean;
    hotel_relax_reason?: string | null;
    hotel_star_rating_active?: boolean;
    package_count?: number;
    package_requested?: boolean;
    ranked_by?: string[];
    direct_only_requested?: boolean;
    direct_only_available?: boolean | null;
    direct_fallback_used?: boolean;
  };
};

type ErrorResponse = {
  error?: string;
  details?: string;
  state_snapshot?: TripState;
};

type BotPayload = FollowUpResponse | ResultResponse | ErrorResponse;

type UserChatMessage = {
  role: "user";
  content: string;
};

type BotChatMessage = {
  role: "bot";
  data: BotPayload;
};

type ChatMessage = UserChatMessage | BotChatMessage;
type EditableStateKey =
  | "source_city"
  | "destination_city"
  | "departure_date"
  | "return_date"
  | "trip_type"
  | "package_required"
  | "class"
  | "airline_brand"
  | "hotel_required"
  | "hotel_star_rating"
  | "direct_only"
  | "budget_mode";

const SESSION_STORAGE_KEY = "travel_ai_session_id_v1";
const MESSAGE_STORAGE_PREFIX = "travel_ai_messages_v1";
const STATE_STORAGE_PREFIX = "travel_ai_state_v1";
const HISTORY_PREVIEW_COUNT = 8;

function isFollowUpResponse(data: BotPayload): data is FollowUpResponse {
  return "type" in data && data.type === "follow_up";
}

function isResultResponse(data: BotPayload): data is ResultResponse {
  return "type" in data && data.type === "result";
}

function toTitleCase(value: string): string {
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatStateSummary(state: TripState | null): string {
  if (!state) return "Start by saying where you want to travel.";

  const source = state.source_city || "Source not set";
  const destination = state.destination_city || "Destination not set";
  const date = state.departure_date || "Date not set";
  const tripType = state.trip_type ? toTitleCase(state.trip_type) : "Trip type not set";
  const packageMode =
    state.package_required === "yes" ? "On" : state.package_required === "no" ? "Off" : "Not set";
  const cabin = state.class ? toTitleCase(state.class) : "Economy";
  const airline = state.airline_brand || "Any airline";
  const hotels = state.hotel_required === "yes" ? "On" : "Off";

  return `${source} -> ${destination} | ${date} | ${tripType} | Package: ${packageMode} | ${cabin} | Airline: ${airline} | Hotels: ${hotels}`;
}

function toApiHistory(messages: ChatMessage[]): ApiHistoryMessage[] {
  const history: ApiHistoryMessage[] = [];

  messages.forEach((message) => {
    if (message.role === "user") {
      history.push({ role: "user", content: message.content });
      return;
    }

    if (isFollowUpResponse(message.data) && message.data.message) {
      history.push({ role: "assistant", content: message.data.message });
    }
  });

  return history;
}

function getMessageStorageKey(sessionId: string): string {
  return `${MESSAGE_STORAGE_PREFIX}:${sessionId}`;
}

function getStateStorageKey(sessionId: string): string {
  return `${STATE_STORAGE_PREFIX}:${sessionId}`;
}

function safeParseMessages(value: string | null): ChatMessage[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function safeJsonParseState(value: string | null): TripState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as TripState) : null;
  } catch {
    return null;
  }
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing && existing.trim()) return existing;

  const created = generateSessionId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stateSnapshot, setStateSnapshot] = useState<TripState | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showStateEditor, setShowStateEditor] = useState(false);
  const [isTopShadowVisible, setIsTopShadowVisible] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);
    setMessages(safeParseMessages(sessionStorage.getItem(getMessageStorageKey(sid))));
    setStateSnapshot(safeJsonParseState(sessionStorage.getItem(getStateStorageKey(sid))));
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || !sessionId) return;
    sessionStorage.setItem(getMessageStorageKey(sessionId), JSON.stringify(messages));
  }, [initialized, sessionId, messages]);

  useEffect(() => {
    if (!initialized || !sessionId) return;
    sessionStorage.setItem(getStateStorageKey(sessionId), JSON.stringify(stateSnapshot));
  }, [initialized, sessionId, stateSnapshot]);

  useEffect(() => {
    const onScroll = () => {
      setIsTopShadowVisible(window.scrollY > 6);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const startNewChat = () => {
    if (messages.length > 0) {
      const ok = window.confirm("Start a new chat? This will delete the current conversation.");
      if (!ok) return;
    }

    if (sessionId) {
      sessionStorage.removeItem(getMessageStorageKey(sessionId));
      sessionStorage.removeItem(getStateStorageKey(sessionId));
    }

    const nextSessionId = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    sessionStorage.setItem(getMessageStorageKey(nextSessionId), JSON.stringify([]));
    sessionStorage.setItem(getStateStorageKey(nextSessionId), JSON.stringify(null));

    setSessionId(nextSessionId);
    setMessages([]);
    setStateSnapshot(null);
    setShowFullHistory(false);
    setShowStateEditor(false);
    setInput("");
  };

  const submitTurn = async (text: string, stateOverride?: TripState | null) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !sessionId) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const outboundState = stateOverride ?? stateSnapshot ?? {};
      const params = new URLSearchParams({
        history: JSON.stringify(toApiHistory(nextMessages).slice(-12)),
        session_id: sessionId,
        state: JSON.stringify(outboundState),
      });

      const res = await fetch(`/api/chat?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      const data = (await res.json()) as BotPayload;
      if ("state_snapshot" in data && data.state_snapshot) {
        setStateSnapshot(data.state_snapshot);
      }
      setMessages([...nextMessages, { role: "bot", data }]);
    } catch (error) {
      console.error(error);
      setMessages([
        ...nextMessages,
        {
          role: "bot",
          data: { type: "follow_up", message: "Something went wrong. Please try again." },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    await submitTurn(input.trim());
  };

  const applyQuickAction = async (action: string) => {
    const current = stateSnapshot || {};
    let nextState: TripState | null = null;
    let text = action;

    if (action === "Only direct flights") {
      nextState = { ...current, direct_only: true };
      text = "Show only direct flights";
    } else if (action === "Allow layovers") {
      nextState = { ...current, direct_only: false };
      text = "Allow flights with layovers";
    } else if (action === "Cheaper options") {
      nextState = { ...current, budget_mode: "budget" };
      text = "Show cheaper options";
    } else if (action === "Balanced options") {
      nextState = { ...current, budget_mode: "balanced" };
      text = "Show balanced options";
    } else if (action === "Add hotels") {
      nextState = { ...current, hotel_required: "yes" };
      text = "Include hotels";
    } else if (action === "Remove hotel star filter") {
      nextState = { ...current, hotel_required: "yes", hotel_star_rating: null };
      text = "Remove hotel star rating filter";
    } else if (action === "Compare top 3 flights") {
      text = "Compare top 3 flights";
    }

    if (nextState) setStateSnapshot(nextState);
    await submitTurn(text, nextState);
  };

  const editStateChip = async (key: EditableStateKey) => {
    if (!stateSnapshot) return;
    const next = { ...stateSnapshot };

    if (key === "class") {
      const order: Array<TripState["class"]> = ["economy", "premium_economy", "business", "first"];
      const idx = Math.max(0, order.indexOf(next.class || "economy"));
      next.class = order[(idx + 1) % order.length];
      setStateSnapshot(next);
      await submitTurn(`Set cabin class to ${next.class}`, next);
      return;
    }

    if (key === "trip_type") {
      next.trip_type = next.trip_type === "round_trip" ? "one_way" : "round_trip";
      if (next.trip_type === "one_way") next.return_date = null;
      setStateSnapshot(next);
      await submitTurn(
        next.trip_type === "round_trip" ? "Set trip type to round trip" : "Set trip type to one way",
        next
      );
      return;
    }

    if (key === "package_required") {
      next.package_required = next.package_required === "yes" ? "no" : "yes";
      setStateSnapshot(next);
      await submitTurn(
        next.package_required === "yes" ? "Create a package" : "Do not create a package",
        next
      );
      return;
    }

    if (key === "budget_mode") {
      const order: Array<TripState["budget_mode"]> = ["budget", "balanced", "luxury"];
      const idx = Math.max(0, order.indexOf(next.budget_mode || "balanced"));
      next.budget_mode = order[(idx + 1) % order.length];
      setStateSnapshot(next);
      await submitTurn(`Set budget mode to ${next.budget_mode}`, next);
      return;
    }

    if (key === "direct_only") {
      next.direct_only = !next.direct_only;
      setStateSnapshot(next);
      await submitTurn(next.direct_only ? "Only direct flights" : "Allow layovers", next);
      return;
    }

    if (key === "hotel_required") {
      next.hotel_required = next.hotel_required === "yes" ? "no" : "yes";
      if (next.hotel_required === "no") next.hotel_star_rating = null;
      setStateSnapshot(next);
      await submitTurn(next.hotel_required === "yes" ? "Include hotels" : "Do not include hotels", next);
      return;
    }

    if (key === "hotel_star_rating") {
      const raw = window.prompt(
        "Set hotel star rating (3, 4, 5) or leave blank to clear:",
        next.hotel_star_rating ? String(next.hotel_star_rating) : ""
      );
      if (raw == null) return;

      const value = raw.trim();
      if (!value) {
        next.hotel_star_rating = null;
      } else {
        const num = Number(value);
        if (!Number.isFinite(num)) return;
        next.hotel_star_rating = num;
        next.hotel_required = "yes";
      }

      setStateSnapshot(next);
      await submitTurn(
        next.hotel_star_rating ? `Set hotel rating to ${next.hotel_star_rating} star` : "Remove hotel star filter",
        next
      );
      return;
    }

    const raw = window.prompt(`Update ${toTitleCase(String(key))}:`, String(next[key] || ""));
    if (raw == null) return;

    const value = raw.trim();
    next[key] = value || null;
    setStateSnapshot(next);
    await submitTurn(`Set ${toTitleCase(String(key))} to ${value || "none"}`, next);
  };

  const visibleMessages =
    showFullHistory || messages.length <= HISTORY_PREVIEW_COUNT
      ? messages
      : messages.slice(-HISTORY_PREVIEW_COUNT);

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f1e9dd_0%,#eee1d2_55%,#e6d5cd_100%)] text-[var(--text-primary)] flex flex-col">
      <div
        className={`sticky top-0 z-40 bg-[linear-gradient(90deg,rgba(216,168,161,0.2),rgba(241,233,221,0.92),rgba(45,75,99,0.08))] backdrop-blur-md border-b border-[var(--border-soft)] transition-shadow duration-200 ${
          isTopShadowVisible ? "shadow-[var(--shadow-soft)]" : "shadow-none"
        }`}
      >
        <div className="p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/voyanta_logo.png"
                alt="Voyanta logo"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
              <div className="leading-tight">
                <span className="text-lg font-semibold tracking-wide block">Voyanta</span>
                <span className="brand-script text-xs text-[var(--text-muted)] block -mt-0.5">
                  Worth Exploring
                </span>
              </div>
            </div>
            <button
              onClick={startNewChat}
              className="text-sm bg-[linear-gradient(135deg,#f2d8d4,#eac8c4)] border border-[#d7b3ad] rounded-xl px-3 py-2 hover:brightness-95"
            >
              New Chat
            </button>
          </div>
        </div>

        {stateSnapshot && (
          <div className="px-4 py-3 border-t border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.58))]">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-[var(--text-secondary)]">{formatStateSummary(stateSnapshot)}</p>
                <button
                  onClick={() => setShowStateEditor((prev) => !prev)}
                  className="text-xs bg-[linear-gradient(135deg,#f2ddd8,#ecd0ca)] border border-[#d7b3ad] rounded-full px-3 py-1 hover:brightness-95 shrink-0"
                >
                  {showStateEditor ? "Hide Edit" : "Edit"}
                </button>
              </div>

              {showStateEditor && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    ["source_city", stateSnapshot.source_city || "Source not set"],
                    ["destination_city", stateSnapshot.destination_city || "Destination not set"],
                    ["departure_date", stateSnapshot.departure_date || "Date not set"],
                    ["return_date", stateSnapshot.return_date || "Not set"],
                    ["trip_type", stateSnapshot.trip_type || "not set"],
                    ["package_required", stateSnapshot.package_required || "not set"],
                    ["class", stateSnapshot.class || "economy"],
                    ["airline_brand", stateSnapshot.airline_brand || "any airline"],
                    ["hotel_required", stateSnapshot.hotel_required || "no"],
                    [
                      "hotel_star_rating",
                      stateSnapshot.hotel_star_rating ? `${stateSnapshot.hotel_star_rating} star` : "Any hotel rating",
                    ],
                    ["direct_only", stateSnapshot.direct_only ? "Direct only" : "Layovers allowed"],
                    ["budget_mode", stateSnapshot.budget_mode || "balanced"],
                  ].map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        void editStateChip(key as EditableStateKey);
                      }}
                      className="text-xs bg-[linear-gradient(135deg,#f7f1e8,#f2e6d8)] border border-[var(--border-soft)] rounded-full px-3 py-1 hover:bg-[#f0d8d2]"
                    >
                      {toTitleCase(String(key))}: {String(value)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-36 space-y-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && !loading && (
          <div className="min-h-[48vh] flex items-center justify-center">
            <div className="max-w-xl w-full bg-[linear-gradient(160deg,rgba(255,255,255,0.84),rgba(252,243,235,0.92))] border border-[#dcbfaf] rounded-2xl p-6 shadow-[0_10px_26px_rgba(106,78,57,0.16)]">
              <p className="text-xl font-semibold mb-2">Hey, I am Voyanta.</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Tell me where you want to go.
                <br />
                I will plan the smartest trip for you: flights, hotels, everything.
              </p>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">Try something like:</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>- Bangalore to Dubai next month</li>
                <li>- Cheap trip to Thailand</li>
                <li>- Luxury Paris vacation</li>
              </ul>
            </div>
          </div>
        )}

        {messages.length > HISTORY_PREVIEW_COUNT && (
          <div className="text-center">
            <button
              onClick={() => setShowFullHistory((prev) => !prev)}
              className="text-xs text-[var(--text-secondary)] underline"
            >
              {showFullHistory ? "Hide older messages" : "Show older messages"}
            </button>
          </div>
        )}

        {visibleMessages.map((message, index) => {
          const messageKey =
            message.role === "user"
              ? `u-${index}-${message.content}`
              : `b-${index}-${JSON.stringify(message.data).slice(0, 80)}`;

          return (
            <div key={messageKey}>
              {message.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-white text-black px-4 py-2 rounded-2xl max-w-md">{message.content}</div>
                </div>
              )}

              {message.role === "bot" && (
                <div className="flex justify-start">
                  <div className="bg-[linear-gradient(160deg,rgba(255,255,255,0.8),rgba(253,244,238,0.86))] backdrop-blur border border-[#ddc2b4] p-4 rounded-2xl w-full shadow-[0_8px_20px_rgba(106,78,57,0.12)]">
                    {isFollowUpResponse(message.data) && (
                      <div className="bg-[linear-gradient(160deg,#fbf6ef,#f7eee5)] border border-[#dfc9bc] text-[var(--text-primary)] p-3 rounded-xl">
                        {message.data.update_summary && (
                          <p className="text-xs mb-1 text-[var(--text-secondary)]">{message.data.update_summary}</p>
                        )}
                        <p>{message.data.message}</p>
                        {message.data.debug && (
                          <p className="text-xs mt-2 text-[var(--text-secondary)]">
                            Debug: {JSON.stringify(message.data.debug)}
                          </p>
                        )}
                      </div>
                    )}

                    {isResultResponse(message.data) && (
                      <>
                        {message.data.update_summary && (
                          <p className="text-xs text-[var(--text-secondary)] mb-3">{message.data.update_summary}</p>
                        )}

                        {message.data.meta?.package_requested &&
                          (message.data.packages || []).length > 0 &&
                          (() => {
                            const pkg = (message.data.packages || [])[0];
                            if (!pkg) return null;

                            return (
                              <div className="mb-4">
                                <p className="font-semibold mb-2">Your Package</p>
                                <p className="text-sm text-[var(--text-secondary)] mb-2">{pkg.saving_hint || ""}</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  This package is selected by combining a high-ranked onward flight, a strong hotel
                                  value, and a feasible return option.
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mb-2">
                                  It balances total trip cost and travel convenience for your chosen dates.
                                </p>
                                {pkg.nights && (
                                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                                    Stay duration: {pkg.nights} night(s)
                                  </p>
                                )}

                                <div className="space-y-2">
                                  <div className="bg-[linear-gradient(160deg,#f4fbf3,#edf7ea)] p-3 rounded-lg border border-[#cfe2c8]">
                                    <p className="font-semibold mb-1">1. Ongoing Flight</p>
                                    <div className="flex items-center gap-2">
                                      {pkg.flight.airline_logo_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={pkg.flight.airline_logo_url}
                                          alt={`${pkg.flight.airline} logo`}
                                          width={18}
                                          height={18}
                                          className="rounded-sm object-contain"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <p className="font-semibold">
                                        {pkg.flight.airline}
                                        {pkg.flight.airline_iata_code ? ` (${pkg.flight.airline_iata_code})` : ""}
                                      </p>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      {pkg.flight.origin} -&gt; {pkg.flight.destination} | {pkg.flight.duration}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Cabin: {toTitleCase((pkg.flight.cabin_class || "economy").toLowerCase())}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      {pkg.flight.stops_label ||
                                        `${pkg.flight.stops} stop${pkg.flight.stops === 1 ? "" : "s"}`}{" "}
                                      | Departs: {pkg.flight.departure_time || "N/A"}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Flights:{" "}
                                      {Array.isArray(pkg.flight.outbound_flight_numbers) &&
                                      pkg.flight.outbound_flight_numbers.length > 0
                                        ? pkg.flight.outbound_flight_numbers.join(", ")
                                        : pkg.flight.flight_number || "N/A"}
                                    </p>
                                    <p className="font-semibold">{pkg.flight.onward_price || pkg.flight.price}</p>
                                  </div>

                                  <div className="bg-[linear-gradient(160deg,#fbf6ef,#f7eee5)] p-3 rounded-lg border border-[#dfc9bc]">
                                    <p className="font-semibold mb-1">2. Hotel Stay</p>
                                    <p className="font-semibold">{pkg.hotel.name}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Rating: {pkg.hotel.rating ?? "N/A"}
                                    </p>
                                    <p className="font-semibold">{pkg.hotel.price}</p>
                                    <a
                                      href={pkg.hotel.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--accent-navy)] text-sm"
                                    >
                                      View
                                    </a>
                                  </div>

                                  <div className="bg-[linear-gradient(160deg,#f4fbf3,#edf7ea)] p-3 rounded-lg border border-[#cfe2c8]">
                                    <p className="font-semibold mb-1">3. Returning Flight</p>
                                    <div className="flex items-center gap-2">
                                      {pkg.flight.airline_logo_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={pkg.flight.airline_logo_url}
                                          alt={`${pkg.flight.airline} logo`}
                                          width={18}
                                          height={18}
                                          className="rounded-sm object-contain"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <p className="font-semibold">
                                        {pkg.flight.airline}
                                        {pkg.flight.airline_iata_code ? ` (${pkg.flight.airline_iata_code})` : ""}
                                      </p>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      {pkg.flight.return_origin || pkg.flight.destination} -&gt;{" "}
                                      {pkg.flight.return_destination || pkg.flight.origin}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Departs: {pkg.flight.return_departure_time || "N/A"} | Arrives:{" "}
                                      {pkg.flight.return_arrival_time || "N/A"}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Flights:{" "}
                                      {Array.isArray(pkg.flight.return_flight_numbers) &&
                                      pkg.flight.return_flight_numbers.length > 0
                                        ? pkg.flight.return_flight_numbers.join(", ")
                                        : "N/A"}
                                    </p>
                                    <p className="font-semibold">{pkg.flight.return_price || "N/A"}</p>
                                  </div>
                                </div>

                                <p className="font-semibold mt-2">Package Total: {pkg.total_price}</p>
                              </div>
                            );
                          })()}

                        {!message.data.meta?.package_requested && (message.data.packages || []).length > 0 && (
                          <div className="mb-4">
                            <p className="font-semibold mb-2">Bundles</p>
                            <div className="space-y-2">
                              {(message.data.packages || []).slice(0, 3).map((pkg, i) => (
                                <div
                                  key={pkg.id || i}
                                  className="bg-[linear-gradient(160deg,#f5f8ff,#eef3ff)] p-3 rounded-lg border border-[#cfd8f1]"
                                >
                                  <p className="font-semibold">{pkg.title}</p>
                                  <p className="text-sm text-[var(--text-secondary)]">
                                    Flight: {pkg.flight.airline} | Hotel: {pkg.hotel.name}
                                  </p>
                                  <p className="text-sm text-[var(--text-secondary)]">{pkg.saving_hint || ""}</p>
                                  <p className="font-semibold">Total: {pkg.total_price}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!message.data.meta?.package_requested && <div className="mb-4">
                          <p className="font-semibold mb-2">Flights</p>
                          {message.data.meta?.direct_fallback_used && (
                            <p className="mb-2 text-sm text-[var(--text-secondary)]">
                              No direct flights are available for this route/date. Showing next best options with
                              stops.
                            </p>
                          )}
                          <div className="space-y-2">
                            {(message.data.best_flights || []).slice(0, 3).map((flight, i) => (
                              <div
                                key={i}
                                className={`relative p-3 rounded-lg border ${
                                  i === 0
                                    ? "bg-[linear-gradient(160deg,#f4fbf3,#edf7ea)] border-[#cfe2c8]"
                                    : "bg-[linear-gradient(160deg,#fbf6ef,#f7eee5)] border-[#dfc9bc]"
                                }`}
                              >
                                {flight.trip_type === "round_trip" && (
                                  <div className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-white/80 border border-[#dfc9bc] p-1">
                                    <Image
                                      src="/round-trip-icon.svg"
                                      alt="Round trip"
                                      width={14}
                                      height={14}
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  {flight.airline_logo_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={flight.airline_logo_url}
                                      alt={`${flight.airline} logo`}
                                      width={18}
                                      height={18}
                                      className="rounded-sm object-contain"
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <p className="font-semibold">
                                    {flight.airline}
                                    {flight.airline_iata_code ? ` (${flight.airline_iata_code})` : ""}
                                  </p>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {flight.origin} -&gt; {flight.destination} | {flight.duration}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  Cabin: {toTitleCase((flight.cabin_class || "economy").toLowerCase())}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {flight.stops_label || `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`} | Departs: {flight.departure_time || "N/A"}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  Flights:{" "}
                                  {Array.isArray(flight.flight_numbers) && flight.flight_numbers.length > 0
                                    ? flight.flight_numbers.join(", ")
                                    : flight.flight_number || "N/A"}
                                </p>
                                {flight.trip_type === "round_trip" && (
                                  <>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Return: {flight.return_origin || flight.destination} -&gt;{" "}
                                      {flight.return_destination || flight.origin} | Departs:{" "}
                                      {flight.return_departure_time || "N/A"}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      Return flights:{" "}
                                      {Array.isArray(flight.return_flight_numbers) &&
                                      flight.return_flight_numbers.length > 0
                                        ? flight.return_flight_numbers.join(", ")
                                        : "N/A"}
                                    </p>
                                  </>
                                )}
                                <p className="font-semibold">{flight.price}</p>
                              </div>
                            ))}
                          </div>
                        </div>}

                        {!message.data.meta?.package_requested && (message.data.hotels || []).length > 0 && (
                          <div>
                            <p className="font-semibold mb-2">Hotels</p>
                            {message.data.meta?.hotel_filter_relaxed && (
                              <p className="mb-2 text-sm text-[var(--text-secondary)]">
                                No hotels matched your current star filter, so these are next best options without that
                                star constraint.
                              </p>
                            )}
                            <div className="space-y-2">
                              {(message.data.hotels || []).slice(0, 3).map((hotel, i) => (
                                <div key={i} className="bg-[linear-gradient(160deg,#fbf6ef,#f7eee5)] p-3 rounded-lg border border-[#dfc9bc]">
                                  <p className="font-semibold">{hotel.name}</p>
                                  <p className="text-sm text-[var(--text-secondary)]">Rating: {hotel.rating ?? "N/A"}</p>
                                  <p className="font-semibold">{hotel.price}</p>
                                  <a
                                    href={hotel.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[var(--accent-navy)] text-sm"
                                  >
                                    View
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!message.data.meta?.package_requested &&
                          message.data.meta?.hotel_requested &&
                          (message.data.hotels || []).length === 0 && (
                          <div className="mt-2 text-sm text-[var(--text-secondary)]">
                            No hotel matches found for the current filters.
                            {message.data.meta?.hotel_star_rating_active
                              ? " Try removing the hotel star filter."
                              : " Try asking for budget hotels or clearing brand constraints."}
                          </div>
                        )}

                        {Array.isArray(message.data.actions) && message.data.actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.data.actions.slice(0, 4).map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  void applyQuickAction(action);
                                }}
                                className="text-xs bg-[linear-gradient(135deg,#f2ddd8,#ecd0ca)] border border-[#d7b3ad] rounded-full px-3 py-1 hover:brightness-95"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && <div className="text-[var(--text-muted)] animate-pulse">Thinking...</div>}
      </div>

      <div className="sticky bottom-0 p-4 border-t border-[var(--border-soft)] bg-[linear-gradient(90deg,rgba(241,233,221,0.95),rgba(243,230,219,0.97),rgba(236,218,210,0.95))] backdrop-blur-md">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 p-3 rounded-xl bg-white/90 border border-[#dcbfaf] outline-none focus:border-[#d3a8a0]"
            placeholder="Ask your travel plan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void sendMessage();
              }
            }}
          />
          <button
            onClick={() => {
              void sendMessage();
            }}
            disabled={loading || !sessionId}
            className="bg-[linear-gradient(135deg,#f2d8d4,#eac8c4)] text-[var(--text-primary)] px-4 rounded-xl border border-[#d7b3ad] hover:brightness-95 disabled:opacity-60"
          >
            Send
          </button>
        </div>
        <p className="max-w-3xl mx-auto mt-2 text-[11px] text-[var(--text-muted)]">
          Ask naturally: &quot;only direct&quot;, &quot;add hotels&quot;, &quot;switch to business&quot;, &quot;cheaper options&quot;.
        </p>
      </div>
    </div>
  );
}
