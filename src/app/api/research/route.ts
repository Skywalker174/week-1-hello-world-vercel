import { NextRequest, NextResponse } from "next/server";

const allowedSymbols = new Set([
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META",
  "AMD", "JPM", "XOM", "UNH", "COST", "SPY", "QQQ",
]);

const positiveWords = [
  "beat", "beats", "growth", "gain", "gains", "record", "upgrade",
  "surge", "strong", "profit", "profits", "rally", "outperform", "deal",
  "launch", "expands", "approval", "optimistic", "rise", "rises", "high",
  "highs", "climb", "boost", "bullish", "jump", "jumps", "demand", "wins",
];
const negativeWords = [
  "miss", "misses", "drop", "drops", "fall", "falls", "cut", "cuts",
  "downgrade", "lawsuit", "probe", "risk", "risks", "weak", "loss",
  "losses", "slump", "recall", "warning", "concern",
  "down", "lower", "plunge", "tumble", "trouble", "bearish", "pressure",
  "investigation",
];

type YahooChart = {
  chart?: { result?: Array<{
    timestamp?: number[];
    indicators?: { quote?: Array<{ close?: Array<number | null> }> };
  }> };
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function headlineTone(title: string) {
  const words = title.toLowerCase();
  const positive = positiveWords.filter((word) => words.includes(word)).length;
  const negative = negativeWords.filter((word) => words.includes(word)).length;
  return Math.sign(positive - negative);
}

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractTag(block: string, tag: string) {
  return decodeXml(block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? "");
}

function parseGoogleNews(xml: string) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6).map((match) => {
    const block = match[1];
    const title = extractTag(block, "title");
    return {
      title,
      publisher: extractTag(block, "source") || "Google News source",
      url: extractTag(block, "link"),
      publishedAt: Math.floor(new Date(extractTag(block, "pubDate")).getTime() / 1000),
      tone: headlineTone(title),
    };
  }).filter((item) => item.title && item.url && Number.isFinite(item.publishedAt));
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "AAPL").toUpperCase();
  if (!allowedSymbols.has(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d&includePrePost=false`;
  const newsQuery = encodeURIComponent(`${symbol} stock when:7d`);
  const newsUrl = `https://news.google.com/rss/search?q=${newsQuery}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const headers = { "User-Agent": "Mozilla/5.0" };
    const [chartResponse, newsResponse] = await Promise.all([
      fetch(chartUrl, { cache: "no-store", headers }),
      fetch(newsUrl, { cache: "no-store", headers }),
    ]);
    if (!chartResponse.ok || !newsResponse.ok) throw new Error("Upstream request failed");

    const chartPayload = (await chartResponse.json()) as YahooChart;
    const newsXml = await newsResponse.text();
    const chart = chartPayload.chart?.result?.[0];
    const closes = (chart?.indicators?.quote?.[0]?.close ?? []).filter(
      (price): price is number => typeof price === "number",
    );
    if (closes.length < 3) throw new Error("Not enough price history");

    const first = closes[0];
    const last = closes[closes.length - 1];
    const monthlyReturn = ((last - first) / first) * 100;
    const dailyReturns = closes.slice(1).map((price, index) =>
      ((price - closes[index]) / closes[index]) * 100,
    );
    const averageReturn = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce(
      (sum, value) => sum + (value - averageReturn) ** 2,
      0,
    ) / dailyReturns.length;
    const dailyVolatility = Math.sqrt(variance);

    const news = parseGoogleNews(newsXml);

    const toneTotal = news.reduce((sum, item) => sum + item.tone, 0);
    const technicalScore = Math.round(clamp(50 + monthlyReturn * 2.2));
    const sentimentScore = Math.round(clamp(50 + toneTotal * 9));
    const riskScore = Math.round(clamp(100 - dailyVolatility * 18));
    const overallScore = Math.round(
      technicalScore * 0.45 + sentimentScore * 0.35 + riskScore * 0.2,
    );
    const outlook = overallScore >= 65 ? "Constructive" : overallScore <= 40 ? "Cautious" : "Neutral";

    return NextResponse.json({
      symbol,
      asOf: Date.now(),
      price: last,
      monthlyReturn,
      dailyVolatility,
      scores: {
        overall: overallScore,
        technical: technicalScore,
        sentiment: sentimentScore,
        risk: riskScore,
      },
      outlook,
      news,
      methodology: "45% price trend · 35% headline tone · 20% volatility control",
    });
  } catch {
    return NextResponse.json({ error: "Research data is temporarily unavailable" }, { status: 502 });
  }
}
