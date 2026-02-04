# FIAP Front + BFF — Vocabulary Carousel (React + Vite)

Este projeto é um front-end em **React + Vite** que exibe um **carrossel de vocabulário** (palavra + descrição + caso de uso).

Ele funciona em dois modos:

1. **Remoto (API/BFF)**: tenta buscar os dados em uma rota `/ask` (com fallback para uma segunda rota).
2. **Local (fallback)**: se a API falhar ou estiver indisponível, usa uma base local `fallbackWords`.

> Motivação do fallback: a rota/OpenAI do professor ficou sem saldo, então o app aceita **duas URLs** (sua e do professor) e tenta automaticamente uma depois da outra.

---

## Stack / Tecnologias

- **React 19** (UI)
- **Vite 7** (build/dev server)
- **ESLint 9** (lint)

---

## O que está instalado (package.json)

### Dependencies
- `react`
- `react-dom`

### Dev Dependencies
- `vite`
- `@vitejs/plugin-react`
- `eslint`
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `@types/react`
- `@types/react-dom`
- `globals`

Scripts disponíveis:
- `npm run dev` — roda local (Vite)
- `npm run build` — gera build de produção
- `npm run preview` — serve build localmente (host 0.0.0.0, porta 4173)
- `npm run start` — alias do preview (útil no Render)
- `npm run lint` — roda eslint

---

## Estrutura principal do front

### `App.jsx` (ou `App.tsx`)
O app faz:
- Lê variáveis de ambiente do Vite (Render também injeta isso).
- Monta uma lista de URLs válidas para `/ask`.
- Tenta buscar dados com `fetch(url)` em ordem:
  1. `VITE_BFF_ASK_URL`
  2. `VITE_BFF_ASK_URL_ALT`
- Se nenhuma funcionar, usa `fallbackWords` (base local).

### `fallbackWords`
Arquivo local com uma lista de itens para o carrossel quando:
- não há URL configurada, ou
- a API está fora, ou
- a resposta não vem no formato esperado.

---

## Como a busca remota funciona (duas rotas)

O app monta as URLs assim:

- `VITE_BFF_ASK_URL`  → normaliza para terminar em `/ask`
- `VITE_BFF_ASK_URL_ALT` → normaliza para terminar em `/ask`

Depois tenta:

1) **URL primária**
- Se `fetch` retornar **200** e o JSON tiver uma lista válida de itens, usa essa.

2) **URL alternativa**
- Se a primária falhar (status não-OK, erro, JSON inválido, ou lista vazia), tenta a alternativa.

3) **Fallback local**
- Se as duas falharem, cai no `fallbackWords`.

Na UI aparece:
- Fonte: **API** (remoto) ou **Base local**
- E quando remoto: mostra qual URL foi usada

---

## Formato esperado da resposta da API

O front tenta normalizar alguns formatos comuns:

Ele aceita arrays em:
- resposta como **array direto**: `[...]`
- `data`: `{ "data": [...] }`
- `items`: `{ "items": [...] }`
- `answer`: `{ "answer": [...] }`

Cada item é normalizado para:

```json
{
  "word": "string",
  "description": "string",
  "useCase": "string"
}
```

Se algum campo vier faltando:
- `word` vira `"Item N"`
- `description` e `useCase` viram `""` (na tela aparece `-`)

---

## Variáveis de ambiente (Vite)

Crie um arquivo `.env` na raiz (local):

```env
VITE_BFF_ASK_URL=https://SUA-API-OU-SEU-BFF.onrender.com
VITE_BFF_ASK_URL_ALT=https://API-DO-PROFESSOR.onrender.com
```

### Importante sobre URLs
- Você pode colocar com ou sem `/ask`.
- O app normaliza:
  - remove barras finais
  - remove querystring
  - e garante que termina em `/ask`

Exemplos equivalentes:
- `https://api.exemplo.com` → vira `https://api.exemplo.com/ask`
- `https://api.exemplo.com/ask` → mantém
- `https://api.exemplo.com/ask?x=1` → vira `https://api.exemplo.com/ask`

---

## Configuração no Render (produção)

### 1) Build & Start Commands
No Render (Web Service / Static Site), use:

- **Build Command**
  ```bash
  npm install && npm run build
  ```

> O script `start` já está configurado como:
> `vite preview --host 0.0.0.0 --port 4173`

### 2) Environment Variables (Render)
No painel do Render, crie as variáveis:

- `VITE_BFF_ASK_URL` = sua URL base do BFF (ou a rota do seu backend)
- `VITE_BFF_ASK_URL_ALT` = URL base do professor (fallback)

Exemplo:
- `VITE_BFF_ASK_URL=https://meu-bff.onrender.com`
- `VITE_BFF_ASK_URL_ALT=https://bff-professor.onrender.com`

> O front vai chamar:
> - `https://meu-bff.onrender.com/ask`
> - se falhar, `https://bff-professor.onrender.com/ask`

### 3) Observação sobre CORS
Se o BFF estiver em outro domínio, ele precisa permitir CORS para o domínio do seu front.
No backend, habilite CORS liberando o origin do seu site do Render.

---

## Rodando localmente

1) Instalar dependências
```bash
npm install
```

2) Configurar `.env`
```env
VITE_BFF_ASK_URL=http://localhost:3000
VITE_BFF_ASK_URL_ALT=https://bff-professor.onrender.com
```

3) Rodar
```bash
npm run dev
```

Acesse:
- `http://localhost:5173`

---

## Comportamento do carrossel

- Botões ◀ ▶:
  - avançam/voltam e fazem “loop” (último → primeiro, primeiro → último)
- Dots:
  - clicáveis para ir direto em um item
- Se não houver dados:
  - mostra "Buscando dados..." enquanto carrega
  - depois "Sem dados." se não tiver nada

---

## Troubleshooting rápido

- **Sempre cai na Base local**
  - Verifique se `VITE_BFF_ASK_URL` está configurado no Render.
  - Teste no browser: abra `https://SEU-BFF/ask` e veja se retorna JSON com lista.
  - Se retornar `{}` ou lista vazia, o front ignora e cai no fallback.

- **Erro de CORS no console**
  - Ajuste CORS no backend para permitir o domínio do seu front.

- **URL duplicada / errada**
  - Não coloque espaços e prefira a URL base; o app já completa `/ask`.

---

## Resumo do objetivo

- Front simples em React para exibir “vocabulary slides”.
- Integração com BFF via `/ask`.
- **Failover automático** para uma segunda rota (professor) caso a primeira esteja indisponível ou sem saldo.
- Fallback local garantido para nunca deixar a tela vazia.

# Lighthouse / Web Vitals (PageSpeed Insights)

Este repositório inclui evidências de performance geradas pelo **Lighthouse / PageSpeed Insights**, contendo as principais métricas de **Core Web Vitals** e métricas complementares de carregamento/estabilidade.

---

## Evidências

> Coloque os arquivos dentro da pasta `docs/` do projeto.

- Print da análise (Desktop): `docs/lighthouse-desktop.png`
- PDF com a análise completa: `docs/lighthouse-web-vitals.pdf`

### Preview (Desktop)

![Lighthouse - Web Vitals (Desktop)](./docs/lighthouse-desktop.png)

---

## Métricas aferidas e significado

As métricas abaixo ajudam a medir **velocidade percebida**, **responsividade** e **estabilidade visual** da página.

### FCP — First Contentful Paint
Tempo até o navegador renderizar o **primeiro conteúdo visível** (texto, imagem, SVG, etc.).  
- **Interpretação:** quão rápido o usuário vê “algo” na tela.
- **Quanto menor, melhor.**

### LCP — Largest Contentful Paint
Tempo até renderizar o **maior elemento visível** na viewport (geralmente o conteúdo principal).  
- **Interpretação:** quão rápido a parte principal “parece carregada”.
- **Quanto menor, melhor.**

### TBT — Total Blocking Time
Soma do tempo em que a **main thread** ficou bloqueada por tarefas longas (geralmente JavaScript), impedindo interações.  
- **Interpretação:** se a página fica “travada” enquanto carrega.
- **Quanto menor, melhor (ideal: próximo de 0ms).**

### CLS — Cumulative Layout Shift
Mede o quanto a página sofre **mudanças inesperadas de layout** (elementos “pulando” na tela).  
- **Interpretação:** estabilidade visual durante o carregamento.
- **Quanto menor, melhor (ideal: 0).**

### Speed Index
Estimativa de quão rápido o conteúdo visível é **pintado progressivamente** na tela.  
- **Interpretação:** sensação geral de velocidade de renderização.
- **Quanto menor, melhor.**

---

## Observação
A análise apresentada foi executada no modo **Desktop** (conforme evidências acima).  
Para manter rastreabilidade, recomenda-se versionar sempre o **print** e o **PDF** do relatório junto ao código.

---

## Como atualizar a evidência
1. Rode a análise no Lighthouse / PageSpeed Insights (Desktop ou Mobile).
2. Exporte ou capture:
   - um **print** da tela com os resultados
   - e um **PDF** do relatório (quando disponível)
3. Salve/atualize em:
   - `docs/lighthouse-desktop.png`
4. Faça commit das evidências junto das mudanças que impactaram performance.
