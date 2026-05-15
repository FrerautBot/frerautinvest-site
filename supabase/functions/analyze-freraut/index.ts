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
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return match ? JSON.parse(match[0]) : { error: "parse_error" };
  } catch {
    return { error: "parse_error", raw: text.slice(0, 200) };
  }
}

// ── Strategy analyzers ────────────────────────────────────────────────────────

function techSummary(t: Record<string, unknown>): string {
  return `Precio: $${(t.currentPrice as number)?.toFixed(2) ?? "N/A"} | RSI14: ${(t.rsi14 as number)?.toFixed(1) ?? "N/A"} | RSI2: ${(t.rsi2 as number)?.toFixed(1) ?? "N/A"} | SMA20: $${(t.sma20 as number)?.toFixed(2) ?? "N/A"} | SMA50: $${(t.sma50 as number)?.toFixed(2) ?? "N/A"} | SMA200: $${(t.sma200 as number)?.toFixed(2) ?? "N/A"} | MACD hist: ${(t.macd as { histogram: number })?.histogram?.toFixed(3) ?? "N/A"} | ATR: ${(t.atr as number)?.toFixed(2) ?? "N/A"} | Régimen: ${t.regime ?? "N/A"} | 52wH: $${(t.high52w as number)?.toFixed(2) ?? "N/A"} | 52wL: $${(t.low52w as number)?.toFixed(2) ?? "N/A"} | DownDays: ${t.downDays ?? "N/A"} | IBS: ${(t.ibs as number)?.toFixed(2) ?? "N/A"}`;
}

async function analyzeTIC(ticker: string, strategy: string, t: Record<string, unknown>, research: string) {
  const extraField = strategy === "frerautiano"
    ? `  "market_recommendation": "UPRO" | "SPXU" | "CASH",\n  "regime_confidence": number`
    : "";

  const system = `Eres el analista jefe de Freraut Invest. Evalúas activos según la LEY SUPREMA — 7 criterios TIC (Ticker de Inversión Confirmada). Un activo es TIC solo si cumple los 7:
1. Fundamentos sólidos — balance, FCF, deuda sanos
2. Catalizador claro — evento concreto próximo que eleva el precio
3. En soporte técnico — entrada sobre soporte validado, no en aire
4. Análisis técnico bullish — RSI, MACD, volumen, MA confluyendo alcista, no overbought
5. Visibilidad/popularidad — flujo institucional visible, el mercado puede descubrir el valor
6. Objetivo de salida claro — target en resistencia técnica definido antes de entrar
7. Alta convicción — confluencia de los 6 anteriores. Si dudas, no es TIC.

Responde ÚNICAMENTE en JSON válido, sin texto adicional:
{
  "verdict": "TIC" | "NO TIC",
  "conviction_pct": number,
  "criteria": [
    {"id":1,"name":"Fundamentos sólidos","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":2,"name":"Catalizador claro","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":3,"name":"En soporte técnico","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":4,"name":"Análisis técnico bullish","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":5,"name":"Visibilidad/popularidad","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":6,"name":"Objetivo de salida claro","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":7,"name":"Alta convicción","score":number,"met":boolean,"evidence":"<90 chars"}
  ],
  "entry_zone": "string",
  "target_price": number | null,
  "stop_loss": number | null,
  "summary": "<180 chars"${extraField ? ",\n  " + extraField : ""}
}`;

  const user = `Ticker: ${ticker} | Estrategia: ${strategy.toUpperCase()}
Técnicos: ${techSummary(t)}
Investigación Sonar: ${research}
Evalúa los 7 criterios TIC. Veredicto en JSON.`;

  return claudeJSON(system, user);
}

async function analyzeDividendos(ticker: string, t: Record<string, unknown>, research: string) {
  const disc52w = t.high52w && t.currentPrice
    ? (((t.high52w as number) - (t.currentPrice as number)) / (t.high52w as number) * 100).toFixed(1)
    : "N/A";

  const system = `Eres el analista de dividendos de Freraut Invest. Evalúas acciones con 5 criterios:
1. Yield actual — objetivo >6%, ideal >7%
2. Precio relativo (baratura) — descuento vs ATH 52w y SMA200
3. Historial dividendos — años consecutivos, crecimiento, recortes recientes
4. Cobertura/seguridad — payout ratio, FCF, sostenibilidad
5. Perspectivas negocio — estabilidad ingresos, crecimiento

Responde ÚNICAMENTE en JSON válido:
{
  "verdict": "COMPRAR" | "ACUMULAR" | "ESPERAR" | "EVITAR",
  "conviction_pct": number,
  "criteria": [
    {"id":1,"name":"Yield actual","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":2,"name":"Precio relativo (baratura)","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":3,"name":"Historial dividendos","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":4,"name":"Cobertura / Payout ratio","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":5,"name":"Perspectivas negocio","score":number,"met":boolean,"value":"string","evidence":"<90 chars"}
  ],
  "current_yield": "string",
  "dividend_safety": "SEGURO" | "MODERADO" | "RIESGOSO",
  "summary": "<180 chars"
}`;

  const user = `Ticker: ${ticker} | Estrategia: DIVIDENDOS
Técnicos: ${techSummary(t)} | Descuento 52wH: ${disc52w}%
Investigación Sonar: ${research}
Evalúa los 5 criterios de dividendos. Veredicto en JSON.`;

  return claudeJSON(system, user);
}

async function analyzeValue(ticker: string, t: Record<string, unknown>, research: string) {
  const disc52w = t.high52w && t.currentPrice
    ? (((t.high52w as number) - (t.currentPrice as number)) / (t.high52w as number) * 100).toFixed(1)
    : "N/A";

  const system = `Eres el analista de value investing de Freraut Invest. Evalúas empresas con 5 criterios:
1. Fundamentos — FCF positivo, márgenes, deuda, earnings quality
2. Precio vs máximos históricos — descuento 52wH y vs SMA200 (más descuento = mejor)
3. Previsiones analistas — consensus target, upside implícito, número de analistas
4. Crecimiento revenue/EPS — YoY, aceleración vs desaceleración, visibilidad futura
5. Catalizadores de re-rating — eventos que hacen que el mercado reprecie el activo al alza

Responde ÚNICAMENTE en JSON válido:
{
  "verdict": "INFRAVALORADA" | "PRECIO_JUSTO" | "CARA",
  "conviction_pct": number,
  "upside_pct": number,
  "criteria": [
    {"id":1,"name":"Fundamentos","score":number,"met":boolean,"evidence":"<90 chars"},
    {"id":2,"name":"Precio vs máximos históricos","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":3,"name":"Previsiones analistas","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":4,"name":"Crecimiento revenue / EPS","score":number,"met":boolean,"value":"string","evidence":"<90 chars"},
    {"id":5,"name":"Catalizadores de re-rating","score":number,"met":boolean,"evidence":"<90 chars"}
  ],
  "analyst_consensus": "string",
  "fair_value_estimate": "string",
  "summary": "<180 chars"
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
