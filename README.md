# tw3184-vercel-week2

Week 2 assignment: a Next.js stock-watchlist page backed by Supabase and deployed on Vercel.

## Environment variables

Copy `.env.example` to `.env.local` and provide:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Development

```bash
npm install
npm run dev
```

The home page fetches rows from the Supabase `stock_watchlist` table and renders them as cards. TradingView widgets add current quotes and an interactive line chart without requiring another API key.
