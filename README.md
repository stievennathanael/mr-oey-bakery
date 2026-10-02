# Mr. Oey Bakery

Application bakery built with Next.js, Midtrans, and Supabase PostgreSQL.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Fill in `.env.local` with the project credentials. Never commit this file.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public browser settings. `SUPABASE_SECRET_KEY`, `JWT_SECRET`, and the Midtrans server credentials are server-only and must not use the `NEXT_PUBLIC_` prefix.

API routes access Supabase with `SUPABASE_SECRET_KEY`, while application authorization remains enforced by the app's JWT middleware. Keep Supabase RLS enabled; the secret key must only be available to the server.

## Database setup

Import the PostgreSQL schema into the target Supabase project, then run the seed SQL for required data such as `categories`. The application expects the tables defined by the migration: users, categories, products, carts, orders, order_items, payments, payment_logs, and locations.

Product images are stored in the public `product-images` Supabase Storage bucket. It accepts JPEG, PNG, WebP, and GIF files up to 5 MB.

## Verification

```bash
npx tsc --noEmit
npm run build
```
