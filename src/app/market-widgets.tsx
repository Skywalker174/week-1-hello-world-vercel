"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

type MarketSymbol = {
  ticker: string;
  companyName: string;
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
  const tickerConfiguration = {
    symbols: symbols.map(({ ticker, companyName }) => ({
      description: companyName,
      proName: `NASDAQ:${ticker}`,
    })),
    showSymbolLogo: true,
    colorTheme: "dark",
    isTransparent: true,
    displayMode: "adaptive",
    locale: "en",
  };

  const chartConfiguration = {
    symbols: symbols.map(({ ticker, companyName }) => [
      companyName,
      `NASDAQ:${ticker}|1D`,
    ]),
    chartOnly: false,
    width: "100%",
    height: "100%",
    locale: "en",
    colorTheme: "dark",
    autosize: true,
    showVolume: true,
    showMA: false,
    hideDateRanges: false,
    hideMarketStatus: false,
    hideSymbolLogo: false,
    scalePosition: "right",
    scaleMode: "Normal",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "11",
    noTimeScale: false,
    valuesTracking: "1",
    changeMode: "price-and-percent",
    chartType: "line",
    lineWidth: 2,
    lineType: 0,
    dateRanges: ["1d|5", "1w|15", "1m|60", "3m|60", "12m|1D"],
    lineColor: "#34d399",
    topColor: "rgba(52, 211, 153, 0.28)",
    bottomColor: "rgba(7, 17, 15, 0.04)",
    gridLineColor: "rgba(255, 255, 255, 0.06)",
    dateFormat: "MMM dd, yyyy",
    timeHoursFormat: "12-hours",
  };

  const tickerRef = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    tickerConfiguration,
  );
  const chartRef = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js",
    chartConfiguration,
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
      <div className={styles.chart} ref={chartRef} />
      <p className={styles.marketNote}>
        Market data is supplied by TradingView and may be delayed by the exchange.
      </p>
    </section>
  );
}
