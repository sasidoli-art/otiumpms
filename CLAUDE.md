# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-05-01

## Development Commands

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint flat config v9 (max-warnings 600)
npm run lint:fix     # ESLint con --fix
npm run analyze      # Build con bundle analyzer (ANALYZE=true)
npm run db:push      # Push Prisma schema to database (no migration)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Open Prisma Studio GUI (http://localhost:5555)
npm run db:seed      # Seed database via ts-node (equivalente a: npx prisma db seed)
npm run audit:visual # Heuristic UI audit (148 pagine)
npm run audit:tenant # Multi-tenant isolation audit (217 route /api/host/*)
# npx prisma db seed # Alternativa: usa la config `prisma.seed` in package.json
```

Il seed popola un ambiente di sviluppo realistico:
- 2 host multi-tenant (`host@otiumweek.it` = Partner Premium, `bnb@otiumweek.it` = LIGHT)
- 3 strutture, 11 camere, 10+ prenotazioni (passate/presenti/future)
- SPA completa: 3 terapisti, 3 cabine, 10 trattamenti, 3 percorsi, 12 appuntamenti
- CRM, pacchetti, notifiche, task HK, segnalazioni manutenzione
- Password comune: `Otium2025!`

**E2E Tests** (Playwright, Chromium):
```bash
npm run test:e2e         # Run all e2e tests headless
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:ui      # Interactive Playwright UI
```
Tests are in `/e2e/` directory. Requires dev server running or will auto-start one.
Manual smoke testing at `/test` (system sitemap page).

## Architecture

**Stack**: Next.js 16 (App Router) · React 18 · TypeScript 5 · Prisma 5 (Neon PostgreSQL) · NextAuth 4 (JWT) · Tailwind CSS · Zod · next-intl · SWR · @sentry/nextjs · otpauth · qrcode · @playwright/test · @axe-core/playwright · Recharts · Framer Motion · sonner · husky + lint-staged

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
| `/privacy/[token]` | Public | Portale privacy ospite (export + revoca consensi) |
| `/wifi/[strutturaId]` | Public | WiFi captive portal |
| `/status` | Public | Status page (legge `/api/health` ogni 30s) |
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
- **76 models total** — additions since v1: `Ticket`, `StaffMember`, `StaffInvite`, `MenuGiornaliero`, `PiattoMenu`, `SceltaPastoOspite`, `GiftCard`, `GiftCardMovimento`, `TransazionePOS`, `VocePOS`, `ProgrammaFedelta`, `LivelloFedelta`, `MembroFedelta`, `MovimentoPunti`, `WaitingListSpa`, `TurnawayTracking`, `ChiusuraCassa`, `Incasso`, `ConfigPastoStruttura`, `PastoPrenotazione`, `PrenotazioneRistorante`, `ArticoloMagazzino`, `MovimentoMagazzino`, `PaymentProviderConfig`, `PagamentoCheckout`, `ServizioStruttura`, `PacchettoServizio`, `VocePacchetto`, `AddebitoPrenotazione`, `CanaleEsterno`, `PrenotazioneCanale`, `AlertOspite`, `OggettoSmarrito`, `RegolaUpsell`, `PropostaUpsell`, `DotazioneBiancheria`, `RichiestaBiancheria`, `Trace`, `Accompagnatore`, `AuditLog`, `DotazioneCabinaSpa`, `ConversazioneWhatsApp`, `MessaggioWhatsApp`, `AzioneConcierge`, `WebhookSubscription`, `WebhookConsegna` (i 2 ultimi aggiunti 2026-04-27 per outbound webhook integrazioni esterne)
- **Stripe billing**: `Host.stripeCustomerId` + `Host.stripeSubscriptionId` (entrambi `@unique`) per Stripe SaaS subscriptions piattaforma

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
| `/host/pacchetti` | Packages + detail + new (con riferimento evento esterno come stringa libera) |
| `/host/alloggiati` | Alloggiati Web (police reporting) |
| `/host/housekeeping` | HK tasks + calendar + biancheria |
| `/host/manutenzione` | Maintenance reports |
| `/host/staff` | Staff communications board |
| `/host/notifiche` | Notifications |
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
| `lib/ical-generate.ts` | Client-side `.ics` download per "Aggiungi al calendario" post-prenotazione |
| `lib/availability.ts` | `calcolaDisponibilita()` + `verificaDisponibilitaPrenotazione()` con motivi non-disponibilità (prenotata/blocco_ota/chiusa/esaurita/manutenzione). Half-open range `[arrivo, partenza)` |
| `lib/spa-availability.ts` | Time primitives pure (`toMinutes`/`toHHMM`/`slotsOverlap`/`generaSlotGiornata`/`fasciaCopreSlot`) per generator slot SPA |
| `lib/swr-fetcher.ts` | SWR fetcher con `FetchError` per `useDashboard` + `useSidebarBadges` |
| `lib/status-config.ts` | Re-export di `lib/status-badges.ts` con nomi `*_STATUS` + `CANALE_COLORS` + `PIANO_BADGE` + `getStatusConfig()` |
| `lib/webhooks.ts` | Outbound webhook subscriptions: HMAC-SHA256 signing + `dispatchWebhookEvent()` + `generateWebhookSecret()` |
| `lib/stripe.ts` | Stripe SaaS facade REST-only: `getOrCreateStripeCustomer`, `createCheckoutSession` (subscription mode), `createPortalSession`, `changePlan`, `cancelSubscriptionAtPeriodEnd` |
| `lib/health.ts` | Health check (DB + Sentry + encryption + env) usato da `/api/health` + `/status` page |
| `lib/branding.ts` | White-label branding engine: theme da Struttura/Host con CSS custom properties |
| `lib/rate-limit.ts` | In-memory sliding-window rate limiter + `getClientIp()` + 11 preset (`public:search/booking/checkin/wifi/ical`, `host:read/write`, `admin:all`, `webhook:all`, `auth:login/register`) + `checkRateLimit(req, preset)` drop-in helper |
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
- **Health**: `GET /api/health` — pubblico, 503 se DB down, usato da uptime checker e dashboard `/superadmin/monitoring`

## Environment Variables

La lista è generata da grep `process.env.*` nel codice. Non tutte sono obbligatorie: alcune sono fallback o feature-gated.

### Core (obbligatorie in prod)

```bash
DATABASE_URL=postgresql://...                 # Neon serverless Postgres
NEXTAUTH_SECRET=<random-32b>                  # JWT signing
NEXTAUTH_URL=http://localhost:3000            # base URL per callbacks
ENCRYPTION_KEY=<32-bytes-hex>                 # AES-256-GCM per secret cifrati in DB
# Genera: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRON_SECRET=<random>                          # Bearer token richiesto da /api/cron/*
```

### SMTP piattaforma (fallback per host senza SMTP proprio)

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...                                  # alternativa accettata: SMTP_PASSWORD
SMTP_FROM="Otium <noreply@otiumweek.com>"
```

### Sentry

```bash
SENTRY_DSN=...                                 # server-side
NEXT_PUBLIC_SENTRY_DSN=...                     # client-side (può essere identico)
```

### AI Concierge (platform key strategy)

Le chiavi AI vanno salvate su `PlatformSettings.aiApiKey` (cifrate). Env var usate solo come fallback/locali:

```bash
ANTHROPIC_KEY=...                              # claude
ANTHROPIC_MODEL=claude-sonnet-4-5
OPENROUTER_KEY=...
OPENROUTER_MODEL=...
OLLAMA_BASE_URL=http://localhost:11434         # dev locale
```

### Integrazioni opzionali

```bash
# Booking engine custom domain (vedi /host/booking-engine)
BOOKING_CNAME_TARGET=cname.otiumweek.com       # target CNAME verificato dalla API DNS

# Stripe SaaS subscriptions (piattaforma — abbonamenti host a Otium)
STRIPE_SECRET_KEY=sk_live_...                  # API key Stripe (lib/stripe.ts)
STRIPE_WEBHOOK_SECRET=whsec_...                # firma webhook /api/webhooks/stripe
# 4 piani × 2 frequenze = 8 Price IDs (vedi lib/stripe.ts::getPriceId)
STRIPE_PRICE_LIGHT_MONTHLY=price_...
STRIPE_PRICE_LIGHT_YEARLY=price_...
STRIPE_PRICE_EVENTO_SINGOLO_MONTHLY=price_...
STRIPE_PRICE_EVENTO_SINGOLO_YEARLY=price_...
STRIPE_PRICE_VISIBILITA_MENSILE_MONTHLY=price_...
STRIPE_PRICE_VISIBILITA_MENSILE_YEARLY=price_...
STRIPE_PRICE_PARTNER_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PARTNER_PREMIUM_YEARLY=price_...
# Legacy per pagamenti ospite via Stripe Checkout (acconti prenotazione)
STRIPE_PRICE_ID_LIGHT=price_...
STRIPE_PRICE_ID_EVENTO=price_...
STRIPE_PRICE_ID_VISIBILITA=price_...
STRIPE_PRICE_ID_PARTNER=price_...

# IMAP inbound email → chat (cron/inbound-email)
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_USER=...
IMAP_PASS=...

# Fatture in Cloud (fatturazione elettronica)
FIC_API_KEY=...
FIC_COMPANY_ID=...

# Aruba (FatturaPA alternativa)
ARUBA_USERNAME=...
ARUBA_API_KEY=...

# WhatsApp Business (per AI Concierge)
WHATSAPP_APP_SECRET=...                        # verify webhook signature

# SuperAdmin hardening
SUPERADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8         # IP allowlist (CSV). Vuoto = nessun gate IP.

# Notifiche operative
SLACK_WEBHOOK_URL=...                          # alert incident (anche backup failures)
SUPPORT_EMAIL=support@otiumweek.com

# Backup logico (vedi docs/BACKUP-RECOVERY.md)
BACKUP_S3_KEY=...                              # R2/S3 access key
BACKUP_S3_SECRET=...
BACKUP_S3_BUCKET=otium-pms-backups
BACKUP_S3_ENDPOINT=https://...r2.cloudflarestorage.com
BACKUP_S3_REGION=auto
```

### Auto-popolate da Vercel

Settate automaticamente in produzione, non servono in `.env.local`:

```bash
VERCEL_ENV=production                          # production | preview | development
VERCEL_GIT_COMMIT_SHA=...
VERCEL_REGION=...
NEXT_PUBLIC_COMMIT_SHA=...                     # duplicata client-side
NEXT_PUBLIC_APP_URL=https://otium-pms.vercel.app
```

## Comandi utili

```bash
# Development
npm run dev                  # next dev (Turbopack, port 3000)
npm run build                # production build
npm run start                # production server

# Database
npx prisma db push           # applica schema (no migration — Neon)
npx prisma generate          # rigenera client TypeScript
npx prisma studio            # GUI su http://localhost:5555
npx prisma db seed           # popola dati dev (vedi prisma/seed.ts)

# Testing
npm run type-check           # tsc --noEmit
npm run test                 # vitest watch
npm run test:run             # vitest one-shot
npm run test:unit            # solo tests/unit
npm run test:integration     # solo tests/integration (tocca Prisma mockato)
npm run test:e2e             # Playwright (avvia dev se necessario)
npm run test:all             # lint + type-check + unit + integration

# Seed E2E (dati deterministici per Playwright — IDs noti come e2e-host-001)
npm run seed:e2e
```

## Gotcha / Errori comuni

1. **Multi-tenant isolation**: ogni query Prisma sotto `/api/host/*` DEVE filtrare per `hostId` dalla sessione (`requireHost()`). MAI fidarsi di `hostId` passato dal client nel body/querystring.
2. **Schema changes**: dopo ogni modifica a `schema.prisma` serve `npx prisma generate` + `npx prisma db push`. Il `postinstall` hook esegue già `prisma generate`, ma `db push` no.
3. **Secret cifrati**: i campi sensibili (SMTP pass, WhatsApp token, Stripe keys host) vanno letti/scritti SOLO via `lib/host-secrets.ts` (`getHostSecret` / `setHostSecret`). Scrivere direttamente in DB bypassa la cifratura AES-GCM.
4. **Timezone Europe/Rome**: la codebase NON usa `date-fns-tz` o `dayjs` (non installati). Per date sensibili al fuso (`/host/oggi`, sidebar badges, cron), usa `Intl.DateTimeFormat` con `timeZone: 'Europe/Rome'` per ottenere il YMD locale, poi costruisci `Date` esplicito. Vedi `app/api/host/sidebar-badges/route.ts` come reference.
5. **Email templates**: layout HTML a tabelle (table/tr/td), non div/flex — Outlook non supporta flexbox. Style inline, no class. Riferimento: `lib/email-templates.ts`.
6. **Alloggiati file**: formato a **larghezza fissa posizionale** (vedi `lib/alloggiati.ts`). Il padding (spaces/zero) conta — un carattere fuori posto invalida l'intero file lato Questura.
7. **GDPR consent append-only**: `UserConsent` è immutabile. Per revocare un consenso si marca `revocatoAt` sul record esistente (unica UPDATE ammessa) e si inserisce un nuovo record attivo. MAI cambiare `accettato` o la versione a posteriori. Vedi `lib/consent.ts`.
8. **PIN prenotazione**: unique per `(hostId, pin)` (vincolo `@@unique` sullo schema). Usa `lib/guest-pin.ts::generateUniquePin(hostId)` — retry automatico in caso di collisione.
9. **Cron Vercel 60s**: tutti i cron su piano Hobby/Pro hanno **60 secondi hard-cap**. `gdpr-retention` e `ical-sync` usano un budget di **50s** con checkpoint (`PlatformSettings.ultimaEsecuzione*`) per riprendere dalla policy/host rimasti alla chiamata successiva. Vedi memory `reference_vercel_hobby_limits.md`: su Hobby c'è anche il limite di **1 cron/day**, motivo per cui `ical-sync` è giornaliero.
10. **Image upload**: `/api/host/upload` accetta base64 data URL, **max 2MB dopo encoding**. NON c'è compressione client-side: se l'immagine è più grande, comprimerla lato client PRIMA di chiamare l'endpoint (es. canvas resize a 1200px lato lungo). Stoccaggio base64 in DB è MVP, migrazione a R2/S3 è TODO.
11. **Server actions**: non sono usate. Tutte le mutation passano da REST API route + `router.refresh()` lato client — regola assoluta, confermata anche dal pattern "Data Flow Pattern" sopra. Non aggiungere `'use server'`.
12. **Neon adapter**: il client Prisma usa `@prisma/adapter-neon` per connessioni serverless. In locale con DB Postgres standard potrebbe dare warning su websocket — accettabile in dev.
13. **Husky pre-commit**: `npx lint-staged` parte automaticamente al `git commit` ed esegue `eslint --fix` sui `.ts/.tsx` in stage. Se la fix dell'autoformat genera modifiche aggiuntive, vengono ri-staged automaticamente. Per emergenze: `git commit --no-verify` (sconsigliato).
14. **ESLint v9 flat config**: `eslint.config.mjs` (NON `.eslintrc.json`). Non usa `eslint-config-next` (non ancora flat-compatible nella versione 16.x). Plugin caricati direttamente: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`. `npm run lint` ha `--max-warnings 600` come threshold (546 warning legacy tollerati, da pulire incrementalmente).
15. **Half-open date range**: tutte le funzioni di availability (`lib/availability.ts`, `lib/spa-availability.ts`) usano range `[arrivo, partenza)` — il giorno di check-out NON è occupato (consistente con il modello hotel: checkout mattina = stanza libera quel giorno). `slotsOverlap(aStart, aEnd, bStart, bEnd)`: A finisce esattamente quando B inizia → NO overlap.
16. **Stripe SaaS subscriptions vs Stripe pagamenti ospite**: due flussi separati. `lib/stripe.ts` gestisce gli abbonamenti host alla piattaforma (subscription mode, customer per host, 8 Price IDs). `/api/webhooks/stripe` gestisce i pagamenti checkout one-shot degli ospiti (acconto prenotazione). Non confondere i due — webhook eventi diversi.
17. **Multi-tenant audit (`npm run audit:tenant`)**: euristico statico, non garantisce 100%. Esistono falsi positivi (es. iCal HMAC token, getServerSession diretto). Per ogni FAIL bisogna verificare manualmente. Snapshot corrente: 0 CRITICAL, 245 WARN documentati in `docs/MULTI-TENANT-AUDIT.md`.

## Convenzioni di naming

| Artefatto | Convenzione | Esempio |
|-----------|-------------|---------|
| File source | kebab-case | `spa-booking-stepper.tsx` |
| Componenti React | PascalCase | `SpaBookingStepper` |
| Custom hook | camelCase con prefix `use` | `useChat`, `useSidebarBadges` |
| API route segment | kebab-case | `/api/host/sidebar-badges` |
| Prisma model | PascalCase (italiano) | `PrenotazioneCanale`, `OspiteCRM` |
| Prisma field | camelCase (italiano) | `guestCognome`, `dataArrivo` |
| Enum Prisma | PascalCase, values UPPER_SNAKE | `StatoPrenotazione.CONFERMATA` |
| CSS var | kebab-case, prefisso `--brand-*` | `--brand-primary`, `--brand-on-primary` |
| i18n namespace | kebab-case | `spa-booking`, `camere-flow` |
| Module id | camelCase (`lib/moduli.ts`) | `spa`, `giftCard`, `emailAuto` |

## Aggiungere un nuovo modulo

Passi standard per collegare una feature al sistema moduli:

1. **Catalogo**: aggiungi entry in `lib/moduli.ts::CATALOGO_MODULI` con `id`, `nome`, `categoria`, `defaultAttivo`, `descrizione`.
2. **Prezzo add-on**: se vendibile separatamente, aggiungi in `PREZZI_ADDON` (stessa lib).
3. **Piani**: in `lib/billing.ts::PLAN_DEFINITIONS` includi l'id modulo nei piani che lo offrono di default (`moduliInclusi[]`).
4. **Sidebar**: in `lib/sidebar-config.ts` aggiungi una voce `SidebarItem` con `modulo: 'nomeModulo'` (hidden automaticamente se off). Se è un gruppo intero dedicato al modulo, usa `moduloGruppo`.
5. **Guard API**: nelle route `/api/host/<modulo>/*` controlla `isModuloAttivo(parseModuli(host.moduliAttivi), 'nomeModulo')` dopo `requireHost()`. Ritorna 404 se off (non 403 — l'ospite curioso non deve capire che esiste).
6. **Pagine host**: crea sotto `app/host/<modulo>/`. Il server component dovrebbe controllare il modulo e reindirizzare a `/host/moduli` se off.
7. **Componenti**: raggruppa sotto `components/<modulo>/` (es. `components/spa/`, `components/booking/ristorante/`).
8. **Seed**: se serve per dev, aggiungi dati in `prisma/seed.ts` e abilita esplicitamente il modulo su `host.moduliAttivi`.
9. **GDPR**: se il modulo tratta dati personali/sensibili, aggiungi policy in `lib/gdpr-retention.ts` e documenta in `docs/GDPR.md`.
10. **Audit**: mutation importanti chiamano `audit({ hostId, azione: '<modulo>.<azione>', entita, entitaId, dettagli })`.

## Architecture document

Per flussi end-to-end (prenotazione, check-in, SPA+waiver, fatturazione, Alloggiati, GDPR, concierge AI) + ERD core + elenco cron: vedi [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentazione satellite

| File | Scope |
|------|-------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flussi end-to-end + ERD + cron catalog |
| [docs/GDPR.md](docs/GDPR.md) | Retention policy + Titolare/Responsabile + Art. 9 SPA |
| [docs/BACKUP-RECOVERY.md](docs/BACKUP-RECOVERY.md) | Runbook 4 scenari recovery + GitHub Action template R2 |
| [docs/MULTI-TENANT-AUDIT.md](docs/MULTI-TENANT-AUDIT.md) | Snapshot audit isolamento `hostId` (rigenerabile via `npm run audit:tenant`) |
| [docs/VISUAL-AUDIT.md](docs/VISUAL-AUDIT.md) | Heuristic UI audit (rigenerabile via `npm run audit:visual`) |
| [docs/api/openapi.yaml](docs/api/openapi.yaml) | OpenAPI 3.0.3 endpoint pubblici (booking + checkin + ical + webhook + health) |
