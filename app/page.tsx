"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/nomad/AppHeader";
import { ActionChips } from "@/components/nomad/ActionChips";
import { AssistantBubble } from "@/components/nomad/AssistantBubble";
import { BestPickCard } from "@/components/nomad/BestPickCard";
import { BundleCards } from "@/components/nomad/BundleCards";
import { Composer } from "@/components/nomad/Composer";
import { FlightSegmentCard } from "@/components/nomad/FlightSegmentCard";
import { HotelCard } from "@/components/nomad/HotelCard";
import { PackageRecapCard } from "@/components/nomad/PackageRecapCard";
import { TripContextBar } from "@/components/nomad/TripContextBar";
import { UserBubble } from "@/components/nomad/UserBubble";

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
  return_airline?: string | null;
  return_airline_iata_code?: string | null;
  return_airline_logo_url?: string | null;
  return_cabin_class?: string | null;
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
  image_url?: string | null;
};

type TravelPackage = {
  id: string;
  title: string;
  flight: Flight;
  hotel: Hotel;
  total_price: string;
  total_price_value?: number | null;
  nights?: number;
  saving_hint?: string;
};

type TradeoffScores = {
  price: number;
  location: number;
  comfort: number;
  vibe: number;
};

type ScoredRecommendation = {
  package: TravelPackage;
  scores: TradeoffScores;
  composite_score: number;
  data_gaps?: number;
};

type DecisionPayload = {
  primary_recommendation?: ScoredRecommendation | null;
  fallback_recommendation?: ScoredRecommendation | null;
  confidence?: {
    score: number;
    label: string;
    drivers?: string[];
  };
  decision_reasoning?: string;
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
  decision?: DecisionPayload | null;
  why_for_you?: string[];
  tradeoff?: {
    axes?: TradeoffScores;
    comparison?: {
      primary?: TradeoffScores & { composite?: number };
      fallback?: TradeoffScores & { composite?: number };
    } | null;
  } | null;
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

const UI_SCHEMA_VERSION = "v2";
const SESSION_STORAGE_KEY = `travel_ai_session_id_${UI_SCHEMA_VERSION}`;
const MESSAGE_STORAGE_PREFIX = `travel_ai_messages_${UI_SCHEMA_VERSION}`;
const STATE_STORAGE_PREFIX = `travel_ai_state_${UI_SCHEMA_VERSION}`;
const HISTORY_PREVIEW_COUNT = 8;
const COMPOSER_SUGGESTIONS = [
  "Only direct flights",
  "Add hotels",
  "Switch to business",
  "Cheaper options",
  "Compare top 3 flights",
  "Remove hotel star filter",
];

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

  const contextOrigin = stateSnapshot?.source_city || "Source";
  const contextDestination = stateSnapshot?.destination_city || "Destination";
  const contextDepartDate = stateSnapshot?.departure_date || "Date";
  const contextReturnDate = stateSnapshot?.return_date || null;
  const contextCabin = toTitleCase((stateSnapshot?.class || "economy").toLowerCase());
  const contextPackageOn = stateSnapshot?.package_required === "yes";
  const contextHotelsOn = stateSnapshot?.hotel_required === "yes";

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-mesh" />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px] opacity-40 blur-3xl"
        style={{ backgroundImage: "url(/hero-gradient.jpg)", backgroundSize: "cover" }}
        aria-hidden
      />
      <AppHeader onNewChat={startNewChat} showShadow={isTopShadowVisible} />

      {stateSnapshot && (
        <TripContextBar
          origin={contextOrigin}
          destination={contextDestination}
          departDate={contextDepartDate}
          returnDate={contextReturnDate}
          cabin={contextCabin}
          packageOn={contextPackageOn}
          hotelsOn={contextHotelsOn}
          showEditor={showStateEditor}
          onToggleEditor={() => setShowStateEditor((prev) => !prev)}
        >
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
              className="chip"
            >
              {toTitleCase(String(key))}: {String(value)}
            </button>
          ))}
        </TripContextBar>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5 pb-44 sm:px-6 sm:py-6 sm:pb-40">
        {messages.length === 0 && !loading && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <AssistantBubble>
              <p className="mb-2 font-display text-xl font-medium">
                Hey, I am Nomad. <span className="text-gradient-sunset">Where to next?</span>
              </p>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                Tell me where you want to go and I will plan flights, hotels, and package options.
              </p>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Try something like:</p>
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                <li>- Bangalore to Dubai next month</li>
                <li>- Cheap trip to Thailand</li>
                <li>- Luxury Paris vacation</li>
              </ul>
            </AssistantBubble>
          </div>
        )}

        {messages.length > HISTORY_PREVIEW_COUNT && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowFullHistory((prev) => !prev)}
              className="text-xs text-[var(--text-secondary)] underline"
              aria-expanded={showFullHistory}
              aria-label={showFullHistory ? "Hide older messages" : "Show older messages"}
            >
              {showFullHistory ? "Hide older messages" : "Show older messages"}
            </button>
          </div>
        )}

        <section aria-label="Conversation" role="log" aria-live="polite" aria-relevant="additions text">
          {visibleMessages.map((message, index) => {
          const messageKey =
            message.role === "user"
              ? `u-${index}-${message.content}`
              : `b-${index}-${JSON.stringify(message.data).slice(0, 80)}`;
          const resultPayload =
            message.role === "bot" && isResultResponse(message.data) ? message.data : null;
          const primaryRecommendation = resultPayload?.decision?.primary_recommendation || null;
          const fallbackRecommendation = resultPayload?.decision?.fallback_recommendation || null;
          const tradeoffAxes = resultPayload?.tradeoff?.axes || null;
          const whyForYou = (resultPayload?.why_for_you || []).slice(0, 3);

            return (
            <div key={messageKey} className="mb-5 last:mb-0">
              {message.role === "user" && (
                <UserBubble text={message.content} />
              )}

              {message.role === "bot" && (
                <AssistantBubble variant="card">
                    {isFollowUpResponse(message.data) && (
                      <div className="rounded-xl border border-[#dfc9bc] bg-[#f5efe6] p-3 text-[#2d3345]">
                        {message.data.update_summary && (
                          <p className="mb-1 text-xs text-[#6a7691]">{message.data.update_summary}</p>
                        )}
                        <p className="text-[15px] leading-snug text-[#2d3345] sm:text-[17px]">{message.data.message}</p>
                        {message.data.debug && (
                          <p className="mt-2 text-xs text-[#6a7691]">
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

                        {primaryRecommendation && (
                          <BestPickCard
                            title={primaryRecommendation.package.title}
                            flight={primaryRecommendation.package.flight.airline}
                            hotel={primaryRecommendation.package.hotel.name}
                            total={primaryRecommendation.package.total_price}
                            destination={resultPayload?.state_snapshot?.destination_city || null}
                            decisionReasoning={message.data.decision?.decision_reasoning}
                            confidence={message.data.decision?.confidence || null}
                            whyForYou={whyForYou}
                            tradeoffAxes={tradeoffAxes}
                            fallback={
                              fallbackRecommendation
                                ? {
                                    title: fallbackRecommendation.package.title,
                                    flight: fallbackRecommendation.package.flight.airline,
                                    hotel: fallbackRecommendation.package.hotel.name,
                                    total: fallbackRecommendation.package.total_price,
                                  }
                                : null
                            }
                          />
                        )}

                        <div className={primaryRecommendation ? "opacity-75" : ""}>
                        {primaryRecommendation && (
                          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Supporting options
                          </p>
                        )}

                        {message.data.meta?.package_requested &&
                          (message.data.packages || []).length > 0 &&
                          (() => {
                            const pkg = (message.data.packages || [])[0];
                            if (!pkg) return null;

                            return (
                              <div className="space-y-4">
                                <FlightSegmentCard
                                  step={1}
                                  label="Ongoing Flight"
                                  airline={pkg.flight.airline}
                                  airlineCode={pkg.flight.airline_iata_code}
                                  airlineLogoUrl={pkg.flight.airline_logo_url}
                                  from={pkg.flight.origin}
                                  to={pkg.flight.destination}
                                  duration={pkg.flight.duration}
                                  cabin={toTitleCase((pkg.flight.cabin_class || "economy").toLowerCase())}
                                  stopsText={
                                    pkg.flight.stops_label ||
                                    `${pkg.flight.stops} stop${pkg.flight.stops === 1 ? "" : "s"}`
                                  }
                                  depart={pkg.flight.departure_time || "N/A"}
                                  flightsText={
                                    Array.isArray(pkg.flight.outbound_flight_numbers) &&
                                    pkg.flight.outbound_flight_numbers.length > 0
                                      ? pkg.flight.outbound_flight_numbers.join(", ")
                                      : pkg.flight.flight_number || "N/A"
                                  }
                                  price={pkg.flight.onward_price || pkg.flight.price}
                                  variant="success"
                                />

                                <HotelCard
                                  step={2}
                                  title="Hotel Stay"
                                  name={pkg.hotel.name}
                                  rating={pkg.hotel.rating}
                                  price={pkg.hotel.price}
                                  link={pkg.hotel.link}
                                  location={resultPayload?.state_snapshot?.destination_city || null}
                                  nights={pkg.nights}
                                  destination={resultPayload?.state_snapshot?.destination_city || null}
                                  imageUrl={pkg.hotel.image_url || null}
                                />

                                <FlightSegmentCard
                                  step={3}
                                  label="Returning Flight"
                                  airline={pkg.flight.return_airline || pkg.flight.airline}
                                  airlineCode={pkg.flight.return_airline_iata_code || pkg.flight.airline_iata_code}
                                  airlineLogoUrl={pkg.flight.return_airline_logo_url || pkg.flight.airline_logo_url}
                                  from={pkg.flight.return_origin || pkg.flight.destination}
                                  to={pkg.flight.return_destination || pkg.flight.origin}
                                  cabin={toTitleCase(
                                    (pkg.flight.return_cabin_class || pkg.flight.cabin_class || "economy").toLowerCase()
                                  )}
                                  depart={pkg.flight.return_departure_time || "N/A"}
                                  arrive={pkg.flight.return_arrival_time || "N/A"}
                                  flightsText={
                                    Array.isArray(pkg.flight.return_flight_numbers) &&
                                    pkg.flight.return_flight_numbers.length > 0
                                      ? pkg.flight.return_flight_numbers.join(", ")
                                      : "N/A"
                                  }
                                  price={pkg.flight.return_price || "N/A"}
                                  variant="success"
                                />
                                <PackageRecapCard
                                  total={pkg.total_price}
                                  nights={pkg.nights}
                                  savingHint={pkg.saving_hint || undefined}
                                  summary={message.data.decision?.decision_reasoning}
                                />
                              </div>
                            );
                          })()}

                        {message.data.meta?.package_requested &&
                          (message.data.packages || []).length === 0 && (
                          <div className="rounded-xl border border-[#dfc9bc] bg-[#f5efe6] p-3 text-[#2d3345]">
                            <p className="text-[15px] leading-snug sm:text-[17px]">
                              I could not build a complete package with current filters. Try allowing layovers,
                              removing hotel filters, or changing dates.
                            </p>
                          </div>
                        )}

                        {!message.data.meta?.package_requested && (message.data.packages || []).length > 0 && (
                          <BundleCards items={message.data.packages || []} />
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
                              <FlightSegmentCard
                                key={i}
                                airline={flight.airline}
                                airlineCode={flight.airline_iata_code}
                                airlineLogoUrl={flight.airline_logo_url}
                                from={flight.origin}
                                to={flight.destination}
                                duration={flight.duration}
                                cabin={toTitleCase((flight.cabin_class || "economy").toLowerCase())}
                                stopsText={
                                  flight.stops_label ||
                                  `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`
                                }
                                depart={flight.departure_time || "N/A"}
                                flightsText={
                                  Array.isArray(flight.flight_numbers) && flight.flight_numbers.length > 0
                                    ? flight.flight_numbers.join(", ")
                                    : flight.flight_number || "N/A"
                                }
                                returnText={
                                  flight.trip_type === "round_trip"
                                    ? `${flight.return_origin || flight.destination} -> ${
                                        flight.return_destination || flight.origin
                                      } | Departs: ${flight.return_departure_time || "N/A"}`
                                    : undefined
                                }
                                returnFlightsText={
                                  flight.trip_type === "round_trip"
                                    ? Array.isArray(flight.return_flight_numbers) &&
                                      flight.return_flight_numbers.length > 0
                                      ? flight.return_flight_numbers.join(", ")
                                      : "N/A"
                                    : undefined
                                }
                                showRoundTripBadge={flight.trip_type === "round_trip"}
                                price={flight.price}
                                variant={i === 0 ? "success" : "neutral"}
                              />
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
                                <HotelCard
                                  key={i}
                                  name={hotel.name}
                                  rating={hotel.rating}
                                  price={hotel.price}
                                  link={hotel.link}
                                  location={resultPayload?.state_snapshot?.destination_city || null}
                                  destination={resultPayload?.state_snapshot?.destination_city || null}
                                  imageUrl={hotel.image_url || null}
                                />
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
                          <ActionChips
                            items={message.data.actions}
                            onAction={(action) => {
                              void applyQuickAction(action);
                            }}
                          />
                        )}
                        </div>
                      </>
                    )}
                </AssistantBubble>
              )}
            </div>
            );
          })}
        </section>

        {loading && (
          <div
            className="inline-flex rounded-full border border-[var(--border-soft)] bg-white/75 px-3 py-1 text-xs text-[var(--text-muted)] animate-pulse"
            role="status"
            aria-live="polite"
          >
            Thinking...
          </div>
        )}
      </main>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => {
          void sendMessage();
        }}
        onSuggestion={(suggestion) => {
          void applyQuickAction(suggestion);
        }}
        suggestions={COMPOSER_SUGGESTIONS}
        disabled={loading || !sessionId}
      />
    </div>
  );
}
