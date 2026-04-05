# VALUTAZIONE D'IMPATTO SULLA PROTEZIONE DEI DATI (DPIA)
## Modulo SPA — Wellness Card (Dati Sanitari)
### Art. 35 GDPR — Reg. UE 2016/679

**Data:** {{DATA}}
**Versione:** 1.0
**Redattore:** OtiumPMS — Team Sviluppo
**Revisore:** {{DPO_O_LEGALE}}

---

## 1. DESCRIZIONE DEL TRATTAMENTO

### 1.1 Natura
Raccolta e conservazione di dati relativi alla salute degli ospiti (Art. 9 GDPR) nell'ambito del modulo SPA della piattaforma OtiumPMS. Gli ospiti compilano una "Wellness Card" (dichiarazione clinica) prima di ricevere trattamenti benessere (massaggi, percorsi termali, ecc.).

### 1.2 Ambito
- Strutture ricettive con SPA che utilizzano OtiumPMS
- Ospiti che prenotano trattamenti SPA
- Terapisti che consultano la scheda prima del trattamento

### 1.3 Contesto
La raccolta dei dati sanitari è necessaria per:
- Garantire la sicurezza dell'ospite durante il trattamento
- Identificare controindicazioni (gravidanza, allergie, patologie)
- Personalizzare il trattamento (zone, pressione, temperatura)
- Tutela legale della struttura

### 1.4 Dati trattati
| Dato | Categoria Art. 9 | Obbligatorio |
|---|---|---|
| Condizioni mediche (patologie note) | Dati relativi alla salute | No (dichiarazione volontaria) |
| Stato di gravidanza + mese | Dati relativi alla salute | No |
| Allergie (lattice, oli, profumi, nichel) | Dati relativi alla salute | No |
| Farmaci in uso | Dati relativi alla salute | No |
| Zone corporee (trattare/evitare) | Dato personale | No |
| Preferenze trattamento | Dato personale | No |
| Firma digitale consenso | Dato personale | Sì |

### 1.5 Fonte dei dati
I dati sono forniti **direttamente dall'interessato** tramite:
- Form online "Wellness Card" su smartphone (link/QR code)
- Compilazione su tablet alla reception SPA
- Compilazione assistita dall'operatore

---

## 2. NECESSITÀ E PROPORZIONALITÀ

### 2.1 Base giuridica
**Consenso esplicito dell'interessato** (Art. 9.2.a GDPR).
L'ospite firma digitalmente la Wellness Card accettando:
- Termini e condizioni del servizio SPA
- Informativa privacy con riferimento Art. 9

### 2.2 Necessità
La raccolta è necessaria per:
- **Sicurezza**: un massaggio su persona con trombosi, epilessia o gravidanza non dichiarata può causare danni
- **Personalizzazione**: pressione, temperatura, zone da evitare
- **Tutela legale**: la struttura deve poter dimostrare di aver raccolto le informazioni

### 2.3 Proporzionalità
- Raccolti solo dati strettamente necessari al trattamento
- Nessun dato genetico o biometrico
- Conservazione limitata (90 giorni)
- Checkbox "Nessuna condizione" per minimizzare se non necessario

---

## 3. RISCHI PER GLI INTERESSATI

| Rischio | Probabilità | Gravità | Livello |
|---|---|---|---|
| Accesso non autorizzato ai dati sanitari | Bassa | Alta | MEDIO |
| Data breach con esposizione dati salute | Bassa | Molto alta | ALTO |
| Uso improprio da parte dello staff | Bassa | Media | BASSO |
| Conservazione oltre il necessario | Media | Media | MEDIO |
| Profilazione sanitaria non autorizzata | Molto bassa | Alta | BASSO |

---

## 4. MISURE DI MITIGAZIONE

| Rischio | Misura implementata | Residuo |
|---|---|---|
| Accesso non autorizzato | RBAC: solo ruolo SPA_OPERATOR e MANAGER vedono i dati sanitari. Audit log su ogni accesso | BASSO |
| Data breach | HTTPS, DB cifrato (Neon AES-256), hosting EU, nessun dato sanitario in log/email | BASSO |
| Uso improprio staff | Formazione obbligatoria, audit trail nominale, consenso ospite verificabile | BASSO |
| Conservazione eccessiva | Cancellazione automatica dopo 90 giorni con notifica host 15gg prima | BASSO |
| Profilazione | Nessuna profilazione sanitaria implementata. I dati sono usati solo per il singolo trattamento | MOLTO BASSO |

---

## 5. MISURE TECNICHE SPECIFICHE

5.1 **Accesso limitato**: i dati della Wellness Card sono visibili solo da:
- Il terapista assegnato (via tablet cabina)
- L'operatore SPA Concierge (per verificare stato compilazione)
- Il manager/DIREZIONE (per supervisione)
- NON visibili da: receptionist hotel, housekeeping, staff F&B

5.2 **Cancellazione automatica**: cron job settimanale verifica e cancella i dati sanitari oltre 90 giorni. Prima della cancellazione:
- Notifica al Titolare (host) 15 giorni prima
- Possibilità di download per conservazione autonoma (responsabilità del Titolare)

5.3 **Consenso tracciabile**: ogni Wellness Card ha:
- Timestamp di accettazione termini
- Timestamp di accettazione privacy
- Firma digitale dell'ospite (base64)
- IP di compilazione

5.4 **Separazione logica**: i dati sanitari sono nel modello `WaiverSpa`, separato dai dati anagrafici della prenotazione. Cancellabile indipendentemente.

---

## 6. CONSULTAZIONE PREVENTIVA

6.1 Ai sensi dell'Art. 36 GDPR, se dopo l'applicazione delle misure il rischio residuo rimane **elevato**, è necessaria la consultazione preventiva del Garante.

6.2 **Valutazione**: dopo l'applicazione delle misure di cui al punto 4, tutti i rischi residui sono stati ridotti a livello **BASSO**. La consultazione preventiva **non è richiesta**.

---

## 7. RIESAME

La presente DPIA sarà riesaminata:
- Annualmente
- In caso di modifiche significative al trattamento
- In caso di incidenti di sicurezza
- In caso di modifiche normative rilevanti

---

## 8. APPROVAZIONE

Data: _______________

Firma Responsabile Trattamento (OtiumPMS): _________________________

Firma Titolare (Host): _________________________

DPO (se nominato): _________________________
