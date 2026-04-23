# TravelRouter Admin - Frontend

macOS desktop application for managing Raspberry Pi-based travel routers.

## Tech Stack

- **Tauri 2.x** - Rust desktop framework
- **Next.js 16** - React framework with App Router
- **Zustand** - State management
- **Vitest** - Testing

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

## Building macOS App

```bash
# Verify Rust compilation
cd src-tauri && cargo check

# Build Tauri app
cargo tauri build
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── hooks/            # Custom hooks (usePi for API)
├── lib/              # Utilities (store, types)
src-tauri/            # Rust Tauri backend
```

## Configuration

Configure router connection in the app settings. The macOS app communicates with the Pi backend via HTTP API.