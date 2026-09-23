"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type MarketSymbol = {
  ticker: string;
  companyName: string;
};

type PricePoint = {
  time: number;
  price: number;
};

type ChartResponse = {
  symbol: string;
  points: PricePoint[];
};

const ranges = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
] as const;

const exchangeByTicker: Record<string, string> = {
  JPM: "NYSE",
  UNH: "NYSE",
  XOM: "NYSE",
  SPY: "AMEX",
};

function useTradingViewWidget(
  source: string,
  configuration: Record<string, unknown>,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.src = source;
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify(configuration);

    container.append(widget, script);

    return () => {
      container.replaceChildren();
    };
  }, [configuration, source]);

  return containerRef;
}

export default function MarketWidgets({ symbols }: { symbols: MarketSymbol[] }) {
  const tickerConfiguration = useMemo(
    () => ({
      symbols: symbols.map(({ ticker, companyName }) => ({
        description: companyName,
        proName: `${exchangeByTicker[ticker] ?? "NASDAQ"}:${ticker}`,
      })),
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en",
    }),
    [symbols],
  );

  const tickerRef = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    tickerConfiguration,
  );

  return (
    <section className={styles.marketData} aria-label="Live market data">
      <div className={styles.tickerTape} ref={tickerRef} />
      <div className={styles.chartHeader}>
        <div>
          <p className={styles.eyebrow}>Live market data</p>
          <h2>Price history</h2>
        </div>
        <p>Select a symbol or time range inside the chart.</p>
      </div>
      <NativeMarketChart symbols={symbols} />
      <p className={styles.marketNote}>
        Quotes refresh every 60 seconds. Market data from Yahoo Finance and TradingView may be delayed.
      </p>
    </section>
  );
}

function NativeMarketChart({ symbols }: { symbols: MarketSymbol[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]?.ticker ?? "AAPL");
  const [selectedRange, setSelectedRange] = useState<(typeof ranges)[number]["value"]>("1d");
  const [data, setData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPrices = async () => {
      try {
        const response = await fetch(
          `/api/market?symbol=${encodeURIComponent(selectedSymbol)}&range=${selectedRange}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Market data request failed");
        const result = (await response.json()) as ChartResponse;
        if (active) {
          setData(result);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };

    loadPrices();
    const refresh = window.setInterval(loadPrices, 60_000);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [selectedRange, selectedSymbol]);

  const chart = useMemo(() => {
    if (!data?.points.length) return null;
    const prices = data.points.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = Math.max((max - min) * 0.12, max * 0.001);
    const low = min - padding;
    const high = max + padding;
    const width = 1000;
    const height = 360;
    const coordinates = data.points.map((point, index) => {
      const x = (index / Math.max(data.points.length - 1, 1)) * width;
      const y = height - ((point.price - low) / (high - low)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const first = prices[0];
    const last = prices[prices.length - 1];
    return {
      points: coordinates.join(" "),
      area: `0,${height} ${coordinates.join(" ")} ${width},${height}`,
      first,
      last,
      change: ((last - first) / first) * 100,
      min,
      max,
    };
  }, [data]);

  return (
    <div className={styles.nativeChart}>
      <div className={styles.chartControls}>
        <div className={styles.symbolButtons}>
          {symbols.map(({ ticker }) => (
            <button
              className={ticker === selectedSymbol ? styles.activeButton : ""}
              key={ticker}
              onClick={() => setSelectedSymbol(ticker)}
              type="button"
            >
              {ticker}
            </button>
          ))}
        </div>
        <div className={styles.rangeButtons}>
          {ranges.map(({ label, value }) => (
            <button
              className={value === selectedRange ? styles.activeButton : ""}
              key={value}
              onClick={() => setSelectedRange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {chart ? (
        <>
          <div className={styles.priceSummary}>
            <strong>${chart.last.toFixed(2)}</strong>
            <span className={chart.change >= 0 ? styles.positive : styles.negative}>
              {chart.change >= 0 ? "+" : ""}{chart.change.toFixed(2)}%
            </span>
          </div>
          <div className={styles.plot}>
            <span className={styles.highLabel}>${chart.max.toFixed(2)}</span>
            <svg viewBox="0 0 1000 360" preserveAspectRatio="none" role="img" aria-label={`${selectedSymbol} price line chart`}>
              <defs>
                <linearGradient id="market-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" x2="1000" y1="90" y2="90" />
              <line x1="0" x2="1000" y1="180" y2="180" />
              <line x1="0" x2="1000" y1="270" y2="270" />
              <polygon points={chart.area} fill="url(#market-fill)" />
              <polyline points={chart.points} />
            </svg>
            <span className={styles.lowLabel}>${chart.min.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <div className={styles.chartState}>{error ? "Market data is temporarily unavailable." : "Loading price history…"}</div>
      )}
    </div>
  );
}
