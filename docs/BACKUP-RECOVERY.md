# Backup & Disaster Recovery — Otium PMS

> Aggiornato: 2026-04-27 · Owner: SUPERADMIN

Runbook operativo per backup database, file storage, e procedure di recovery
in caso di incident. Pensato per essere eseguibile in autonomia da chi è di
turno, anche senza contesto pregresso.

---

## 1. Stack di backup attivo

### Database (Neon Postgres)

Backup nativi forniti da Neon:

| Piano Neon | Point-in-Time Recovery | Branching | Logical backups |
|-----------|------------------------|-----------|-----------------|
| Free      | 24h                    | ✅        | manuale         |
| Launch    | 7 giorni               | ✅        | manuale         |
| Scale     | 14 giorni              | ✅        | manuale         |
| Business  | 30 giorni              | ✅        | manuale         |

**Configurazione corrente**: ⚠️ verifica su Neon Console quale piano è attivo
e aggiorna questa riga.

**Strategia consigliata pre-go-live**:
1. Upgrade a piano **Launch** o superiore (PITR almeno 7 giorni)
2. Attivare backup logico aggiuntivo via GitHub Actions (vedi §2)
3. Configurare alert se backup fallisce per >24h

### File storage

L'app salva attualmente foto documenti / firme / loghi come:
- **base64 in DB** (MVP, vedi gotcha #10 in CLAUDE.md): backupati col DB
- **Vercel Blob / R2** (futuro): da configurare quando si migra

**Limite attuale**: foto documenti restano in DB → backup DB include tutto
(comodo) ma il DB cresce velocemente. Migrazione a object storage TODO.

### Configurazione e secret

I secret vivono in:
- **Vercel env vars** (production / preview) — non backupati automaticamente
- **`.env.local`** locale (NON committare)

**Backup secret**: esportare manualmente da Vercel Dashboard ogni 3 mesi e
salvare in vault sicuro (1Password / Bitwarden). Includere:
`DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`,
tutte le `STRIPE_PRICE_*`, `SENTRY_DSN`, `CRON_SECRET`.

**Critico**: `ENCRYPTION_KEY` perduta = secret cifrati nel DB irrecuperabili
(SMTP pass, WhatsApp token, AI API key). Rotation richiede re-encrypt di tutti
i campi cifrati — fare solo se assolutamente necessario.

---

## 2. Backup logico via GitHub Actions

**Quando serve**: aggiunta robustezza oltre il PITR di Neon. I dump compressi
restano leggibili anche se Neon dovesse essere indisponibile come provider.

### Setup (una volta sola)

1. **Bucket S3-compatibile** (R2 di Cloudflare consigliato per costo):
   ```
   nome bucket: otium-pms-backups
   region: auto
   public access: disabilitato
   versioning: abilitato (60 giorni)
   ```

2. **Credenziali R2/S3**:
   - Genera Access Key con permessi `Object Read/Write` sul bucket
   - Salva in GitHub repo Secrets: `BACKUP_S3_KEY`, `BACKUP_S3_SECRET`,
     `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`

3. **DATABASE_URL del DB di produzione**:
   - GitHub Secret: `DATABASE_URL_PROD`

4. **Workflow** in `.github/workflows/backup.yml`:
   ```yaml
   name: Database Backup
   on:
     schedule:
       - cron: '0 3 * * *'  # 03:00 UTC = 04:00/05:00 Rome
     workflow_dispatch:
   jobs:
     backup:
       runs-on: ubuntu-latest
       steps:
         - name: Install psql
           run: sudo apt-get install -y postgresql-client gzip
         - name: Dump
           env: { DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }} }
           run: |
             TS=$(date +%Y%m%d-%H%M%S)
             pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip > "otium-$TS.sql.gz"
             echo "FILE=otium-$TS.sql.gz" >> $GITHUB_ENV
         - name: Upload to R2
           env:
             AWS_ACCESS_KEY_ID: ${{ secrets.BACKUP_S3_KEY }}
             AWS_SECRET_ACCESS_KEY: ${{ secrets.BACKUP_S3_SECRET }}
             AWS_DEFAULT_REGION: auto
           run: |
             aws s3 cp "$FILE" "s3://${{ secrets.BACKUP_S3_BUCKET }}/db/$FILE" \
               --endpoint-url=${{ secrets.BACKUP_S3_ENDPOINT }}
         - name: Notify on failure
           if: failure()
           run: curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" -d '{"text":"❌ Backup DB fallito"}'
   ```

### Retention policy

- **Giornalieri**: ultimi 30 giorni → versioning bucket gestisce automaticamente
- **Mensili**: 1 backup per mese, 12 mesi → script lifecycle bucket o cleanup job
- **Annuali**: 1 backup per anno, illimitato → manuale (per audit fiscale 10 anni)

**Costo stimato**: 200MB/dump × 30 giorni = 6GB/mese su R2 = ~$0.09/mese.

---

## 3. Procedura di recovery — scenari

### Scenario A: corruption recente (< 7 giorni), tutta l'app è giù

**Sintomo**: query DB ritornano dati incoerenti, nuovi insert falliscono,
o tabelle scomparse.

**Azione**:

1. **Conferma incident**: chiedere al SUPERADMIN di disabilitare il login
   (sospendere DNS o aggiungere middleware "manutenzione 503").
2. **Aprire Neon Console** → progetto → Branches → "Restore from history".
3. **Selezionare timestamp** prima della corruption (Neon ha snapshot ogni
   minuto entro le 24h, ogni ora oltre).
4. **Creare branch nuova** `recovery-YYYYMMDD-HHMM` (NON sovrascrivere `main`).
5. **Connettersi alla branch** con `psql "$NEW_BRANCH_URL"` e verificare:
   ```sql
   SELECT COUNT(*) FROM "Prenotazione" WHERE "createdAt" > NOW() - INTERVAL '1 day';
   SELECT MAX("createdAt") FROM "Prenotazione";
   -- Verificare tabella critica recente
   ```
6. **Se i dati sono OK**: aggiornare `DATABASE_URL` su Vercel env (production)
   per puntare alla nuova branch.
7. **Redeploy** dell'app per refresh delle connessioni.
8. **Smoke test**: login host, view dashboard, crea prenotazione test.
9. **Riabilitare il login**.
10. **Postmortem**: documentare in `docs/incidents/` cosa ha causato la
    corruption + cosa cambiare per evitare ricorrenze.

**Tempo stimato**: 15-30 min (Neon branching è istantaneo).

### Scenario B: dato singolo cancellato per errore (< 30 giorni)

**Sintomo**: host segnala "ho cancellato per sbaglio una prenotazione" o
"il mio CRM ospite è scomparso".

**Azione**:

1. **Verificare soft-delete** prima di tutto:
   ```sql
   SELECT * FROM "Prenotazione"
   WHERE id = 'cmxxx' OR ("guestEmail" = 'xxx' AND "deletedAt" IS NOT NULL);
   ```
   Se `deletedAt IS NOT NULL`: ripristino immediato con
   `UPDATE "Prenotazione" SET "deletedAt" = NULL WHERE id = 'cmxxx';`
   → fine. Logga in audit.

2. **Se hard-deleted o soft-delete fuori finestra retention** (40 giorni
   per dati ospite, vedi `docs/GDPR.md`):
   - Apri Neon Console → branch recovery dal giorno precedente alla cancellazione
   - Connetti psql alla branch recovery
   - Estrai i dati:
     ```sql
     SELECT row_to_json(p.*) FROM "Prenotazione" p WHERE id = 'cmxxx';
     ```
   - Re-inserisci nella branch principale con `INSERT INTO ... VALUES (...)`
   - Logga in `AuditLog` con azione `manual_recovery` e ragione

3. **Notifica l'host** con email: "Recupero completato in seguito alla tua
   richiesta del {data}".

### Scenario C: Neon down totale, nessuna PITR raggiungibile

**Sintomo**: Neon Console irraggiungibile, status page rossa.

**Azione**:

1. **Comunicare** subito agli host via Slack/email "Servizio temporaneamente
   non disponibile, ETA TBD". Linkare la status page Neon.
2. **Attendere** Neon (storicamente <2h per incident maggiori).
3. **Se >4h**: attivare la procedura di restore da R2 backup logico:
   - Provisioning DB temporaneo (Supabase / Railway / RDS)
   - `gunzip < otium-<latest>.sql.gz | psql "$NEW_DB_URL"`
   - Verifica integrità
   - `DATABASE_URL` su Vercel → nuovo DB
   - Redeploy
   - Comunicare ripristino

**Nota**: il restore da dump perde tutti i dati creati DOPO l'ultimo backup
(massimo 24h). Comunicare chiaramente agli host la finestra di perdita.

### Scenario D: Vercel down (app irraggiungibile, DB OK)

**Azione**: niente da fare lato dati. Aspettare Vercel + comunicazione agli
host. Il DB resta integro su Neon. Nessun backup è coinvolto.

---

## 4. Test di recovery (ogni 3 mesi)

**Senza test, il backup è un'illusione**. Calendarizzare:

1. **Trimestrale**: lancia manualmente il workflow GitHub backup
   (`workflow_dispatch`) e verifica che il file appare su R2.
2. **Trimestrale**: scarica l'ultimo dump e prova il restore su un DB
   locale Postgres (no produzione):
   ```bash
   docker run -d -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:15
   gunzip < otium-latest.sql.gz | psql "postgres://postgres:test@localhost:5433/postgres"
   psql "postgres://postgres:test@localhost:5433/postgres" -c "SELECT COUNT(*) FROM \"Prenotazione\";"
   ```
3. **Semestrale**: simulazione completa scenario A su una branch Neon di test.
4. **Annuale**: rotation di `ENCRYPTION_KEY` e backup secret (richiede
   re-encrypt — fare solo se necessario).

Documentare il risultato di ogni test in `docs/backup-test-log.md`.

---

## 5. Monitoring e alerting

Da implementare nel SuperAdmin dashboard (`/superadmin/monitoring`):

- **Widget "Ultimo backup"**: data + dimensione + ✅/❌ stato. Verde se
  <30h fa, giallo se 30-72h, rosso oltre.
- **Bottone "Esegui backup ora"** → trigger workflow GitHub via API
- **Bottone "Verifica integrità ultimo backup"** → scarica + parse header
  pg_dump, verifica che termini con `-- PostgreSQL database dump complete`

Alert via Slack webhook (`SLACK_WEBHOOK_URL`):
- Backup fallito 2 volte di fila
- Dimensione backup -50% rispetto alla media (sospetta corruption)
- DB latency > 500ms per >5 min (vedi `lib/health.ts`)

---

## 6. Cosa NON fare mai

- ❌ Rimpiazzare la branch `main` Neon con una recovery senza prima testare
  (perdita dati irreversibile)
- ❌ Eseguire `DROP TABLE` o `DELETE FROM ... WHERE` ampi senza prima dump
  manuale (`pg_dump --table=X > pre-delete.sql`)
- ❌ Cancellare `ENCRYPTION_KEY` o ruotarla senza piano di re-encrypt
- ❌ Modificare il bucket R2 (versioning, lifecycle) senza notifica al team
- ❌ Backup → spazio pubblico (S3 ACL public, GitHub repo pubblica). I dump
  contengono PII, secret cifrati, dati sanitari SPA

---

## 7. Contatti emergenza

| Ruolo | Persona | Contatto |
|-------|---------|----------|
| Owner DB | SUPERADMIN | _da compilare_ |
| Neon support | account team | https://neon.tech/support |
| Vercel support | account team | https://vercel.com/help |
| Cloudflare R2 | account team | https://dash.cloudflare.com |
| DPO (per data breach) | _da nominare_ | _email_ |

---

## Changelog di questo runbook

- 2026-04-27: prima versione (post audit pre-rollout primo cliente)
