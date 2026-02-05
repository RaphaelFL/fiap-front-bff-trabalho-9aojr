import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { fallbackWords } from "./fallbackWords";

function normalizeToSlides(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.answer)
          ? payload.answer
          : [];

  if (!Array.isArray(raw)) return [];

  return raw.map((item, i) => ({
    id: item?.id ?? `${item?.word ?? "w"}-${i}`,
    word: item?.word ?? `Item ${i + 1}`,
    description: item?.description ?? "",
    useCase: item?.useCase ?? "",
  }));
}

function clampIndex(i, len) {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function normalizeAskUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";

  const base = trimmed.split("?")[0].replace(/\/+$/, "");
  if (base.endsWith("/ask")) return base;
  return `${base}/ask`;
}

function buildAskUrlsFromEnv() {
  const primary = (import.meta.env.VITE_BFF_ASK_URL || "").trim();
  const alt = (import.meta.env.VITE_BFF_ASK_URL_ALT || "").trim();

  const parts = [primary, alt]
    .filter(Boolean)
    .map(normalizeAskUrl)
    .filter(Boolean);

  return Array.from(new Set(parts));
}

export default function App() {
  const didFetchRef = useRef(false);
  const askUrls = buildAskUrlsFromEnv();

  const [rawResponse, setRawResponse] = useState(fallbackWords);
  const [source, setSource] = useState("local");
  const [apiUsed, setApiUsed] = useState("");
  const [loading, setLoading] = useState(true);

  const slides = useMemo(() => normalizeToSlides(rawResponse), [rawResponse]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((prev) => clampIndex(prev, slides.length));
  }, [slides.length]);

  async function tryUrl(url) {
    if (!url) return null;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const normalized = normalizeToSlides(data);
    if (!normalized.length) return null;

    return { url, data };
  }

  async function fetchSlides() {
    const primary = askUrls[0] || "";
    const alt = askUrls[1] || "";

    try {
      // 1) tenta PRIMARY
      if (primary) {
        const first = await tryUrl(primary);
        if (first) {
          setRawResponse(first.data);
          setActive(0);
          setSource("remote");
          setApiUsed(first.url);
          return;
        }
      }

      // 2) tenta ALT
      if (alt) {
        const second = await tryUrl(alt);
        if (second) {
          setRawResponse(second.data);
          setActive(0);
          setSource("remote");
          setApiUsed(second.url);
          return;
        }
      }

      // 3) fallback local SOMENTE depois das tentativas
      setRawResponse(fallbackWords);
      setActive(0);
      setSource("local");
      setApiUsed("");
    } catch {
      // erro geral => fallback local
      setRawResponse(fallbackWords);
      setActive(0);
      setSource("local");
      setApiUsed("");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchSlides();
  }, []);

  function next() {
    setActive((i) => clampIndex(i + 1, slides.length));
  }

  function prev() {
    setActive((i) => clampIndex(i - 1, slides.length));
  }

  const current = slides[active] ?? null;

  return (
    <div className="app">
      {/* TÍTULO DO PRINT */}
      <div className="hero">
        <h1>Word Mastery</h1>
        <p>Expand your vocabulary, one word at a time</p>
      </div>

      {/* CARD */}
      <div className="carousel">
        {/* HEADER */}
        <div className="carouselHeader">
          <div className="headerLeft">
            <div className="badgeIcon" aria-hidden="true">
              {/* book icon (teal) */}
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 19.5V6.5C5 5.12 6.12 4 7.5 4H20V20H7.5C6.12 20 5 20.88 5 19.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M20 4V20"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  opacity="0.55"
                />
              </svg>
            </div>

            <div className="headerText">
              <div className="headerTitle">Vocabulary</div>
              <div className="headerSub">
                {/* MESMA INFO DO SEU ORIGINAL */}
                {source === "remote" ? "API" : "Local"} • {slides.length} words
                {loading ? " (loading...)" : ""}

                {source === "remote" && apiUsed ? (
                  <span style={{ marginLeft: 8, opacity: 0.75 }}>({apiUsed})</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="headerRight">
            {/* SETAS CORRETAS (SVG) */}
            <button
              className="btn"
              onClick={prev}
              disabled={slides.length <= 1}
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M14 6L8 12L14 18" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            <div className="counter">
              {slides.length > 0 ? active + 1 : 0} / {slides.length}
            </div>

            <button
              className="btn"
              onClick={next}
              disabled={slides.length <= 1}
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 6L16 12L10 18" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* SLIDE */}
        <div className="slide">
          {!current ? (
            <div className="empty">{loading ? "Buscando dados..." : "Sem dados."}</div>
          ) : (
            <>
              <h2 className="title">{current.word}</h2>

              {/* mesmos campos do seu original */}
              <div className="block">
                <div className="k">
                  <span className="kDot">✦</span> DEFINITION
                </div>
                <p className="v">{current.description || "-"}</p>
              </div>

              <div className="block blockAccent">
                <div className="k">
                  <span className="kDot">❝</span> EXAMPLE
                </div>
                <p className="v">{current.useCase || "-"}</p>
              </div>
            </>
          )}
        </div>

        {/* DOTS (mesma lógica) */}
        <div className="dots">
          {slides.map((s, idx) => (
            <button
              key={s.id ?? idx}
              className={`dot ${idx === active ? "active" : ""}`}
              onClick={() => setActive(idx)}
              aria-label={`Ir para item ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
