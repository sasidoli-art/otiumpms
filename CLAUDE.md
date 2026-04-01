# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-03-29

## Development Commands

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to database (no migration)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Open Prisma Studio GUI (http://localhost:5555)
npm run db:seed      # Seed database (ts-node seed.ts — creates admin@otiumweek.it)
```

**E2E Tests** (Playwright, Chromium):
```bash
npm run test:e2e         # Run all e2e tests headless
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:ui      # Interactive Playwright UI
```
Tests are in `/e2e/` directory. Requires dev server running or will auto-start one.
Manual smoke testing at `/test` (system sitemap page).

## Architecture

**Stack**: Next.js 16 (App Router) · React 18 · TypeScript 5 · Prisma 5 (Neon PostgreSQL) · NextAuth 4 (JWT) · Tailwind CSS · Zod

**What this is**: Multi-tenant SaaS for event/booking management ("Otium Week"). Two roles: ADMIN (platform operator) and HOST (venue/event manager). Public-facing booking flow for guests.

### Route Structure

| Path | Auth | Purpose |
|------|------|---------|
| `/book/*`, `/checkin/*` | Public | Guest booking flow, self check-in |
| `/(auth)/login` | Public | Login page |
| `/test` | Public | System sitemap / dev navigation page |
| `/host/*` | HOST role | Venue management, bookings, CRM, housekeeping, SPA |
| `/admin/*` | ADMIN role | Platform management, invoicing, host accounts |

**Middleware** (`middleware.ts`): Protects `/host/:path*` and `/admin/:path*` via NextAuth `withAuth`. Redirects wrong-role users to `/login`.

### Data Flow Pattern

Pages are **async server components** that query Prisma directly. All mutations go through **REST API routes** under `app/api/` — client components use `fetch()` + `router.refresh()`. There are **no server actions** (`'use server'`).

### Multi-Tenant Isolation

Every host-scoped query filters by `hostId` from the session. The `requireHost()` guard in `lib/auth-middleware.ts` guarantees `hostId` is non-null.

## Key Patterns

### Authentication & Authorization

- **Session strategy**: JWT (30-day maxAge), CredentialsProvider with bcrypt
- **API route guards**: `requireHost()` and `requireAdmin()` from `lib/auth-middleware.ts` — return typed sessions or 401 NextResponse. Use `isUnauthorized()` type guard to check.
- **Session shape**: `session.user` has `id`, `email`, `name`, `role`, `hostId`

### Validation

All API input validated with **Zod schemas** in `lib/validations.ts`. Use the `parseBody(schema, rawData)` helper which returns `{ data }` or `{ error: NextResponse(422) }`.

### Database

- **Client**: Prisma singleton in `lib/db.ts` with `@neondatabase/serverless` adapter
- **Schema**: `prisma/schema.prisma` — run `db:generate` after any change
- **Core chain**: `Host` → `Struttura` → `UnitaPrenotabile` → `Prenotazione`
- **SPA chain**: `Struttura` → `AppuntamentoSpa` → `WaiverSpa` + `PagamentoSpa`
- **All models**: `Abbonamento`, `AnalyticsGiornalieri`, `AppuntamentoSpa`, `CabinaSpa`, `Chat`, `ComunicazioneStaff`, `Disponibilita`, `DisponibilitaTerapista`, `Evento`, `Fattura`, `Host`, `Messaggio`, `Notifica`, `OspiteCRM`, `Pacchetto`, `Pagamento`, `PagamentoSpa`, `PassaggioPercorso`, `PercorsoBenessere`, `Prenotazione`, `RegolaTariffa`, `SegnalazioneManutenzione`, `Session`, `Struttura`, `TariffaPeriodo`, `TaskHK`, `TerapistaSpa`, `TrattamentoSpa`, `UnitaPrenotabile`, `User`, `WaiverSpa`

### Import Alias

`@/*` maps to the project root (e.g., `@/lib/db`, `@/components/ui/badge`).

## Host Route Map (`/host/*`)

| Path | Purpose |
|------|---------|
| `/host/dashboard` | Main overview dashboard |
| `/host/prenotazioni` | Bookings list + detail |
| `/host/strutture` | Properties management |
| `/host/disponibilita` | Availability calendar |
| `/host/tariffe` | Pricing & rate rules |
| `/host/crm` | Guest CRM + detail |
| `/host/fatture` | Invoices (fatturazione elettronica) |
| `/host/eventi` | Local events |
| `/host/pacchetti` | Packages |
| `/host/alloggiati` | Alloggiati Web (police reporting) |
| `/host/housekeeping` | HK tasks + calendar |
| `/host/manutenzione` | Maintenance reports |
| `/host/staff` | Staff management |
| `/host/notifiche` | Notifications |
| `/host/analytics` | Analytics |
| `/host/report` | Revenue reports |
| `/host/profilo` | Profile & settings |
| `/host/oggi` | Today's arrivals/departures |
| `/host/spa` | SPA dashboard (waiver + payments) |
| `/host/spa/appuntamenti` | SPA appointment board |
| `/host/spa/calendario` | SPA calendar |
| `/host/spa/trattamenti` | Treatments management |
| `/host/spa/percorsi` | Wellness paths management |
| `/host/spa/terapisti` | Therapists management |
| `/host/spa/cabine` | Treatment rooms management |
| `/host/spa/report` | SPA revenue + stats report |
| `/host/spa/gift-card` | Gift Card management |
| `/host/spa/loyalty` | Loyalty program |
| `/host/spa/waiting-list` | Waiting list + turnaway |
| `/host/pos` | Point of Sale terminal |
| `/host/cassa` | Cash register + daily closing |
| `/host/utenti` | Staff user management + invites |
| `/host/help` | Help center |
| `/host/onboarding` | First-time setup wizard |
| `/host/ristorazione/menu` | F&B menu editor |
| `/host/impostazioni-regcard` | Registration card T&C settings |

## SPA Module (Waiver & Payments)

The SPA module enables booking, clinical declarations (waiver), and payment registration.

### Booking Flow (Public)
`/book/[strutturaId]/spa` — 5-step flow:
1. Service selection (trattamenti / percorsi)
2. Date + time slot + therapist preference
3. Guest info form
4. **Waiver + Payment** (both required before advancing)
5. Confirmation

### SPA API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST/GET | `/api/spa/waiver` | Create/retrieve clinical declaration + signature |
| POST/GET | `/api/spa/pagamento` | Register/retrieve payment method + amount |
| GET | `/api/host/spa/appuntamenti` | List appointments with waiver+payment status |
| GET/PATCH | `/api/host/spa/appuntamenti/[id]` | Single appointment detail |
| GET/POST | `/api/host/spa/trattamenti` | Treatments CRUD |
| GET/POST | `/api/host/spa/percorsi` | Wellness paths CRUD |
| GET/POST | `/api/host/spa/terapisti` | Therapists CRUD |
| GET/POST | `/api/host/spa/cabine` | Treatment rooms CRUD |
| GET | `/api/host/spa/calendario` | Calendar data |
| GET | `/api/host/spa/check-disponibilita` | Availability check |
| GET/POST | `/api/book/[strutturaId]/spa` | Public SPA booking data |
| POST | `/api/book/[strutturaId]/spa/prenota` | Create appointment |
| GET | `/api/book/[strutturaId]/spa/disponibilita` | Available slots |
| GET | `/api/book/[strutturaId]/spa/trattamenti` | Public treatment list |
| GET | `/api/cron/reminder-spa` | Cron: send appointment reminders |

### SPA Components (`components/spa/`)

| File | Purpose |
|------|---------|
| `body-map.tsx` | Interactive SVG body map — 14 zones, front/back toggle, trattate/evitare coloring |
| `signature-pad.tsx` | Canvas digital signature with HiDPI (2x) support, base64 export |
| `waiver-spa-form.tsx` | 3-step waiver form: clinica → firma → T&C review |
| `pagamento-spa-form.tsx` | 4-method payment form: CAMERA_CREDIT / CONTANTI / CARTA / TRANSFERWISE |
| `waiver-dashboard.tsx` | Host dashboard: appointments, dichiarazioni cliniche, payment reconciliation |
| `index.ts` | Barrel export |

### SPA Enums

```typescript
enum MetodoPagamentoSpa { CAMERA_CREDIT, CONTANTI, CARTA, TRANSFERWISE }
enum StatoPagamentoSpa  { PENDENTE, RISCOSSO, RIMBORSO_RICHIESTO, RIMBORSATO }
enum StatoAppuntamentoSpa { CONFERMATO, PENDENTE, CANCELLATO, COMPLETATO }
enum CategoriaSpa { ... }
```

### WaiverSpa / PagamentoSpa Contract

**WaiverSpa POST** (`/api/spa/waiver`):
```json
{ "appuntamentoId", "firmaBase64?", "zoneTrattate[]", "zoneEvitare[]", "incinta", "incintaMesi?", "allergie", "patologie", "farmaci", "accettazioneTermini", "accettazionePrivacy", "consensoFoto" }
```

**PagamentoSpa POST** (`/api/spa/pagamento`):
```json
{ "appuntamentoId", "importo", "tipoImporto", "metodo", "unitaId?", "ultime4Cifre?", "noteRiscossione?" }
```

## Lib Directory Reference

| File | Provides |
|------|----------|
| `lib/auth.ts` | NextAuth config (`authOptions`) |
| `lib/auth-middleware.ts` | `requireHost()`, `requireAdmin()`, `isUnauthorized()` |
| `lib/db.ts` | Prisma client singleton |
| `lib/utils.ts` | `cn()`, `formatData()`, `formatValuta()`, `formatDataRelativa()`, enum label/color helpers (`statoPrenotazioneLabel`, `pianoLabel`, etc.) |
| `lib/validations.ts` | Zod schemas + `parseBody()` helper + type guards (`isStatoPrenotazione`, etc.). Also: `waiverSpaSchema`, `pagamentoSpaSchema`, `ZONE_CORPO` constant |
| `lib/email.ts` | Nodemailer SMTP transport (Gmail) |
| `lib/email-templates.ts` | Multi-language email templates (IT/EN/FR) + `sendEmailNuovaPrenotazione()` |
| `lib/ical.ts` | iCal (RFC 5545) generation, HMAC token auth for public calendar URLs |
| `lib/rate-limit.ts` | In-memory sliding-window rate limiter + `getClientIp()` |
| `lib/logger.ts` | Structured logger (`logger.info/warn/error`) |
| `lib/pdf.tsx` | React-PDF invoice/receipt generation |

## Italian Domain Context

- **Alloggiati Web**: Italian police reporting for guest check-in — fields on `Prenotazione` model (guestSesso, guestTipoDocumento, guestComuneNascitaIstat, etc.)
- **Fatturazione elettronica**: Invoice fields include codiceSDI, PEC, regime fiscale, aliquota IVA
- **Locale**: Date formatting uses `it` locale, currency is EUR
- **SPA waiver**: Clinical declarations required before treatment — includes pregnancy flag, zone corpo (14 zones), allergie, patologie, farmaci
