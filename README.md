# wallet-frontend

Next.js 14 frontend — Wallet, Auth, Call and more.

## Tech Stack
- **Next.js 14** — App Router
- **Tailwind CSS** — Styling
- **Zustand** — Global state management
- **Axios** — HTTP client with JWT interceptor
- **js-cookie** — Cookie management

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (runs on port 3001)
npm run dev
```

App runs at: `http://localhost:3001`

## Build Order (Phases)
- [x] Phase 0+1 — Auth (Google OAuth + JWT + Dashboard)
- [ ] Phase 2 — Wallet (balance + top-up + history)
- [ ] Phase 3 — Call feature (fake call + auto-debit)
- [ ] Phase 4 — DevOps + Deployment
