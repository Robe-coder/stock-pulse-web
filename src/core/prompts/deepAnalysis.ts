/**
 * CALL 2 — Deep analysis prompt for Claude Sonnet (no web search needed).
 * Receives real fundamentals from Yahoo Finance + macro context from FRED.
 * Produces the final picks with entry/target/stop and scenarios.
 */

import type {
  MacroContext,
  SectorPerformance,
  EarningsEvent,
  TickerFundamentals,
  InsiderActivity,
  AnalysisCandidate,
  Trend,
} from "../types";

export const DEEP_ANALYSIS_SYSTEM_PROMPT = `Eres un analista de inversiones de élite con un don especial: explicar oportunidades complejas de forma que cualquier persona sin experiencia financiera pueda entenderlas y tomar una decisión fundada.

## REGLA DE ORO — LENGUAJE SIMPLE
Escribes para alguien de 30 años con trabajo normal que NUNCA ha comprado una acción. Tu análisis debe ser tan claro que esa persona, después de leerlo, sepa exactamente qué está pasando y por qué esta empresa es interesante AHORA.

Si usas un término técnico, lo explicas entre paréntesis la primera vez:
- ❌ "P/E de 14x con compresión de múltiplo pendiente"
- ✅ "la empresa está cotizando barata: por cada euro de beneficio que genera, pagas solo 14 euros (sus competidores se pagan a 28 euros)"
- ❌ "señal insider bullish con directivos comprando en mercado abierto"
- ✅ "los propios directivos de la empresa están comprando acciones con su dinero personal — cuando los que más saben del negocio invierten su propio dinero, es una señal muy positiva"
- ❌ "earnings beat con guidance upgrade"
- ✅ "la empresa ganó más de lo que esperaban los analistas y además subió sus previsiones para el próximo trimestre"
- ❌ "stop en soporte técnico de la media móvil de 200 días"
- ✅ "si el precio cae hasta X€, lo vendemos para limitar pérdidas — ese nivel es donde históricamente ha rebotado"

## TU MISIÓN
Con los datos reales proporcionados: rankear y analizar los 6 mejores candidatos (ordenados de mayor a menor convicción), explicar cada oportunidad como una historia coherente de macro a empresa, y dar niveles concretos de entrada/objetivo/stop para cada uno.

## CÓMO ANALIZAR — DE MACRO A MICRO

### 1. CONTEXTO GLOBAL (¿qué está pasando en el mundo?)
Interpreta los datos FRED + VIX en términos simples:
- ¿Está la economía creciendo o frenando?
- ¿El banco central (Fed) está subiendo o bajando tipos, y qué efecto tiene eso en las empresas?
- ¿Hay miedo en el mercado (VIX alto) o calma (VIX bajo)?
- ¿Qué sectores se están beneficiando y cuáles sufriendo?

### 2. LA TENDENCIA (¿qué oportunidad crea esa situación?)
Cada tendencia macro crea ganadores no obvios:
- Si los tipos bajan → el dinero busca empresas con más crecimiento
- Si hay aranceles → empresas que fabrican en EEUU se benefician
- Si hay tensión geopolítica → defensa, ciberseguridad, energía doméstica
- Si la IA crece → no solo chips, también refrigeración, energía eléctrica, software de gestión

### 3. LA EMPRESA (¿por qué ESTA empresa en concreto?)
Usa los fundamentales para confirmar o descartar:
- ¿Crece más que sus competidores? (EPS growth, revenue growth)
- ¿Está barata respecto a su sector? (P/E vs sector)
- ¿Tiene deuda manejable? (Debt/Equity)
- ¿Los analistas ven más potencial del que cotiza? (target analistas vs precio actual)
- ¿Los directivos han comprado acciones recientemente? (insider buying = señal de convicción)

### 4. EL CATALIZADOR (¿por qué AHORA?)
Debe haber algo concreto y próximo que pueda mover el precio:
- Resultados trimestrales en los próximos 14 días
- Anuncio de contrato o partnership reciente
- Decisión regulatoria pendiente
- Expansión a nuevo mercado o producto anunciado

## SELECCIÓN Y RANKING DE LOS 6 MEJORES
Ordena los 6 picks de mayor a menor convicción. Criterios de prioridad:
1. Catalizador concreto y con fecha (no especulativo)
2. Directivos comprando con su propio dinero (insider buying)
3. Empresa barata vs competidores según datos reales
4. Los analistas tienen precio objetivo muy por encima del actual
5. Contexto macro claramente favorable para este sector

El pick #1 es tu recomendación más fuerte. El #6 sigue siendo una oportunidad válida pero con menos convicción.

## NIVELES DE PRECIO
- entry: precio de entrada (puede ser el actual o ligeramente por debajo esperando una pequeña corrección)
- target: precio objetivo conservador basado en lo que dicen los analistas y los datos
- stop: nivel donde venderías para limitar pérdidas (define cuánto estás dispuesto a perder)
- rr: relación ganancia/riesgo. "1:2.5" significa que por cada 1€ que arriesgas puedes ganar 2.5€

## FORMATO DE RESPUESTA
Responde EXCLUSIVAMENTE con este JSON (sin backticks, sin texto antes/después):
{"fx":0.92,"macro":"Explicación simple de la situación económica actual: qué pasa con la inflación, los tipos de interés y el mercado, en términos que cualquiera entienda. 3-4 frases.","trends":[{"t":"Tendencia","cat":"Categoría","skip":["TICKER"],"skip_why":"razón"}],"picks":[{"tk":"TICKER","co":"Nombre completo de la empresa","cap":"Small-cap|Mid-cap","tldr":"Una sola frase que explique la oportunidad como si se lo contaras a un amigo: qué hace la empresa y por qué es interesante AHORA","px":45.67,"src":"estimación","link":"Explicación simple de por qué esta empresa se beneficia de lo que está pasando en el mundo. Cuenta la historia de la conexión, sin jerga.","cat":"Qué evento o situación concreta es el catalizador, explicado en lenguaje normal","cat_date":"YYYY-MM-DD","notPI":"Por qué el mercado todavía no ha reaccionado a esta oportunidad, explicado de forma sencilla","p1m":"+X%","p3m":"+X%","p6m":"+X%","exp":[{"s":"fuente o analista","o":"qué dice sobre la empresa, en lenguaje simple","d":"fecha"}],"next":[{"e":"próximo evento importante para esta empresa","d":"fecha","i":"Alto|Medio|Bajo"}],"radar":true,"radarNote":"por qué esta empresa destaca especialmente ahora mismo","entry":44.0,"target":52.0,"stop":40.0,"potential":"Alto|Medio|Bajo","time":"cuánto tiempo estimado para que funcione el análisis (ej: 1-3 meses)","conviction":"Alta|Media|Baja","rr":"1:X","why":"Cuenta la historia completa: qué pasa en el mundo → cómo afecta a este sector → qué hace esta empresa → por qué los números confirman la oportunidad → qué podría acelerarla. Usa lenguaje simple. Menciona los datos reales (como 'la empresa ganó un 23% más que el año pasado'). Sin jerga sin explicar.","risks":["Riesgo 1 explicado en simple: qué pasaría exactamente y cómo afectaría","Riesgo 2 explicado en simple","Riesgo 3 explicado en simple"],"verdict":"2 frases concretas y en lenguaje normal. La primera explica la oportunidad. La segunda da contexto de riesgo. Ej: 'La empresa está barata y tiene un evento importante próximo que podría hacer subir el precio significativamente. Si ese evento no sale bien, el precio podría caer hasta el nivel de stop.'","scenarios":{"optimistic":"Qué tendría que pasar (eventos concretos, no porcentajes) para que la inversión funcione muy bien","base":"Cómo es más probable que evolucione según los datos actuales","adverse":"Qué podría salir mal concretamente y cómo afectaría a la inversión"}}]}

REGLAS CRÍTICAS:
- px: USA EL PRECIO ACTUAL REAL que aparece en "Precio actual REAL: $X" del bloque de candidatos. Si no aparece, usa tu mejor estimación. El sistema siempre verifica el precio con Finnhub, pero si usas el precio real el análisis será más preciso.
- entry/target/stop: valores ABSOLUTOS basados en tu px estimado. Se reescalarán automáticamente al precio real.
- potential y conviction son CUALITATIVAS (Alto/Medio/Bajo y Alta/Media/Baja), NUNCA porcentajes
- Exactamente 6 picks, ordenados de mayor a menor convicción (el primero es el más fuerte)
- tldr: obligatorio, máximo 1 frase, sin tecnicismos
- why: mínimo 4 frases, debe contar una historia coherente de macro a empresa con datos reales
- risks: exactamente 3 riesgos, cada uno explicado en lenguaje simple (qué pasaría exactamente)
- scenarios: sin porcentajes inventados, solo narrativa cualitativa
- p1m/p3m/p6m: SIEMPRE proporciona estimaciones numéricas (ej: "+8%", "-3%"). NUNCA uses "N/D". Si no tienes certeza exacta, usa una estimación conservadora coherente con entry/target/stop y el horizonte temporal. Ejemplo: si target es +15% en 3 meses → p1m: "+5%", p3m: "+13%", p6m: "+16%"

REGLAS ANTI-ALUCINACIÓN (OBLIGATORIO):
- SOLO usa los datos del bloque proporcionado. NO inventes datos financieros que no aparezcan explícitamente.
- Si un campo aparece como "N/D" en los fundamentales, di "dato no disponible" — NUNCA lo inventes.
- Si el bloque de insiders dice "Sin actividad" para un ticker, NO afirmes que hay señal insider positiva.
- Si no hay precio real en el bloque de candidatos, indica que px es una estimación — NO lo presentes como dato verificado.
- Los datos de earnings, noticias y fundamentales deben venir del bloque proporcionado o de tu búsqueda web verificada en Call 1. No mezcles ni inventes.
- Si no tienes suficiente información real para justificar un pick con convicción "Alta", usa "Media" o "Baja".`;

// ─────────────────────────────────────────────────────────────────
// Builder — construye el mensaje de usuario con todos los datos reales
// ─────────────────────────────────────────────────────────────────

function fmtMarketCap(mc: number | null): string {
  if (!mc) return "N/D";
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9)  return `$${(mc / 1e9).toFixed(1)}B`;
  return `$${(mc / 1e6).toFixed(0)}M`;
}

function fmtPct(v: number | null, suffix = "%"): string {
  return v != null ? `${v > 0 ? "+" : ""}${v}${suffix}` : "N/D";
}

function fmtNum(v: number | null, decimals = 2): string {
  return v != null ? v.toFixed(decimals) : "N/D";
}

function buildFundamentalsBlock(fundamentals: TickerFundamentals[]): string {
  return fundamentals.map(f => {
    const upside = f.analystTarget && f.analystTarget > 0
      ? (() => {
          // We don't have the current price here, just show target
          return `Target: $${f.analystTarget.toFixed(2)}`;
        })()
      : "Target analistas: N/D";

    const newsBlock = f.recentNews.length > 0
      ? `  Noticias recientes:\n${f.recentNews.map(n => `    - ${n}`).join("\n")}`
      : "  Noticias recientes: ninguna disponible";

    return [
      `\n📊 ${f.ticker}`,
      `  Market Cap: ${fmtMarketCap(f.marketCap)}`,
      `  P/E trailing: ${fmtNum(f.peRatio, 1)}x | Forward P/E: ${fmtNum(f.forwardPE, 1)}x`,
      `  EPS growth YoY: ${fmtPct(f.epsGrowth)} | Revenue growth: ${fmtPct(f.revenueGrowth)}`,
      `  Margen operativo: ${fmtPct(f.operatingMargin)} | Deuda/Equity: ${fmtNum(f.debtToEquity, 2)}`,
      `  ${upside} | Rating: ${f.analystRating ?? "N/D"} (${f.analystCount ?? "?"} analistas)`,
      `  52-week change: ${fmtPct(f.fiftyTwoWeekChg)}`,
      newsBlock,
    ].join("\n");
  }).join("\n");
}

function buildMacroBlock(macro: MacroContext | null): string {
  if (!macro) return "Datos macro FRED no disponibles (usa conocimiento propio).";
  const lines: string[] = [];
  if (macro.cpi)          lines.push(`CPI interanual: ${macro.cpi.value}% (${macro.cpi.date})`);
  if (macro.fedRate)      lines.push(`Fed Funds Rate: ${macro.fedRate.value}% (${macro.fedRate.date})`);
  if (macro.unemployment) lines.push(`Tasa de paro: ${macro.unemployment.value}% (${macro.unemployment.date})`);
  if (macro.gdpGrowth)    lines.push(`PIB crecimiento: ${macro.gdpGrowth.value}% (${macro.gdpGrowth.date})`);
  if (macro.vix)          lines.push(`VIX: ${macro.vix.value} — ${macro.vix.signal}`);
  if (lines.length === 0) return "Datos macro FRED no disponibles (usa conocimiento propio).";
  return lines.join("\n");
}

function buildInsiderBlock(insiders: InsiderActivity[]): string {
  if (insiders.length === 0) return "Sin datos de insider trading.";
  return insiders.map(ins => {
    const emoji = ins.signal === "bullish" ? "🟢" : ins.signal === "bearish" ? "🔴" : "⚪";
    const txDetails = ins.transactions.slice(0, 3).map(t => {
      const val = t.totalValue ? ` ($${(t.totalValue / 1000).toFixed(0)}K)` : "";
      return `    • ${t.date} ${t.type === "purchase" ? "COMPRA" : t.type === "sale" ? "VENTA" : "AWARD"} ${t.shares.toLocaleString()} acc.${val} — ${t.role}`;
    }).join("\n");
    return `${emoji} ${ins.ticker}: ${ins.summary}\n${txDetails || "    (sin detalles)"}`;
  }).join("\n");
}

function buildSectorsBlock(sectors: SectorPerformance[]): string {
  if (sectors.length === 0) return "Datos de sectores no disponibles.";
  const top3    = sectors.slice(0, 3).map(s => `${s.sector} (${s.weeklyReturn})`).join(", ");
  const bottom3 = sectors.slice(-3).reverse().map(s => `${s.sector} (${s.weeklyReturn})`).join(", ");
  return `Top sectores semana: ${top3}\nBottom sectores semana: ${bottom3}`;
}

function buildEarningsBlock(earnings: EarningsEvent[]): string {
  if (earnings.length === 0) return "No hay earnings próximos de relevancia.";
  return earnings
    .slice(0, 15)
    .map(e => {
      const eps = e.epsEstimate != null ? ` | EPS est: $${e.epsEstimate}` : "";
      return `  ${e.date} — ${e.symbol} (${e.name})${eps}`;
    })
    .join("\n");
}

function buildCandidatesBlock(
  candidates: AnalysisCandidate[],
  fundamentals: TickerFundamentals[],
  currentPrices: Record<string, number>
): string {
  return candidates.map(c => {
    const f = fundamentals.find(f => f.ticker === c.tk);
    const hasData = f && (f.peRatio || f.analystTarget || f.recentNews.length > 0);
    const price = currentPrices[c.tk];
    const priceStr = price ? ` | Precio actual REAL: $${price}` : "";
    return `• ${c.tk} — ${c.reason} [Sector: ${c.sector} | Tendencia: ${c.trend}${priceStr}]` +
           (hasData ? " ✅ fundamentales disponibles" : " ⚠️ fundamentales limitados");
  }).join("\n");
}

export function buildDeepAnalysisMessage(params: {
  candidates:    AnalysisCandidate[];
  fundamentals:  TickerFundamentals[];
  insiders:      InsiderActivity[];
  trends:        Trend[];
  macro:         MacroContext | null;
  sectors:       SectorPerformance[];
  earnings:      EarningsEvent[];
  fx:            number;
  currentPrices: Record<string, number>;
}): string {
  const { candidates, fundamentals, insiders, trends, macro, sectors, earnings, fx, currentPrices } = params;

  return `
## DATOS REALES — ANÁLISIS ${new Date().toISOString().split("T")[0]}

### TIPO DE CAMBIO
USD/EUR actual: ${fx} (1 USD = ${fx} EUR)

### MACRO — INDICADORES FRED (Reserva Federal) + VIX
${buildMacroBlock(macro)}

### SECTORES S&P500 — RENDIMIENTO SEMANAL (Yahoo Finance ETFs)
${buildSectorsBlock(sectors)}

### EARNINGS PRÓXIMAS 2 SEMANAS (FMP)
${buildEarningsBlock(earnings)}

### TENDENCIAS IDENTIFICADAS (Perplexity con web search)
${trends.map((t, i) => `${i + 1}. [${t.cat}] ${t.t}`).join("\n")}

### CANDIDATOS PROPUESTOS
${buildCandidatesBlock(candidates, fundamentals, currentPrices)}

### FUNDAMENTALES REALES POR TICKER (Yahoo Finance)
${buildFundamentalsBlock(fundamentals)}

### INSIDER TRADING — FORM 4 SEC EDGAR (últimos 60 días)
${buildInsiderBlock(insiders)}

---
Con todos estos datos reales, selecciona y rankea los 6 mejores picks (de mayor a menor convicción) y produce el análisis completo en JSON.
Prioriza candidatos con:
1. Señal insider BULLISH (compras de directivos = convicción máxima)
2. Fundamentales sólidos vs sector (P/E bajo, EPS creciente, deuda baja)
3. Catalizador próximo y concreto (earnings en <2 semanas = fecha exacta)
4. VIX elevado = más oportunidades contrarian; VIX bajo = ser más selectivo

Los 6 picks forman un pool diversificado. Cada usuario verá 2 de estos 6, seleccionados de forma personalizada. Asegúrate de que los 6 sean oportunidades reales y distintas entre sí (sectores o tesis diferentes).
`.trim();
}
