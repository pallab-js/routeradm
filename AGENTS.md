# TravelRouter Admin

macOS app for managing travel routers via Tauri + Next.js + FastAPI.

## Commands

```bash
# Frontend (Next.js 16)
cd frontend
npm run dev      # Dev server
npm run build   # Production build
npm run lint    # ESLint
npm run test   # Vitest (all tests)
npx vitest run src/lib/usePi.test.ts   # Single test

# Tauri (Rust)
cd frontend/src-tauri
cargo check              # Verify compile
cargo tauri build        # Build macOS app

# Backend (Python)
cd pi-backend
pip install -r requirements-dev.txt
SECRET_TOKEN="..." ADMIN_PASSWORD="..." python3 -m pytest tests/ -v
```

## Architecture

- `frontend/src/lib/api.ts` - Direct HTTP client (fetch-based, no Tauri proxy)
- `frontend/src/hooks/usePi.ts` - React hook wrapping api.ts
- `frontend/src/lib/store.ts` - Zustand store (persisted)
- `frontend/src-tauri/src/lib.rs` - Tauri Rust (keychain + mDNS only)
- `pi-backend/src/services/` - FastAPI services
  - `_validation.py` - Pure validation functions
  - `utils.py` - Subprocess + permissions helpers
  - `state.py` - SQLite-backed state manager
  - `limiter.py` - Global rate limiter
  - `auth.py` - JWT + static token auth
  - `logger.py` - Structured audit logging

## Key Quirks

1. **Next.js 16** - Uses breaking changes. See `node_modules/next/dist/docs/`.
2. **Vitest** - `@` alias -> `./src`. jsdom environment.
3. **Direct API calls** - Frontend calls Pi API directly via `fetch()` (no Tauri proxy)
4. **Credentials** - Stored in macOS Keychain via `keyring` crate. Never log tokens.
5. **CI target** - Uses `aarch64-apple-darwin` (Apple Silicon).
6. **Auth** - Dual auth: static token (legacy) + JWT from `/api/login`

## Testing

```bash
# Frontend
cd frontend && npm run test

# Python backend
cd pi-backend
SECRET_TOKEN="test-token-32-chars-minimum" ADMIN_PASSWORD='...' python3 -m pytest tests/
```

## Security

- Tokens stored in macOS Keychain
- JWT tokens with 24h expiry (configurable)
- SQLite with WAL mode for concurrent access
- Log files fall back to `/tmp` if `/var/log` unwritable
- Rate limited per-endpoint (10-60/min) + auth throttled indirectly
