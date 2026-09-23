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

The home page fetches rows from the Supabase `stock_watchlist` table and renders them as cards. TradingView provides current quotes, while a native SVG chart loads Yahoo Finance price history and refreshes every 60 seconds without requiring another API key.

The research desk follows the specialist-agent pattern used by financial AI research systems: separate trend, headline-sentiment, and risk scores are combined into an explainable research outlook. It is an educational heuristic, not investment advice.
