import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import styles from "./page.module.css";

type ReadingItem = {
  id: number;
  title: string;
  category: string;
  status: string;
  rating: number;
};

async function getReadingList(): Promise<ReadingItem[]> {
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
    .from("reading_list")
    .select("id, title, category, status, rating")
    .order("id");

  if (error) {
    throw new Error(`Unable to load the reading list: ${error.message}`);
  }

  return data;
}

export default async function Home() {
  const readingList = await getReadingList();

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Hello Supabase</p>
            <h1>My reading list</h1>
            <p className={styles.intro}>
              A small collection fetched live from a Supabase table.
            </p>
          </div>
          <div className={styles.count}>
            <strong>{readingList.length}</strong>
            <span>books</span>
          </div>
        </header>

        <ul className={styles.grid}>
          {readingList.map((item) => (
            <li className={styles.card} key={item.id}>
              <div className={styles.cardTop}>
                <span className={styles.category}>{item.category}</span>
                <span className={styles.status}>{item.status}</span>
              </div>
              <h2>{item.title}</h2>
              <p className={styles.rating} aria-label={`${item.rating} out of 5 stars`}>
                {"★".repeat(item.rating)}
                <span>{"★".repeat(5 - item.rating)}</span>
              </p>
            </li>
          ))}
        </ul>

        <footer className={styles.footer}>
          <span className={styles.dot} />
          Live data from Supabase
        </footer>
      </div>
    </main>
  );
}
