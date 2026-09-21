import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import MarketWidgets from "./market-widgets";
import styles from "./page.module.css";

type StockItem = {
  id: number;
  ticker: string;
  company_name: string;
  sector: string;
  watch_status: string;
  target_price: number;
};

async function getStockWatchlist(): Promise<StockItem[]> {
  await connection();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("stock_watchlist")
    .select("id, ticker, company_name, sector, watch_status, target_price")
    .order("ticker");

  if (error) {
    throw new Error(`Unable to load the stock watchlist: ${error.message}`);
  }

  return data;
}

export default async function Home() {
  const stocks = await getStockWatchlist();

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Market watch · Supabase</p>
            <h1>Stock watchlist</h1>
            <p className={styles.intro}>
              Companies on my radar, fetched live from a Supabase table.
            </p>
          </div>
          <div className={styles.count}>
            <strong>{stocks.length}</strong>
            <span>stocks</span>
          </div>
        </header>

        <MarketWidgets
          symbols={stocks.map((stock) => ({
            ticker: stock.ticker,
            companyName: stock.company_name,
          }))}
        />

        <ul className={styles.grid}>
          {stocks.map((stock) => (
            <li className={styles.card} key={stock.id}>
              <div className={styles.cardTop}>
                <span className={styles.ticker}>{stock.ticker}</span>
                <span className={styles.status}>{stock.watch_status}</span>
              </div>
              <h2>{stock.company_name}</h2>
              <div className={styles.cardFooter}>
                <span className={styles.sector}>{stock.sector}</span>
                <p className={styles.target}>
                  <span>Target</span>
                  ${Number(stock.target_price).toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <footer className={styles.footer}>
          <span className={styles.dot} />
          Watchlist data from Supabase
        </footer>
      </div>
    </main>
  );
}
