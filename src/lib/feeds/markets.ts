import { fetchJson, num } from "../http";
import type { MarketQuote } from "../types";

type ChartResponse = {
  chart: {
    result?: {
      meta: {
        symbol: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        shortName?: string;
      };
      indicators?: { quote: { close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
};

type SymbolDef = { symbol: string; name: string; group: MarketQuote["group"]; yahoo: string };

export const MARKET_SYMBOLS: SymbolDef[] = [
  { symbol: "BTC", name: "Bitcoin", group: "crypto", yahoo: "BTC-USD" },
  { symbol: "ETH", name: "Ethereum", group: "crypto", yahoo: "ETH-USD" },
  { symbol: "SOL", name: "Solana", group: "crypto", yahoo: "SOL-USD" },
  { symbol: "XRP", name: "XRP", group: "crypto", yahoo: "XRP-USD" },
  { symbol: "LMT", name: "Lockheed Martin", group: "defense", yahoo: "LMT" },
  { symbol: "RTX", name: "RTX Corp", group: "defense", yahoo: "RTX" },
  { symbol: "NOC", name: "Northrop Grumman", group: "defense", yahoo: "NOC" },
  { symbol: "GD", name: "General Dynamics", group: "defense", yahoo: "GD" },
  { symbol: "BA", name: "Boeing", group: "defense", yahoo: "BA" },
  { symbol: "PLTR", name: "Palantir", group: "defense", yahoo: "PLTR" },
  { symbol: "LHX", name: "L3Harris", group: "defense", yahoo: "LHX" },
  { symbol: "HII", name: "Huntington Ingalls", group: "defense", yahoo: "HII" },
  { symbol: "CL", name: "WTI Crude", group: "energy", yahoo: "CL=F" },
  { symbol: "BRENT", name: "Brent Crude", group: "energy", yahoo: "BZ=F" },
  { symbol: "NG", name: "Natural Gas", group: "energy", yahoo: "NG=F" },
  { symbol: "XOM", name: "ExxonMobil", group: "energy", yahoo: "XOM" },
  { symbol: "CVX", name: "Chevron", group: "energy", yahoo: "CVX" },
  { symbol: "GOLD", name: "Gold", group: "commodity", yahoo: "GC=F" },
  { symbol: "SILVER", name: "Silver", group: "commodity", yahoo: "SI=F" },
  { symbol: "COPPER", name: "Copper", group: "commodity", yahoo: "HG=F" },
  { symbol: "CORN", name: "Corn", group: "commodity", yahoo: "ZC=F" },
  { symbol: "WHEAT", name: "Wheat", group: "commodity", yahoo: "ZW=F" },
  { symbol: "SPX", name: "S&P 500", group: "index", yahoo: "^GSPC" },
  { symbol: "DJI", name: "Dow Jones", group: "index", yahoo: "^DJI" },
  { symbol: "NDX", name: "Nasdaq", group: "index", yahoo: "^IXIC" },
  { symbol: "VIX", name: "Volatility Index", group: "index", yahoo: "^VIX" },
  { symbol: "RUT", name: "Russell 2000", group: "index", yahoo: "^RUT" },
  { symbol: "EURUSD", name: "EUR / USD", group: "fx", yahoo: "EURUSD=X" },
  { symbol: "USDJPY", name: "USD / JPY", group: "fx", yahoo: "JPY=X" },
  { symbol: "USDINR", name: "USD / INR", group: "fx", yahoo: "INR=X" },
  { symbol: "USDCNY", name: "USD / CNY", group: "fx", yahoo: "CNY=X" },
];

async function fetchQuote(def: SymbolDef): Promise<MarketQuote> {
  const data = await fetchJson<ChartResponse>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.yahoo)}?interval=1d&range=5d`,
    { timeout: 8000 },
  );
  const r = data.chart.result?.[0];
  if (!r?.meta) throw new Error(`no quote for ${def.symbol}`);
  const price = num(r.meta.regularMarketPrice, 0);
  const prev = num(r.meta.chartPreviousClose ?? r.meta.previousClose, price);
  const closes = (r.indicators?.quote?.[0]?.close ?? []).filter((x): x is number => typeof x === "number");
  return {
    symbol: def.symbol,
    name: def.name,
    price,
    change: price - prev,
    changePct: prev ? ((price - prev) / prev) * 100 : 0,
    currency: r.meta.currency,
    group: def.group,
    spark: closes.slice(-12),
  };
}

async function fetchCryptoFallback(): Promise<MarketQuote[]> {
  try {
    const ids = "bitcoin,ethereum,solana,ripple";
    const data = await fetchJson<Record<string, { usd: number; usd_24h_change: number }>>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { timeout: 7000 },
    );
    const map: [string, string][] = [
      ["bitcoin", "BTC"],
      ["ethereum", "ETH"],
      ["solana", "SOL"],
      ["ripple", "XRP"],
    ];
    return map
      .filter(([id]) => data[id])
      .map(([id, sym]) => {
        const d = data[id];
        const prev = d.usd / (1 + d.usd_24h_change / 100);
        return {
          symbol: sym,
          name: sym === "BTC" ? "Bitcoin" : sym === "ETH" ? "Ethereum" : sym === "SOL" ? "Solana" : "XRP",
          price: d.usd,
          change: d.usd - prev,
          changePct: d.usd_24h_change,
          currency: "USD",
          group: "crypto" as const,
        };
      });
  } catch {
    return [];
  }
}

export async function loadMarkets() {
  const quotes: MarketQuote[] = [];
  const errors: string[] = [];
  const batchSize = 5;

  for (let i = 0; i < MARKET_SYMBOLS.length; i += batchSize) {
    const batch = MARKET_SYMBOLS.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fetchQuote));
    results.forEach((r) => {
      if (r.status === "fulfilled") quotes.push(r.value);
      else errors.push(String(r.reason).slice(0, 80));
    });
  }

  if (!quotes.some((q) => q.group === "crypto")) quotes.push(...(await fetchCryptoFallback()));

  const order = ["index", "crypto", "defense", "energy", "commodity", "fx"];
  quotes.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return { quotes, errors: errors.slice(0, 5), source: "Yahoo Finance + CoinGecko" };
}
