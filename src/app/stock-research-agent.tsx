"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type MarketSymbol = { ticker: string; companyName: string };
type Research = {
  symbol: string;
  asOf: number;
  price: number;
  monthlyReturn: number;
  dailyVolatility: number;
  scores: { overall: number; technical: number; sentiment: number; risk: number };
  outlook: "Constructive" | "Neutral" | "Cautious";
  methodology: string;
  news: Array<{
    title: string;
    publisher: string;
    url: string;
    publishedAt: number;
    tone: -1 | 0 | 1;
  }>;
};

const scoreLabels = {
  technical: "Trend agent",
  sentiment: "News agent",
  risk: "Risk agent",
} as const;

export default function StockResearchAgent({ symbols }: { symbols: MarketSymbol[] }) {
  const [selected, setSelected] = useState(symbols[0]?.ticker ?? "AAPL");
  const [research, setResearch] = useState<Research | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/research?symbol=${encodeURIComponent(selected)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Research request failed");
        const result = (await response.json()) as Research;
        if (active) {
          setResearch(result);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    load();
    const refresh = window.setInterval(load, 5 * 60_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [selected]);

  const company = symbols.find((item) => item.ticker === selected)?.companyName ?? selected;

  return (
    <section className={styles.researchPanel} aria-labelledby="research-title">
      <div className={styles.researchHeading}>
        <div>
          <p className={styles.eyebrow}>Explainable market research</p>
          <h2 id="research-title">AI-style research desk</h2>
          <p>Trend, headlines and risk are scored separately before a combined outlook.</p>
        </div>
        <span className={styles.educationBadge}>Research only · not financial advice</span>
      </div>

      <div className={styles.researchSymbols} aria-label="Choose a stock to research">
        {symbols.map(({ ticker }) => (
          <button
            className={ticker === selected ? styles.activeButton : ""}
            key={ticker}
            onClick={() => setSelected(ticker)}
            type="button"
          >
            {ticker}
          </button>
        ))}
      </div>

      {research?.symbol === selected ? (
        <>
          <div className={styles.researchSummary}>
            <div>
              <span>{company} · {selected}</span>
              <strong className={styles[`outlook${research.outlook}`]}>{research.outlook}</strong>
              <small>{research.methodology}</small>
            </div>
            <div className={styles.scoreRing} style={{ "--score": `${research.scores.overall * 3.6}deg` } as React.CSSProperties}>
              <strong>{research.scores.overall}</strong>
              <span>research score</span>
            </div>
          </div>

          <div className={styles.agentGrid}>
            {(Object.keys(scoreLabels) as Array<keyof typeof scoreLabels>).map((key) => (
              <article key={key}>
                <span>{scoreLabels[key]}</span>
                <strong>{research.scores[key]}</strong>
                <div><i style={{ width: `${research.scores[key]}%` }} /></div>
                <p>
                  {key === "technical" && `${research.monthlyReturn >= 0 ? "+" : ""}${research.monthlyReturn.toFixed(2)}% over one month`}
                  {key === "sentiment" && `${research.news.length} recent, ticker-linked headlines reviewed`}
                  {key === "risk" && `${research.dailyVolatility.toFixed(2)}% average daily volatility`}
                </p>
              </article>
            ))}
          </div>

          <div className={styles.newsBlock}>
            <div className={styles.newsTitle}>
              <h3>Latest news evidence</h3>
              <span>Updated {new Date(research.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {research.news.length ? (
              <ul>
                {research.news.map((item) => (
                  <li key={`${item.url}-${item.publishedAt}`}>
                    <span className={`${styles.toneDot} ${item.tone > 0 ? styles.tonePositive : item.tone < 0 ? styles.toneNegative : ""}`} />
                    <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                    <small>{item.publisher} · {new Date(item.publishedAt * 1000).toLocaleDateString()}</small>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.noNews}>No ticker-linked headlines were returned.</p>}
          </div>
        </>
      ) : (
        <div className={styles.researchState}>{error ? "Research feed is temporarily unavailable." : `Analyzing ${selected}…`}</div>
      )}
    </section>
  );
}
