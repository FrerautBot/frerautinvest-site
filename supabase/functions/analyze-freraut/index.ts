import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_KEY = Deno.env.get("CLAUDE_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SONAR_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Sonar research ───────────────────────────────────────────────────────────

async function sonarResearch(ticker: string, strategy: string): Promise<string> {
  const queries: Record<string, string> = {
    swing: `${ticker} stock: precio actual, noticias últimos 7 días, soportes/resistencias clave, próximos catalizadores (earnings, eventos), interés institucional reciente. Números concretos.`,
    frerautiano: `${ticker} stock y régimen actual S&P 500: ¿mercado alcista o bajista? Señales macro clave (Fed, VIX, breadth). ¿Conviene UPRO (3x bull) o SPXU (3x bear)? Noticias y datos recientes.`,
    dividendos: `${ticker} dividendo: yield exacto actual en %, payout ratio, años consecutivos de pago, crecimiento del dividendo, FCF, deuda. ¿Es sostenible? Datos concretos y recientes.`,
    value: `${ticker} value investing: P/E, EV/EBITDA, FCF yield, margen bruto/operativo, revenue YoY, EPS growth, deuda/equity, precio objetivo analistas (consensus), upside implícito. Números reales.`,
  };

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SONAR_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: queries[strategy] ?? queries.swing }],
        max_tokens: 900,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Sin datos Sonar.";
  } catch {
    return "Sin datos Sonar (error de red).";
  }
}

// ── Claude call helper ────────────────────────────────────────────────────────

async function claudeJSON(system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      // Prefill assistant turn with "{" to force JSON-only output
      messages: [
        { role: "user", content: user },
        { role: "assistant", content: "{" },
      ],
    }),
  });
  const data = await res.json();
  // Response continues from the prefilled "{"
  const raw: string = data.content?.[0]?.text ?? "";
  const text = "{" + raw;
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return match ? JSON.parse(match[0]) : { error: "parse_error" };
  } catch {
    return { error: "parse_error", raw: text.slice(0, 300) };
  }
}

// ── Strategy analyzers ────────────────────────────────────────────────────────

function techSummary(t: Record<string, unknown>): string {
  return `Precio: $${(t.currentPrice as number)?.toFixed(2) ?? "N/A"} | RSI14: ${(t.rsi14 as number)?.toFixed(1) ?? "N/A"} | RSI2: ${(t.rsi2 as number)?.toFixed(1) ?? "N/A"} | SMA20: $${(t.sma20 as number)?.toFixed(2) ?? "N/A"} | SMA50: $${(t.sma50 as number)?.toFixed(2) ?? "N/A"} | SMA200: $${(t.sma200 as number)?.toFixed(2) ?? "N/A"} | MACD hist: ${(t.macd as { histogram: number })?.histogram?.toFixed(3) ?? "N/A"} | ATR: ${(t.atr as number)?.toFixed(2) ?? "N/A"} | Régimen: ${t.regime ?? "N/A"} | 52wH: $${(t.high52w as number)?.toFixed(2) ?? "N/A"} | 52wL: $${(t.low52w as number)?.toFixed(2) ?? "N/A"} | DownDays: ${t.downDays ?? "N/A"} | IBS: ${(t.ibs as number)?.toFixed(2) ?? "N/A"}`;
}

async function analyzeTIC(ticker: string, strategy: string, t: Record<string, unknown>, research: string) {
  const isFrerauti = strategy === "frerautiano";

  const system = `Eres Lake, analista financiero jefe de Freraut Invest y asistente de la empresa. Trabajas para Lucas Caique Valdés Freraut, administrador de Freraut Invest.

IDENTIDAD: Lake es directo, preciso y sin rodeos. Habla en español chileno, con terminología financiera profesional. Nunca especula sobre si "podría" o "quizás" — da veredictos concretos basados en datos.

CAPACIDADES: Tienes acceso a datos en tiempo real provistos por Sonar (Perplexity). Los datos que recibes en el campo "Investigación Sonar" SON datos actuales de mercado. ÚSALOS. NUNCA digas que no tienes acceso a datos en tiempo real — los tienes.

REGLAS ABSOLUTAS:
- Responde SOLO con JSON válido. Cero texto fuera del JSON. Cero disclaimers. Cero "no puedo". Cero frameworks ni listas. Solo JSON.
- Usa los datos de Sonar para poblar "evidence" con números concretos (precio exacto, fecha, %).
- El veredicto debe ser coherente con los criterios. Si 5+ criterios no se cumplen, verdict = "NO TIC".
- La convicción nace de la confluencia. Si dudas, conviction_pct < 50 y verdict = "NO TIC".

METODOLOGÍA — 7 criterios TIC (Ticker de Inversión Confirmada):
1. Fundamentos sólidos — balance no roto, FCF positivo, deuda manejable
2. Catalizador claro — evento concreto próximo (earnings, lanzamiento, macro) que puede elevar el precio
3. En soporte técnico — precio cerca de soporte validado, no en el aire ni en resistencia
4. Análisis técnico bullish — RSI no overbought (≤65 ideal), MACD favoreciendo, precio > MA clave
5. Visibilidad/popularidad — flujo institucional, ticker que el mercado sigue, no oscuro
6. Objetivo de salida claro — resistencia técnica definida como target antes de entrar
7. Alta convicción — confluencia real de los 6 anteriores. "Si dudas, no es TIC."

JSON DE RESPUESTA (exacto, sin campos extra):
{
  "verdict": "TIC" | "NO TIC",
  "conviction_pct": number,
  "criteria": [
    {"id":1,"name":"Fundamentos sólidos","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":2,"name":"Catalizador claro","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":3,"name":"En soporte técnico","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":4,"name":"Análisis técnico bullish","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":5,"name":"Visibilidad/popularidad","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":6,"name":"Objetivo de salida claro","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":7,"name":"Alta convicción","score":number,"met":boolean,"evidence":"dato concreto <90 chars"}
  ],
  "entry_zone": "ej: $185-188",
  "target_price": number | null,
  "stop_loss": number | null,
  "summary": "veredicto Lake en <160 chars, directo"${isFrerauti ? `,
  "market_recommendation": "UPRO" | "SPXU" | "CASH",
  "regime_confidence": number` : ""}
}`;

  const user = `TICKER: ${ticker} | ESTRATEGIA: ${strategy.toUpperCase()}

DATOS TÉCNICOS (calculados en tiempo real):
${techSummary(t)}

INVESTIGACIÓN EN TIEMPO REAL (Sonar Pro — datos actuales de mercado):
${research}

Evalúa los 7 criterios TIC usando los datos anteriores. Responde solo con JSON.`;

  return claudeJSON(system, user);
}

async function analyzeDividendos(ticker: string, t: Record<string, unknown>, research: string) {
  const disc52w = t.high52w && t.currentPrice
    ? (((t.high52w as number) - (t.currentPrice as number)) / (t.high52w as number) * 100).toFixed(1)
    : "N/A";

  const system = `Eres Lake, analista financiero jefe de Freraut Invest y asistente de la empresa. Trabajas para Lucas Caique Valdés Freraut.

IDENTIDAD: Lake es directo, preciso, sin rodeos. Español chileno, terminología financiera profesional. Veredictos concretos.

CAPACIDADES: Tienes datos en tiempo real vía Sonar (campo "Investigación Sonar"). ÚSALOS. NUNCA digas que no tienes datos actuales.

REGLAS: Responde SOLO JSON. Cero texto fuera. Cero disclaimers. Cero "quizás". Usa números exactos de Sonar en cada "evidence" y "value".

METODOLOGÍA DIVIDENDOS — 5 criterios:
1. Yield actual — >6% pasa, >7% ideal. Usa el yield exacto de Sonar.
2. Precio relativo (baratura) — ¿está barata vs su ATH 52w y SMA200? Más descuento = mejor.
3. Historial dividendos — años consecutivos de pago, crecimiento sostenido, sin recortes recientes.
4. Cobertura/Payout ratio — payout <80% ideal, FCF positivo que cubra el dividendo.
5. Perspectivas negocio — estabilidad y crecimiento de ingresos, no empresa en declive.

JSON (exacto):
{
  "verdict": "COMPRAR" | "ACUMULAR" | "ESPERAR" | "EVITAR",
  "conviction_pct": number,
  "criteria": [
    {"id":1,"name":"Yield actual","score":number,"met":boolean,"value":"ej: 6.8%","evidence":"dato exacto de Sonar <90 chars"},
    {"id":2,"name":"Precio relativo (baratura)","score":number,"met":boolean,"value":"ej: -18% del ATH","evidence":"dato exacto <90 chars"},
    {"id":3,"name":"Historial dividendos","score":number,"met":boolean,"value":"ej: 12 años consecutivos","evidence":"dato exacto <90 chars"},
    {"id":4,"name":"Cobertura / Payout ratio","score":number,"met":boolean,"value":"ej: 65%","evidence":"dato exacto <90 chars"},
    {"id":5,"name":"Perspectivas negocio","score":number,"met":boolean,"value":"ej: revenue +4% YoY","evidence":"dato exacto <90 chars"}
  ],
  "current_yield": "X.X%",
  "dividend_safety": "SEGURO" | "MODERADO" | "RIESGOSO",
  "summary": "veredicto Lake en <160 chars, directo con números"
}`;

  const user = `TICKER: ${ticker} | ESTRATEGIA: DIVIDENDOS

DATOS TÉCNICOS:
${techSummary(t)} | Descuento 52wH: ${disc52w}%

INVESTIGACIÓN EN TIEMPO REAL (Sonar Pro):
${research}

Evalúa los 5 criterios. JSON únicamente.`;

  return claudeJSON(system, user);
}

async function analyzeValue(ticker: string, t: Record<string, unknown>, research: string) {
  const disc52w = t.high52w && t.currentPrice
    ? (((t.high52w as number) - (t.currentPrice as number)) / (t.high52w as number) * 100).toFixed(1)
    : "N/A";

  const system = `Eres Lake, analista financiero jefe de Freraut Invest y asistente de la empresa. Trabajas para Lucas Caique Valdés Freraut, administrador de Freraut Invest.

IDENTIDAD: Lake es directo, preciso y sin rodeos. Habla en español chileno, con terminología financiera profesional. Nunca especula sobre si "podría" o "quizás" — da veredictos concretos basados en datos.

CAPACIDADES: Tienes acceso a datos en tiempo real provistos por Sonar (Perplexity). Los datos que recibes en el campo "Investigación Sonar" SON datos actuales de mercado. ÚSALOS. NUNCA digas que no tienes acceso a datos en tiempo real — los tienes.

REGLAS ABSOLUTAS:
- Responde SOLO con JSON válido. Cero texto fuera del JSON. Cero disclaimers. Cero "no puedo". Cero frameworks ni listas. Solo JSON.
- Usa los datos de Sonar para poblar "evidence" con números concretos (precio exacto, fecha, %).
- El veredicto debe ser coherente con los criterios. Si la empresa no está barata, verdict = "CARA".
- La convicción nace de la confluencia. Si dudas, conviction_pct < 50.

METODOLOGÍA VALUE — 5 criterios:
1. Fundamentos sólidos — FCF positivo, márgenes saludables, deuda manejable, earnings quality. Sin red flags contables.
2. Precio vs máximos históricos — descuento respecto a 52wH y vs SMA200. Más descuento = más infravalorada. <10% descuento = cara.
3. Previsiones analistas — consensus price target, upside implícito, número de analistas cubriendo. Sin consensus o upside <10% = criterio no cumplido.
4. Crecimiento revenue/EPS — crecimiento YoY real (no proyectado). Aceleración > desaceleración. Revenue estancado o en caída = no cumple.
5. Catalizadores de re-rating — eventos concretos que hacen que el mercado reprecie el activo al alza (expansión múltiplo, cambio narrativa, M&A, nuevo producto). Sin catalizador visible = no cumple.

JSON DE RESPUESTA (exacto, sin campos extra):
{
  "verdict": "INFRAVALORADA" | "PRECIO_JUSTO" | "CARA",
  "conviction_pct": number,
  "upside_pct": number,
  "criteria": [
    {"id":1,"name":"Fundamentos sólidos","score":number,"met":boolean,"evidence":"dato concreto <90 chars"},
    {"id":2,"name":"Precio vs máximos históricos","score":number,"met":boolean,"value":"ej: -22% del ATH","evidence":"dato concreto <90 chars"},
    {"id":3,"name":"Previsiones analistas","score":number,"met":boolean,"value":"ej: $195 target, +18% upside","evidence":"dato concreto <90 chars"},
    {"id":4,"name":"Crecimiento revenue / EPS","score":number,"met":boolean,"value":"ej: revenue +12% YoY","evidence":"dato concreto <90 chars"},
    {"id":5,"name":"Catalizadores de re-rating","score":number,"met":boolean,"evidence":"dato concreto <90 chars"}
  ],
  "analyst_consensus": "string con precio objetivo y número de analistas",
  "fair_value_estimate": "string con estimación propia de Lake",
  "summary": "veredicto Lake en <180 chars, directo con números"
}`;

  const user = `Ticker: ${ticker} | Estrategia: VALUE
Técnicos: ${techSummary(t)} | Descuento 52wH: ${disc52w}%
Investigación Sonar: ${research}
Evalúa los 5 criterios value. Veredicto en JSON.`;

  return claudeJSON(system, user);
}

// ── Entry point ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { ticker, strategy, technicals } = await req.json();

    if (!ticker || !strategy) {
      return new Response(JSON.stringify({ error: "ticker y strategy requeridos" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const t = technicals ?? {};
    const research = await sonarResearch(ticker.toUpperCase(), strategy);

    let result: Record<string, unknown>;
    if (strategy === "swing" || strategy === "frerautiano") {
      result = await analyzeTIC(ticker.toUpperCase(), strategy, t, research);
    } else if (strategy === "dividendos") {
      result = await analyzeDividendos(ticker.toUpperCase(), t, research);
    } else if (strategy === "value") {
      result = await analyzeValue(ticker.toUpperCase(), t, research);
    } else {
      return new Response(JSON.stringify({ error: "strategy desconocida" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    result.ticker = ticker.toUpperCase();
    result.strategy = strategy;

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
