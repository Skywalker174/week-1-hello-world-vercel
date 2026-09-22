import { NextRequest, NextResponse } from "next/server";

const allowedSymbols = new Set(["AAPL", "MSFT", "NVDA", "TSLA"]);
const rangeSettings: Record<string, { range: string; interval: string }> = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1h" },
};

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const requestedRange = request.nextUrl.searchParams.get("range") ?? "1d";
  const settings = rangeSettings[requestedRange];

  if (!allowedSymbols.has(symbol) || !settings) {
    return NextResponse.json({ error: "Unsupported market query" }, { status: 400 });
  }

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set("range", settings.range);
  url.searchParams.set("interval", settings.interval);
  url.searchParams.set("includePrePost", "true");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error("Upstream market service failed");
    const payload = (await response.json()) as YahooChart;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps.flatMap((time, index) => {
      const price = closes[index];
      return typeof price === "number" ? [{ time, price }] : [];
    });

    if (points.length < 2) throw new Error("Not enough market points");
    return NextResponse.json({ symbol, points });
  } catch {
    return NextResponse.json({ error: "Market data is temporarily unavailable" }, { status: 502 });
  }
}
