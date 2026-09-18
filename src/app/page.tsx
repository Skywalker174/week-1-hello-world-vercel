import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>My first Next.js app</p>
        <h1>Hello World!</h1>
        <p className={styles.message}>Successfully deployed with Vercel.</p>
      </section>
    </main>
  );
}
