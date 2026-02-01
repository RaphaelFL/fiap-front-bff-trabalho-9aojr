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

/**
 * Monta URL final: sempre termina em /ask e remove querystring.
 */
function buildAskUrlFromEnv() {
  const envUrl = (import.meta.env.VITE_BFF_ASK_URL || "").trim();
  if (!envUrl) return "";

  const base = envUrl.split("?")[0];

  if (base.endsWith("/ask")) return base;
  return base.endsWith("/") ? `${base}ask` : `${base}/ask`;
}

export default function App() {
  const didFetchRef = useRef(false);
  const askUrl = buildAskUrlFromEnv();

  // ✅ sempre tem dado pra exibir (base local)
  const [rawResponse, setRawResponse] = useState(fallbackWords);

  // ✅ indicador de origem do dado (o que você pediu pra exibir)
  // "local" = fallbackWords, "remote" = API
  const [source, setSource] = useState("local");

  const [loading, setLoading] = useState(true);

  const slides = useMemo(() => normalizeToSlides(rawResponse), [rawResponse]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((prev) => clampIndex(prev, slides.length));
  }, [slides.length]);

  async function fetchSlides() {
    // sem env -> fica no local
    if (!askUrl) {
      setSource("local");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(askUrl); // ✅ GET puro

      // qualquer erro HTTP -> mantém local
      if (!res.ok) {
        setSource("local");
        return;
      }

      const data = await res.json();

      const normalized = normalizeToSlides(data);
      if (!normalized.length) {
        setSource("local");
        return;
      }

      // ✅ sucesso -> troca pra remoto e marca origem
      setRawResponse(data);
      setActive(0);
      setSource("remote");
    } catch {
      // rede/CORS/timeout/JSON inválido -> mantém local
      setSource("local");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    fetchSlides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* ✅ AQUI é o que você pediu: mostrar se é base local ou API */}
      <div style={{ marginTop: 8, marginBottom: 12, opacity: 0.9, fontSize: 14 }}>
        Fonte:{" "}
        <strong>
          {source === "remote" ? "API" : "Base local"}
        </strong>
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
