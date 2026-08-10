# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Stickerizer is a Telegram bot (TypeScript/Node.js) that generates "quote sticker" images. Users invoke it via Telegram inline mode (`@BotName text`); the bot renders the user's name, avatar, and message text as a styled chat-bubble image (screenshotted via headless Chrome) and returns it as a sticker in the inline results.

## Commands

- `npm run start` — run the bot directly via `ts-node src/index.ts` (no compile step needed for dev)
- `npm run build` — compile TypeScript to `dist/` via `tsc`
- `npm run benchmark` — run `src/Benchmark/benchmark.ts`: exercises `StickerGenerator.renderMessage` in isolation (no bot token/`config.json` needed) with fixed scenarios, in both sequential (per-request latency) and concurrent (throughput under `maxConcurrency`-level load) modes — use this to measure the effect of rendering-pipeline changes before/after
- There is no test suite configured (`npm test` is a stub that exits with an error) and no lint script

## Configuration

The app requires a JSON config file validated against a zod schema (`src/Configuration/Config.ts`):
- `bot.token` — Telegram BotFather token
- `bot.bufferChatId` — a chat/user id the bot can write to; used as a workaround to convert a generated image into a Telegram sticker (see "Sticker generation flow" below)
- `app.logLevel` — pino log level (default `info`)

Config file location: set via `CONFIG_PATH` env var, otherwise defaults to `config.json` in the working directory. Copy `config.example.json` as a starting point.

## Architecture

### Request flow
`src/index.ts` wires everything together at startup: reads config, creates a `pino` logger, builds a `StickerGenerator` (launches a puppeteer-cluster browser pool), creates a `TelegramBot` (node-telegram-bot-api, polling mode), and registers a single `InlineQueryHandler`.

Per inline query (`src/Telegram/InlineQueryHandler.ts`):
1. Look up the sender's avatar URL via `AvatarLoader` (cached).
2. Render the sticker image via `StickerGenerator.renderMessage`.
3. **Sticker generation workaround**: Telegram's Bot API has no direct "raw image → inline sticker result" path, so the generated image is first sent as a real message to `config.bot.bufferChatId` via `bot.sendSticker`, and the `file_id` Telegram assigns to that message is reused as the `sticker_file_id` in the inline query answer.
4. Answer the inline query with that sticker result.
5. Every step is timed via a per-request `TimeMeasurer` and logged at debug level; failures are caught and logged at the handler level (a failed query is simply left unanswered).

### Sticker rendering (`src/Generator/`)
- `Generator.ts` (`StickerGenerator`) owns a `puppeteer-cluster` `Cluster` (`CONCURRENCY_PAGE` — one shared browser, a fresh page per task; no per-request browser-context isolation is needed since no page ever holds cross-user state, and `puppeteer-cluster` recreates the page fresh for every task regardless of concurrency mode — max 16 concurrent, 5s timeout). `renderMessage` compiles HTML from `MessageTemplate`, loads it into a cluster page (`waitUntil: 'domcontentloaded'`, safe because the template has no external subresources left once avatars are inline data URIs), and screenshots the `.container` element as webp with a transparent background. The `setContent` and `screenshot` calls are individually timed via the caller's `TimeMeasurer` to make future performance regressions/improvements measurable.
- `MessageTemplate.ts` is a Handlebars template (compiled once at module load) producing a chat-bubble UI (CSS mask-based speech bubble shapes) with a client-side `<script>` that scales the bubble to fit within a 512×512 sticker canvas. Two custom Handlebars helpers are registered globally: `firstChar` and `isEmpty` (used to fall back to an initial-letter avatar when no avatar URL is available).
- `titleColor` (the username color) is chosen deterministically from `src/Styles/ColorsMap.ts` by `userId % 7`.

### Avatars (`src/Telegram/AvatarLoader.ts`)
Fetches the user's first profile photo via the Bot API, resolves it to a `https://api.telegram.org/file/bot<token>/<path>` URL, then downloads the bytes and caches them as a `data:` URI. Results are cached (`src/Cache/`, `InMemoryCacheProvider` using `memory-cache`, 1h TTL) keyed by Telegram user id, since profile photos rarely change and this avoids both a Bot API round trip and an in-browser network fetch per query — embedding the image inline lets the render step's `page.setContent()` resolve without waiting on an external image load. A failed avatar fetch degrades gracefully to `''` (falls back to the initial-letter avatar in the template) rather than failing the render.

### Cache and time-measurement abstractions
`CacheProvider<TKey, TValue>` is a small interface with a single concrete implementation (`InMemoryCacheProvider`). `TimeMeasurer` has two: `LocalTimeMeasurer` (production — logs step durations to pino) and `CollectingTimeMeasurer` (`src/TimeMeasure/CollectingTimeMeasurer.ts` — collects durations in memory for `getDurations(stepName)`, used by `npm run benchmark`). If extending these, keep new implementations behind the same interface rather than changing call sites.

## Docker

`Dockerfile` is a 3-stage build: install deps → `npm run build` → slim runtime image with Google Chrome Stable installed manually (`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`, since puppeteer's bundled Chromium download is skipped in favor of the apt-installed Chrome) plus `fonts-open-sans` (required for the sticker template's `font-family`). Runs as the non-root `node` user; entrypoint is `node dist/index.js`.