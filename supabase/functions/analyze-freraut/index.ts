const ANTHROPIC_KEY = Deno.env.get("CLAUDE_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SONAR_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Sector ETF map ────────────────────────────────────────────────────────────

const SECTORS: Record<string, { bull: string; bear: string; etf: string }> = {
  sp500:    { bull: "UPRO",  bear: "SPXU", etf: "SPY"  },
  nasdaq:   { bull: "TQQQ",  bear: "SQQQ", etf: "QQQ"  },
  semis:    { bull: "SOXL",  bear: "SOXS", etf: "SOXX" },
  finanzas: { bull: "FAS",   bear: "FAZ",  etf: "XLF"  },
  energia:  { bull: "ERX",   bear: "ERY",  etf: "XLE"  },
  biotech:  { bull: "LABU",  bear: "LABD", etf: "XBI"  },
  smallcap: { bull: "TNA",   bear: "TZA",  etf: "IWM"  },
  china:    { bull: "YINN",  bear: "YANG", etf: "FXI"  },
};

const SECTOR_QUERIES: Record<string, string> = {
  _news: "Noticias financieras más importantes de hoy: Fed, inflación, geopolítica, shocks de mercado, eventos clave. Solo datos de hoy. Sé conciso.",
  _spy:  "SPY precio actual, rendimiento última semana y mes. VIX nivel hoy. Porcentaje acciones S&P500 sobre SMA50. ¿Régimen alcista o bajista? Datos concretos.",
  sp500:    "SPY flujo fondos institucionales hoy, soportes clave mencionados por analistas, catalizadores próximas 2 semanas. Números concretos.",
  nasdaq:   "QQQ rendimiento vs SPY última semana, liderazgo tech, noticias FAANG y mega-cap, earnings próximos importantes. Datos concretos.",
  semis:    "SOXX semiconductores rendimiento últimas 2 semanas, ciclo inventarios chips, noticias NVDA AMD TSMC ASML, próximos earnings. Datos concretos.",
  finanzas: "XLF financials rendimiento, impacto curva yield en bancos, noticias JPM BAC GS, próximos earnings. Datos concretos.",
  energia:  "XLE energy rendimiento, precio Brent y WTI hoy, noticias OPEC recientes, perspectiva demanda global. Datos concretos.",
  biotech:  "XBI biotech rendimiento, próximas decisiones FDA, noticias M&A biotech, flujo hedge funds sector salud. Datos concretos.",
  smallcap: "IWM small cap rendimiento vs SPY, señal risk-on o risk-off del mercado, spread high yield bonds, catalizadores. Datos concretos.",
  china:    "FXI China rendimiento, noticias PBOC política monetaria, tensión geopolítica EEUU-China, datos macro China recientes.",
};

// ── Sonar helpers ─────────────────────────────────────────────────────────────

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
      headers: { Authorization: `Bearer ${SONAR_KEY}`, "Content-Type": "application/json" },
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

async function sonarFrerauti(query: string): Promise<string> {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${SONAR_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: query }],
        max_tokens: 1000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Sin datos Sonar.";
  } catch {
    return "Sin datos Sonar (error de red).";
  }
}

// ── Claude helpers ────────────────────────────────────────────────────────────

async function claudeJSON(
  system: string,
  user: string,
  model = "claude-sonnet-4-6",
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { error: "anthropic_http_error", status: res.status, detail: errText.slice(0, 300) };
  }
  const data = await res.json();
  if (data.error) {
    return { error: "anthropic_api_error", detail: String(data.error?.message ?? JSON.stringify(data.error)).slice(0, 300) };
  }
  const raw: string = data.content?.[0]?.text ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    return match ? JSON.parse(match[0]) : { error: "parse_error", raw: raw.slice(0, 300) };
  } catch {
    return { error: "parse_error", raw: raw.slice(0, 300) };
  }
}

// ── Supabase cache write ──────────────────────────────────────────────────────

async function upsertCache(row: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/frerautiano_cache`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    });
  } catch {
    // non-fatal
  }
}

// ── Tech summary helper ───────────────────────────────────────────────────────

function techSummary(t: Record<string, unknown>): string {
  return `Precio: $${(t.currentPrice as number)?.toFixed(2) ?? "N/A"} | RSI14: ${(t.rsi14 as number)?.toFixed(1) ?? "N/A"} | RSI2: ${(t.rsi2 as number)?.toFixed(1) ?? "N/A"} | SMA20: $${(t.sma20 as number)?.toFixed(2) ?? "N/A"} | SMA50: $${(t.sma50 as number)?.toFixed(2) ?? "N/A"} | SMA200: $${(t.sma200 as number)?.toFixed(2) ?? "N/A"} | MACD hist: ${(t.macd as { histogram: number })?.histogram?.toFixed(3) ?? "N/A"} | ATR: ${(t.atr as number)?.toFixed(2) ?? "N/A"} | Régimen: ${t.regime ?? "N/A"} | 52wH: $${(t.high52w as number)?.toFixed(2) ?? "N/A"} | 52wL: $${(t.low52w as number)?.toFixed(2) ?? "N/A"} | DownDays: ${t.downDays ?? "N/A"} | IBS: ${(t.ibs as number)?.toFixed(2) ?? "N/A"}`;
}

function techSummaryShort(t: Record<string, unknown>): string {
  return `Precio: $${(t.currentPrice as number)?.toFixed(2) ?? "N/A"} | RSI14: ${(t.rsi14 as number)?.toFixed(1) ?? "N/A"} | SMA50: $${(t.sma50 as number)?.toFixed(2) ?? "N/A"} | SMA200: $${(t.sma200 as number)?.toFixed(2) ?? "N/A"} | MACD hist: ${(t.macd as { histogram: number })?.histogram?.toFixed(3) ?? "N/A"} | ATR: ${(t.atr as number)?.toFixed(2) ?? "N/A"}`;
}

// ── FRERAUTIANO FASE 1+2: Init ────────────────────────────────────────────────
// Fetch news + SPY context in parallel, then Opus determines regime + sector order

async function frerautianoInit(techSpy: Record<string, unknown>) {
  const [sonarNews, sonarSpy] = await Promise.all([
    sonarFrerauti(SECTOR_QUERIES._news),
    sonarFrerauti(SECTOR_QUERIES._spy),
  ]);

  const system = `Eres Lake, analista jefe de Freraut Invest. Especialista en rotación sectorial con ETFs 3x.
Responde SOLO JSON. Sin texto fuera. Sin disclaimers. Los datos de Sonar son actuales — úsalos sin reservas.`;

  const user = `NOTICIAS MACRO HOY (Sonar — fuentes confiables):
${sonarNews}

TECHNICALS SPY (datos en tiempo real del sistema):
${techSummaryShort(techSpy)}

CONTEXTO SPY + VIX (Sonar):
${sonarSpy}

Tu tarea:
1. Define el régimen actual del mercado.
2. Ordena los 8 sectores de MAYOR a MENOR probabilidad TIC hoy.
   TIC aplica tanto alcista (3x bull) como inverso (3x bear) — en bear market SPXU puede ser el mejor TIC.
3. Justifica brevemente el orden.

Sectores disponibles: sp500, nasdaq, semis, finanzas, energia, biotech, smallcap, china

JSON:
{
  "regime": "BULL" | "BEAR" | "NEUTRAL" | "STRESS",
  "vix_assessment": "descripción breve del VIX y qué implica para 3x",
  "spy_price": number,
  "sector_order": ["sector1","sector2","sector3","sector4","sector5","sector6","sector7","sector8"],
  "order_reasoning": "<150 chars — por qué este orden ahora"
}`;

  const result = await claudeJSON(system, user, "claude-opus-4-7");

  // Fallback si Opus no produjo JSON válido
  if (!result.regime) {
    result.regime = "NEUTRAL";
    result.vix_assessment = "Datos insuficientes";
    result.sector_order = ["sp500","nasdaq","semis","finanzas","energia","biotech","smallcap","china"];
    result.order_reasoning = "Orden por defecto — datos Sonar no disponibles";
  }

  const spyPrice = (result.spy_price as number) ?? (techSpy.currentPrice as number) ?? 0;

  await Promise.all([
    upsertCache({
      sector: "_macro",
      macro_regime: result.regime,
      spy_price_snapshot: spyPrice,
      analysis: result,
      sonar_raw: sonarSpy,
      analyzed_at: new Date().toISOString(),
    }),
    upsertCache({
      sector: "_news",
      analysis: { content: sonarNews },
      analyzed_at: new Date().toISOString(),
    }),
  ]);

  return { ...result, sonar_news: sonarNews, sonar_spy: sonarSpy };
}

// ── FRERAUTIANO FASE 3: Sector analysis ──────────────────────────────────────

async function frerautianoSector(
  sector: string,
  regime: string,
  vixAssessment: string,
  orderRank: number,
  technicals: Record<string, unknown>,
) {
  const pair = SECTORS[sector];
  if (!pair) return { error: "sector_desconocido" };

  const sonarData = await sonarFrerauti(SECTOR_QUERIES[sector] ?? SECTOR_QUERIES.sp500);

  const system = `Eres Lake, analista jefe de Freraut Invest. Especialista en ETFs 3x apalancados.

REGLA CRÍTICA: El volatility decay destruye capital en mercados LATERALES.
Solo tendencia CLARA justifica entrar en un 3x. Si hay duda → CASH.
Conviction < 65% → signal = "CASH" obligatorio.
Un análisis conservador que evita una pérdida vale más que una señal agresiva equivocada.

Los datos de Sonar son actuales y provienen de fuentes confiables. Úsalos sin reservas.
Responde SOLO JSON. Sin texto fuera. Sin disclaimers.`;

  const user = `SECTOR: ${sector.toUpperCase()} | ETF Bull: ${pair.bull} | ETF Bear: ${pair.bear} | ETF referencia: ${pair.etf}
CONTEXTO MACRO: Régimen=${regime} | VIX=${vixAssessment}

TECHNICALS ${pair.etf} (sistema en tiempo real):
${techSummaryShort(technicals)}

INVESTIGACIÓN SONAR (Perplexity Finance, Yahoo, Google, Investing):
${sonarData}

Responde estas 4 preguntas brevemente y luego da tu veredicto final:
1. TENDENCIA: ¿Precio en tendencia clara (up o down) o lateral las últimas 2 semanas?
2. MOMENTUM: ¿Hay momentum confirmado — flujo, liderazgo vs SPY, volumen?
3. CATALIZADOR: ¿Existe evento próximo que pueda acelerar el movimiento?
4. DECAY RISK: ¿Por qué NO es mercado lateral? ¿Qué hace que HOY sea diferente?

JSON:
{
  "signal": "BULL" | "BEAR" | "CASH",
  "ticker_recomendado": "${pair.bull}" | "${pair.bear}" | "CASH",
  "conviction": number,
  "q1_tendencia": "respuesta corta",
  "q2_momentum": "respuesta corta",
  "q3_catalizador": "respuesta corta",
  "q4_decay_risk": "respuesta corta",
  "reasoning": "<200 chars — qué vio Lake, por qué esta señal",
  "risk": "<100 chars — principal riesgo de esta posición",
  "timing": "inmediato" | "esperar 2-3 días" | "esperar semana"
}`;

  const result = await claudeJSON(system, user, "claude-opus-4-7");

  await upsertCache({
    sector,
    ticker_bull: pair.bull,
    ticker_bear: pair.bear,
    signal: result.signal,
    conviction: result.conviction,
    analysis: result,
    sonar_raw: sonarData,
    macro_regime: regime,
    sector_order_rank: orderRank,
    analyzed_at: new Date().toISOString(),
  });

  return {
    sector,
    ticker_bull: pair.bull,
    ticker_bear: pair.bear,
    ...result,
  };
}

// ── FRERAUTIANO FASE 4: Ranking ───────────────────────────────────────────────

async function frerautianoRanking(
  analyses: Record<string, unknown>[],
  spyPrice: number,
) {
  const system = `Eres Lake. Acabas de analizar 8 sectores con ETFs 3x.
Responde SOLO JSON. Sin texto fuera.`;

  const summary = analyses
    .map((a) =>
      `${String(a.sector).toUpperCase()}: signal=${a.signal} conviction=${a.conviction} ticker=${a.ticker_recomendado} timing=${a.timing} — ${a.reasoning}`
    )
    .join("\n");

  const user = `ANÁLISIS COMPLETO DE LOS 8 SECTORES:
${summary}

Elige el top 1-2 sectores para entrar HOY con ETF 3x.
Justifica por qué estos sobre los demás: convicción, timing, riesgo decay, contexto macro.
Indica también cuáles evitar y por qué.

JSON:
{
  "top_picks": [
    {
      "sector": string,
      "ticker": string,
      "conviction": number,
      "why_top": "<120 chars — por qué este sobre los demás"
    }
  ],
  "market_summary": "<200 chars — visión general de Lake sobre el mercado hoy",
  "avoid": ["sector1", "sector2"],
  "avoid_reason": "<100 chars — por qué evitar estos"
}`;

  const result = await claudeJSON(system, user, "claude-opus-4-7");

  await upsertCache({
    sector: "_ranking",
    analysis: result,
    spy_price_snapshot: spyPrice,
    analyzed_at: new Date().toISOString(),
  });

  return result;
}

// ── Existing strategy analyzers (unchanged) ───────────────────────────────────

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { ticker, strategy, technicals } = body;

    if (!strategy) {
      return new Response(JSON.stringify({ error: "strategy requerida" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown>;

    // ── Frerautiano sector rotation strategies ──
    if (strategy === "frerautiano_init") {
      const techSpy = technicals?.spy ?? {};
      result = await frerautianoInit(techSpy);

    } else if (strategy === "frerautiano_sector") {
      const { sector, regime, vix_assessment, order_rank } = body;
      if (!sector || !regime) {
        return new Response(JSON.stringify({ error: "sector y regime requeridos" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      result = await frerautianoSector(
        sector,
        regime,
        vix_assessment ?? "",
        order_rank ?? 0,
        technicals ?? {},
      );

    } else if (strategy === "frerautiano_ranking") {
      const { analyses, spy_price } = body;
      if (!analyses || !Array.isArray(analyses)) {
        return new Response(JSON.stringify({ error: "analyses array requerido" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      result = await frerautianoRanking(analyses, spy_price ?? 0);

    // ── Existing strategies ──
    } else {
      if (!ticker) {
        return new Response(JSON.stringify({ error: "ticker requerido" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const t = technicals ?? {};
      const research = await sonarResearch(ticker.toUpperCase(), strategy);

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
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
