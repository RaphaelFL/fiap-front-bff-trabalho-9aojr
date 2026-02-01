import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fallbackWords } from "./fallbackWords";

// Tudo vem do .env (Vite)
const askUrl = import.meta.env.VITE_BFF_ASK_URL;
const DEFAULT_PROMPT = import.meta.env.VITE_BFF_DEFAULT_PROMPT || "arvore";

// opcional: chave do BFF (NÃO é chave da OpenAI)
const BFF_API_KEY = import.meta.env.VITE_BFF_API_KEY || "";

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

function buildCandidateUrls(baseUrl) {
  const u = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!u) return [];

  const candidates = [u];

  const endsWithAsk = /\/ask$/i.test(u);
  if (!endsWithAsk) candidates.push(`${u}/ask`);
  if (endsWithAsk) candidates.push(`${u}/ask`); // cobre /ask/ask

  if (endsWithAsk) {
    candidates.push(u.replace(/\/ask$/i, "/api/ask"));
  } else {
    candidates.push(`${u}/api/ask`);
  }

  return [...new Set(candidates)];
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);

  const slides = useMemo(() => normalizeToSlides(rawResponse), [rawResponse]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((prev) => clampIndex(prev, slides.length));
  }, [slides.length]);

  async function fetchSlides() {
    setLoading(true);

    try {
      // se não tiver env, cai no fallback
      if (!askUrl) {
        setRawResponse(fallbackWords);
        setActive(0);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        ...(BFF_API_KEY ? { "x-api-key": BFF_API_KEY } : {}),
      };

      const candidates = buildCandidateUrls(askUrl);
      let lastError = null;

      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ question: DEFAULT_PROMPT }),
          });

          if (res.status === 404) continue;
          if (!res.ok) {
            lastError = new Error(`HTTP ${res.status}`);
            continue;
          }

          const data = await res.json();
          const normalized = normalizeToSlides(data);

          if (normalized.length === 0) {
            lastError = new Error("Resposta vazia/fora do formato");
            continue;
          }

          setRawResponse(data);
          setActive(0);
          return;
        } catch (e) {
          lastError = e;
        }
      }

      console.error("Falha ao buscar no BFF:", lastError);
      setRawResponse(fallbackWords);
      setActive(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
