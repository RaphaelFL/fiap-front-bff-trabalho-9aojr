import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { fallbackWords } from "./fallbackWords";

const DEFAULT_PROMPT = "arvore";

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

function buildAskUrlFromEnv(prompt) {
  const envUrl = (import.meta.env.VITE_BFF_ASK_URL || "").trim();
  if (!envUrl) return "";


  if (envUrl.includes("?")) return envUrl;


  const withAsk = envUrl.endsWith("/ask")
    ? envUrl
    : envUrl.endsWith("/")
      ? `${envUrl}ask`
      : `${envUrl}/ask`;

  return `${withAsk}?question=${encodeURIComponent(prompt)}`;
}

export default function App() {
  const didFetchRef = useRef(false);

  const envAskUrl = (import.meta.env.VITE_BFF_ASK_URL || "").trim();
  const askUrl = buildAskUrlFromEnv(DEFAULT_PROMPT);

  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);

  const slides = useMemo(() => normalizeToSlides(rawResponse), [rawResponse]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((prev) => clampIndex(prev, slides.length));
  }, [slides.length]);

  async function fetchSlides() {
    if (!askUrl) {
      setRawResponse(fallbackWords);
      setActive(0);
      return;
    }

    setLoading(true);

    try {

      const res = await fetch(askUrl);

      if (!res.ok) {
        setRawResponse(fallbackWords);
        setActive(0);
        return;
      }

      const data = await res.json();

      const normalized = normalizeToSlides(data);
      if (!normalized.length) {
        setRawResponse(fallbackWords);
        setActive(0);
        return;
      }

      setRawResponse(data);
      setActive(0);
    } catch {
      setRawResponse(fallbackWords);
      setActive(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    console.log("VITE_BFF_ASK_URL (env):", envAskUrl);
    console.log("ASK_URL efetiva (GET):", askUrl);

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
            <div className="empty">
              {loading ? "Buscando dados..." : "Sem dados."}
            </div>
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
