# routine-optimizer

A personal growth tracker with category-aware Studies and Gym experiences, CSV imports, progress reporting, workout scheduling, and authenticated cloud sync.

## Backend

- Netlify Identity authenticates each user.
- The `/api/data` Netlify Function validates and stores application data.
- Netlify Blobs provides a free, durable database keyed by the authenticated user ID.
- IndexedDB remains as an offline browser cache and existing local data is uploaded after the first sign-in.

## Development

```bash
npm install
npx netlify dev
```

Use `npm run dev` only when working on frontend-only UI that does not require Identity or the hosted API.

## Production build

```bash
npm run build
```
