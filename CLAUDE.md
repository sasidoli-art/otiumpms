# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-04-01

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

**Stack**: Next.js 16 (App Router) · React 18 · TypeScript 5 · Prisma 5 (Neon PostgreSQL) · NextAuth 4 (JWT) · Tailwind CSS · Zod · next-intl · @sentry/nextjs · otpauth · qrcode · @playwright/test · Recharts · Framer Motion

**What this is**: Multi-tenant SaaS for event/booking management ("Otium Week"). Three roles: **ADMIN** (platform operator), **HOST** (venue/event manager), **SUPERADMIN** (system-wide management). Public-facing booking flow for guests. Modular feature system with 27 activatable modules.

### Route Structure

| Path | Auth | Purpose |
|------|------|---------|
| `/book/*` | Public | Guest booking flow (rooms, SPA, meals, packages) |
| `/checkin/*` | Public | Self check-in |
| `/book/chat/[id]` | Public | Guest chat with host |
| `/(auth)/login` | Public | Login page |
| `/registrazione/[token]` | Public | Staff registration via invite token |
| `/kiosk/[token]` | Public | Tablet kiosk for checkout signing |
| `/kiosk/spa/[cabinaId]` | Public | SPA cabin tablet (waiver signing) |
| `/privacy-policy`, `/terms`, `/cookie-policy` | Public | Legal pages |
| `/test` | Public | System sitemap / dev navigation page |
| `/host/*` | HOST role | Venue management, bookings, CRM, housekeeping, SPA |
| `/admin/*` | ADMIN role | Platform management, invoicing, host accounts |
| `/superadmin/*` | SUPERADMIN | Host management, subscriptions, modules, monitoring |

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
- **F&B chain**: `Struttura` → `ConfigPastoStruttura` → `PastoPrenotazione` → `SceltaPastoOspite`
- **POS chain**: `TransazionePOS` → `VocePOS`; `ChiusuraCassa` → `Incasso`
- **Loyalty chain**: `ProgrammaFedelta` → `LivelloFedelta` → `MembroFedelta` → `MovimentoPunti`
- **74 models total** — key additions since v1: `Ticket`, `StaffMember`, `StaffInvite`, `MenuGiornaliero`, `PiattoMenu`, `SceltaPastoOspite`, `GiftCard`, `GiftCardMovimento`, `TransazionePOS`, `VocePOS`, `ProgrammaFedelta`, `LivelloFedelta`, `MembroFedelta`, `MovimentoPunti`, `WaitingListSpa`, `TurnawayTracking`, `ChiusuraCassa`, `Incasso`, `ConfigPastoStruttura`, `PastoPrenotazione`, `ArticoloMagazzino`, `MovimentoMagazzino`, `PaymentProviderConfig`, `PagamentoCheckout`, `ServizioStruttura`, `PacchettoServizio`, `VocePacchetto`, `AddebitoPrenotazione`, `CanaleEsterno`, `PrenotazioneCanale`, `AlertOspite`, `OggettoSmarrito`, `RegolaUpsell`, `PropostaUpsell`, `DotazioneBiancheria`, `RichiestaBiancheria`, `Trace`, `Accompagnatore`, `AuditLog`, `DotazioneCabinaSpa`, `ConversazioneWhatsApp`, `MessaggioWhatsApp`, `AzioneConcierge`

### Import Alias

`@/*` maps to the project root (e.g., `@/lib/db`, `@/components/ui/badge`).

## Host Route Map (`/host/*`)

| Path | Purpose |
|------|---------|
| `/host/dashboard` | Main overview dashboard |
| `/host/prenotazioni` | Bookings list + detail + new booking |
| `/host/strutture` | Properties management + detail + tariffe |
| `/host/crm` | Guest CRM + detail |
| `/host/fatture` | Invoices (fatturazione elettronica) |
| `/host/eventi` | Local events + new event |
| `/host/pacchetti` | Packages + detail + new |
| `/host/alloggiati` | Alloggiati Web (police reporting) |
| `/host/housekeeping` | HK tasks + calendar + biancheria |
| `/host/manutenzione` | Maintenance reports |
| `/host/staff` | Staff communications board |
| `/host/notifiche` | Notifications |
| `/host/analytics` | Analytics dashboard |
| `/host/report` | Revenue reports |
| `/host/profilo` | Profile & settings |
| `/host/oggi` | Today's arrivals/departures |
| `/host/calendario` | Calendar overview |
| `/host/abbonamento` | Subscription management |
| `/host/moduli` | Module activation/deactivation |
| `/host/audit` | Audit log viewer |
| `/host/gdpr` | GDPR compliance & data retention |
| `/host/canali` | Channel manager (Booking/Airbnb/VRBO iCal) |
| `/host/magazzino` | Inventory management |
| `/host/integrazione` | External integrations |
| `/host/servizi` | Additional services catalog |
| `/host/upselling` | Room upselling rules |
| `/host/oggetti-smarriti` | Lost & found registry |
| `/host/promemoria` | Reminders / task deadlines |
| `/host/email-automatiche` | Automated email configuration |
| `/host/pos` | Point of Sale terminal |
| `/host/cassa` | Cash register + daily closing |
| `/host/utenti` | Staff user management + invites |
| `/host/help` | Help center |
| `/host/onboarding` | First-time setup wizard |
| `/host/ristorazione` | F&B overview |
| `/host/ristorazione/menu` | F&B menu editor |
| `/host/impostazioni-regcard` | Registration card T&C settings |
| `/host/concierge` | AI Concierge dashboard + detail |
| `/host/concierge/impostazioni` | Concierge AI settings |
| `/host/concierge/test` | Concierge simulator |
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

## Admin Route Map (`/admin/*`)

| Path | Purpose |
|------|---------|
| `/admin/dashboard` | Admin overview |
| `/admin/clienti` | Host/client management |
| `/admin/prenotazioni` | All bookings across hosts |
| `/admin/eventi` | All events |
| `/admin/fatture` | Platform invoices |
| `/admin/pagamenti` | Payment tracking |
| `/admin/ticket` | Support tickets |
| `/admin/impostazioni` | Platform settings |

## SuperAdmin Route Map (`/superadmin/*`)

| Path | Purpose |
|------|---------|
| `/superadmin/host` | Host accounts management |
| `/superadmin/strutture` | All structures across platform |
| `/superadmin/utenti` | User management |
| `/superadmin/abbonamenti` | Subscription plans & billing |
| `/superadmin/fatture` | Platform-wide invoices |
| `/superadmin/moduli` | Module catalog & pricing |
| `/superadmin/analytics` | Platform-wide analytics |
| `/superadmin/monitoring` | System monitoring & health |
| `/superadmin/impostazioni` | Global settings |

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
| `lib/superadmin-guard.ts` | `requireSuperAdmin()` guard for superadmin routes |
| `lib/db.ts` | Prisma client singleton |
| `lib/utils.ts` | `cn()`, `formatData()`, `formatValuta()`, `formatDataRelativa()`, enum label/color helpers |
| `lib/validations.ts` | Zod schemas core + `parseBody()` helper + type guards. SPA schemi re-esportati da `lib/spa/` |
| `lib/spa/` | Bounded context SPA: `constants.ts` (ZONE_CORPO, CONDIZIONI_SALUTE, METODI_PAGAMENTO_SPA), `validations.ts` (waiverSpaSchema, pagamentoSpaSchema), `index.ts` barrel |
| `lib/wifi/` | Bounded context Wi-Fi: `constants.ts` (AUTH_METHODS, DEFAULT_COMPLIMENTARY_MINS), `index.ts` |
| `lib/pos/` | Bounded context POS/Cassa: `constants.ts` (METODI_PAGAMENTO_POS, CATEGORIE_VOCE_POS), `index.ts` |
| `lib/host-config.ts` | Access layer per HostSmtpConfig/HostConciergeConfig/HostWifiConfig/HostBillingInfo (read-through + dual-write durante migrazione dal God Object) |
| `lib/host-secrets.ts` | Layer accesso a campi cifrati dell'host: `getHostSecret`/`setHostSecret` con audit log |
| `lib/secrets.ts` | UI helpers per mask/unmask secret in PATCH API |
| `lib/crypto.ts` | AES-256-GCM primitives + `EncryptionError` + `validateEncryptionKey()` (chiamato da `instrumentation.ts`) |
| `lib/crm.ts` | `upsertOspiteFromBooking`, `lookupOspite`, `incrementStatsOnCheckout` per sync Prenotazione→OspiteCRM |
| `lib/soft-delete.ts` | Helper per soft delete: `notDeleted`, `softDeletePatch`, `restorePatch` |
| `lib/fattura-righe.ts` | `normalizzaRighe`, `calcolaTotali`, `buildRigheCreatePayload` (dual-write JSON legacy + RigaFattura relazionale) |
| `lib/moduli.ts` | Module system: `CATALOGO_MODULI`, `parseModuli()`, `isModuloAttivo()`, `PREZZI_ADDON` |
| `lib/billing.ts` | Subscription plans: `PLAN_DEFINITIONS`, limits, upgrade/downgrade logic |
| `lib/email.ts` | Nodemailer SMTP transport (Gmail) |
| `lib/email-templates.ts` | Multi-language email templates (IT/EN/FR) + `sendEmailNuovaPrenotazione()` |
| `lib/email-queue.ts` | Email queue with retry logic for background sending |
| `lib/ical.ts` | iCal (RFC 5545) generation, HMAC token auth for public calendar URLs |
| `lib/ical-import.ts` | iCal import from external channels (Booking/Airbnb) |
| `lib/rate-limit.ts` | In-memory sliding-window rate limiter + `getClientIp()` |
| `lib/logger.ts` | Structured logger (`logger.info/warn/error`) |
| `lib/pdf.tsx` | React-PDF invoice/receipt generation |
| `lib/pdf-generator.ts` | PDFKit-based PDF generation |
| `lib/chat-events.ts` | In-memory SSE event bus (`ChatEventBus`) for real-time chat |
| `lib/use-chat.ts` | React hook for SSE chat (message stream, typing indicators) |
| `lib/gdpr-retention.ts` | GDPR retention policies + automated data cleanup |
| `lib/audit.ts` | Audit logging utilities |
| `lib/ai-provider.ts` | AI provider abstraction (host brings own API key) |
| `lib/concierge.ts` | AI Concierge logic for WhatsApp conversations |
| `lib/whatsapp.ts` | WhatsApp API integration |
| `lib/pricing.ts` | Dynamic pricing engine |
| `lib/assegnazione-camera.ts` | Room assignment algorithm |
| `lib/biancheria.ts` | Linen/housekeeping dotation logic |
| `lib/fattura-elettronica.ts` | Italian electronic invoice (FatturaPA XML) |
| `lib/iva.ts` | IVA (VAT) calculation |
| `lib/payment-provider.ts` | Payment provider abstraction |
| `lib/upsell.ts` | Upselling rule engine |
| `lib/csrf.ts` | CSRF token protection |
| `lib/comuni-tassa-soggiorno.ts` | City tax lookup data |
| `lib/alloggiati.ts` | Alloggiati Web export formatting |
| `lib/optimization.tsx` | Performance optimization utilities |

## Italian Domain Context

- **Alloggiati Web**: Italian police reporting for guest check-in — fields on `Prenotazione` model (guestSesso, guestTipoDocumento, guestComuneNascitaIstat, etc.)
- **Fatturazione elettronica**: Invoice fields include codiceSDI, PEC, regime fiscale, aliquota IVA
- **Locale**: Date formatting uses `it` locale, currency is EUR
- **SPA waiver**: Clinical declarations required before treatment — includes pregnancy flag, zone corpo (14 zones), allergie, patologie, farmaci

## Module System

The platform uses a modular architecture where features are activatable per host. Defined in `lib/moduli.ts`.

- **27 modules** in `CATALOGO_MODULI`, organized in 4 categories: `base`, `operativo`, `avanzato`, `integrazioni`
- **Base modules** (always on by default): prenotazioni, strutture, crm, housekeeping
- **Activation states**: `incluso` (in plan), `demo` (time-limited trial), `pagamento` (paid add-on), `off`
- **`parseModuli(host.moduliAttivi)`** returns a `Record<string, boolean>` used by sidebar, API guards, and pages
- **`isModuloAttivo(moduliAttivi, 'spa')`** checks if a specific module is active
- **`PREZZI_ADDON`** defines monthly EUR price per module (e.g., SPA=30, POS=20, Concierge=25)
- Sidebar, API routes, and pages conditionally render based on active modules

## Billing & Plans

Four subscription tiers defined in `lib/billing.ts` via `PLAN_DEFINITIONS`:

| Plan | Price/mo | Structures | Units | Events | Key Modules |
|------|----------|------------|-------|--------|-------------|
| LIGHT | 29 | 1 | 10 | 0 | Core + emailAuto + iCal |
| EVENTO_SINGOLO | 49 | 1 | 5 | 3 | + eventi |
| VISIBILITA_MENSILE | 149 | 3 | 20 | 10 | + many advanced |
| PARTNER_PREMIUM | 299 | 10 | 50 | 50 | All modules included |

Additional modules beyond plan inclusion are billed as add-ons via `PREZZI_ADDON`.

## Kiosk & Paperless

- **`/kiosk/[token]`** — Tablet-mode checkout page. Guests sign digitally on a tablet at reception. Token-authenticated (no login required).
- **`/kiosk/spa/[cabinaId]`** — SPA cabin tablet for waiver signing before treatment. Mounted in each cabin.
- Both routes are optimized for touch interaction, large buttons, and signature capture.

## GDPR & Data Retention

Full documentation in `docs/GDPR.md`. Key policies from `lib/gdpr-retention.ts`:

- **SPA health data (waiver)**: 90 days on platform, then purged (host notified to download)
- **Alloggiati data**: 5 years (Art. 109 TULPS)
- **Accounting documents**: 10 years (Art. 2220 Codice Civile)
- **Guest personal data**: 40 days after checkout (anonymized, not deleted)
- Automated cron job for retention enforcement
- Host is Titolare del trattamento; platform is Responsabile

## Staff & Users

7 staff roles defined by `RuoloStaff` enum:

| Role | Access |
|------|--------|
| `MANAGER` | Full host access |
| `RECEPTIONIST` | Bookings, check-in, CRM, cashier |
| `HOUSEKEEPING` | HK tasks, linen, room status |
| `SPA_OPERATOR` | SPA module only |
| `RESTAURANT` | F&B module only |
| `CONCIERGE` | Chat, concierge, guest communications |
| `READONLY` | View-only access to all sections |

**Invitation flow**: Host creates `StaffInvite` with role + email -> system sends link to `/registrazione/[token]` -> staff member creates account with pre-assigned role.

## F&B System (Ristorazione)

- **Menu editor** (`/host/ristorazione/menu`): daily menus with courses (antipasto, primo, secondo, contorno, dolce, bevanda)
- **Guest meal choices**: guests select meals via `/book/[strutturaId]/pasti` public page
- **Models**: `ConfigPastoStruttura` (structure meal plan config) -> `MenuGiornaliero` -> `PiattoMenu` (dishes) -> `SceltaPastoOspite` (guest selections)
- **Meal plans**: B&B, Mezza Pensione, Pensione Completa — configured per structure

## SPA Advanced Features

Beyond core waiver/booking:

- **Gift Cards** (`GiftCard` + `GiftCardMovimento`): purchasable vouchers with balance, recharge, expiry, redemption tracking
- **POS** (`TransazionePOS` + `VocePOS`): integrated point-of-sale for selling treatments, products, gift cards
- **Loyalty** (`ProgrammaFedelta` + `LivelloFedelta` + `MembroFedelta` + `MovimentoPunti`): points-based program with tier levels, automatic accumulation
- **Waiting List** (`WaitingListSpa`): queue management with automatic notification when slots open
- **Turnaway Tracking** (`TurnawayTracking`): logs demand that could not be served (capacity planning)
- **Advanced Reports** (`/host/spa/report`): revenue by treatment, therapist utilization, occupancy rates

## Cashiering (Cassa & Incassi)

- **`/host/cassa`**: Daily cash register with opening/closing balance
- **`ChiusuraCassa`**: Daily closing record — expected vs actual amounts, discrepancies
- **`Incasso`**: Individual payment records by method (cash, card, transfer, room credit)
- **Reconciliation**: End-of-day report matching POS transactions, SPA payments, and booking payments against cash drawer

## i18n (Internationalization)

- **Library**: `next-intl` v4
- **Locale detection**: Cookie-based (`NEXT_LOCALE`), defaults to `it`
- **Message files**: `messages/it.json`, `messages/en.json`
- **Language switcher**: `components/layout/language-switcher.tsx` in topbar
- **Usage**: `useTranslations('namespace')` hook in client components, `getTranslations()` in server components

## Real-time Chat

Host-guest messaging via Server-Sent Events (SSE), not WebSocket.

- **`lib/chat-events.ts`**: In-memory `ChatEventBus` — publish/subscribe per `chatId`. Single-process only (Redis Pub/Sub for multi-instance).
- **`lib/use-chat.ts`**: React hook consuming SSE stream — messages, typing indicators, read receipts, presence
- **Event types**: `message`, `typing`, `read`, `presence`
- **Public**: `/book/chat/[id]` for guests; `/host/concierge/[id]` for host staff

## CI/CD & Monitoring

- **Sentry** (`@sentry/nextjs`): Error tracking and performance monitoring. Disabled in development.
- **GitHub Actions**: `ci.yml` (lint + build + Playwright tests on PR), `deploy.yml` (production deployment)
- **Playwright**: E2E tests in `/e2e/` directory, Chromium browser, auto-starts dev server if needed
