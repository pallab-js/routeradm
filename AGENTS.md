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

# Run single test
npx vitest run src/lib/usePi.test.ts

# Tauri (Rust)
cd frontend/src-tauri
cargo check              # Verify compile
cargo tauri build        # Build macOS app (.app in src-tauri/target/release/bundle)
```

## Architecture

- `frontend/` - Tauri + Next.js 16 app (App Router)
- `frontend/src-tauri/` - Rust Tauri backend
- `pi-backend/` - FastAPI on Raspberry Pi
- `frontend/src/hooks/usePi.ts` - Router API hook
- `frontend/src/lib/store.ts` - Zustand store

## Key Quirks

1. **Next.js 16** - Uses breaking changes. See `node_modules/next/dist/docs/`.
2. **Vitest** - `@` alias -> `./src`. jsdom environment.
3. **Tauri invoke** - Frontend calls Rust via `invoke()`. Tests mock with `vi.mock`.
4. **Credentials** - Stored in macOS Keychain via `keyring` crate. Never log tokens.
5. **URL validation** - All commands validate URL scheme (http/https) in Rust.
6. **CI target** - Uses `aarch64-apple-darwin` (Apple Silicon).

## Testing

```bash
# All tests
npm run test

# Single file
npx vitest run src/lib/usePi.test.ts

# Watch
npx vitest
```

## Security

- Tokens stored in macOS Keychain
- URL validated on all backend commands
- HTTP warns in logs, HTTPS recommended