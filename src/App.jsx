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
    .join(",")
    .split(/[,\s|;]+/)
    .map((s) => s.trim())
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

  async function tryFetchFrom(url) {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const normalized = normalizeToSlides(data);

    if (!normalized.length) return null;
    return data;
  }

  async function fetchSlides() {
    if (!askUrls.length) {
      setSource("local");
      setApiUsed("");
      setLoading(false);
      return;
    }

    try {
      for (const url of askUrls) {
        try {
          const data = await tryFetchFrom(url);
          if (!data) continue;

          setRawResponse(data);
          setActive(0);
          setSource("remote");
          setApiUsed(url);
          return;
        } catch {
          // noop
        }
      }

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
      <h1>Vocabulary Carousel</h1>

      <div style={{ marginTop: 8, marginBottom: 12, opacity: 0.9, fontSize: 14 }}>
        Fonte: <strong>{source === "remote" ? "API" : "Base local"}</strong>
        {source === "remote" && apiUsed ? (
          <span style={{ marginLeft: 8, opacity: 0.85 }}>({apiUsed})</span>
        ) : null}
        {loading ? " (carregando...)" : ""}
      </div>

      <div className="carousel">
        <div className="carouselHeader">
          <button className="btn" onClick={prev} disabled={slides.length <= 1}>
            ◀
          </button>

          <div className="counter">
            {slides.length > 0 ? active + 1 : 0} / {slides.length}
          </div>

          <button className="btn" onClick={next} disabled={slides.length <= 1}>
            ▶
          </button>
        </div>

        <div className="slide">
          {!current ? (
            <div className="empty">{loading ? "Buscando dados..." : "Sem dados."}</div>
          ) : (
            <>
              <h2 className="title">{current.word}</h2>

              <div className="block">
                <div className="k">Description</div>
                <div className="v">{current.description || "-"}</div>
              </div>

              <div className="block">
                <div className="k">Use case</div>
                <div className="v">{current.useCase || "-"}</div>
              </div>
            </>
          )}
        </div>

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
