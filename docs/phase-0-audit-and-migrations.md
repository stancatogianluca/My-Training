# My Training 2.0 — Fase 0: audit tecnico e migrazioni
Data: 2026-10-14. Ramo: `develop/my-training-2.0`. Stato: **analisi statica**, nessun test live su iPhone/Supabase eseguito.

## Confini di sicurezza
- `main` e GitHub Pages in produzione restano invariati. Nessuna migrazione SQL eseguita.
- Prima di ogni test o deploy: esportare backup JSON v1 da ciascun dispositivo che contenga dati esclusivi; verificarne apertura, dimensione e conteggio record. Un backup cloud del solo allenamento non copre piani e bozze.
- Mai testare il ripristino sovrascrivendo l'archivio reale: usare ambiente isolato con dati sintetici. Non esporre credenziali o dati personali nei commit.
- Sviluppare su questo ramo e promuovere con PR e verifica manuale, senza merge automatico.

## Inventario accertato dal codice
| Componente | Stato 1.6.1 | Rischio |
| --- | --- | --- |
| Archivio locale | `localStorage['my-training-data-v1']`, oggetto con `version:1`, `workouts`, `goals`, `routine` | Migrazioni distruttive o quota storage |
| Piani | `PLAN_KEY` separata, `readPlans()` / `storePlans()`; inclusi nel JSON esportato come `planned` | Non sincronizzati su cloud |
| Bozze | Chiavi `localStorage` separate per sessioni forza e attività | Non comprese nell'export principale |
| Backup | `JSON.stringify({...data,planned:readPlans()})`; import con salvataggio preventivo | Richiede test di round-trip e compatibilità v1 |
| Cloud | `cloud.js`: Supabase Auth, token in `sessionStorage`, sync manuale additiva per `workout` | Sessione persa alla chiusura; conflitti non risolti |
| DB | `public.training_items`, PK `(user_id,kind,item_id)`, `payload jsonb`; RLS SELECT/INSERT | Nessuna UPDATE/DELETE, nessuna versione record |
| Offline | `sw.js` cache versionata; fetch same-origin network-first con fallback cache | Aggiornamenti PWA iOS da collaudare |
| Garmin | Parser FIT/GPX/TCX in `app.js` | Validare campioni reali, deduplica, limiti di memoria |
| iPhone | Meta tag PWA, manifest `display:standalone`, service worker | Verifica runtime Safari/PWA non eseguita |

### Problemi da correggere prima della sync automatica
1. La sync attuale compara soltanto gli ID: se lo stesso ID è modificato su due dispositivi, nessuna modifica viene propagata. Cancellazioni locali possono essere ripristinate dal cloud.
2. La lettura cloud usa `limit=10000` senza paginazione; il risultato non costituisce protocollo di sync incrementale.
3. I piani e gli obiettivi non sono sincronizzati; i draft non sono nel backup JSON.
4. Sessioni in `sessionStorage` possono richiedere login frequente in PWA iOS.
5. Inserimenti simultanei dello stesso ID possono produrre conflitto PK; le importazioni FIT/GPX/TCX necessitano test di duplicazione e integrità.
6. Il codice locale gestisce errori quota, ma non dispone di transazioni multi-record.
7. La presenza di RLS nello script è verificata staticamente; le policy reali nel progetto Supabase devono essere verificate prima del deploy.

## Piano migrazioni, senza SQL eseguito
**M0 — baseline e test (nessuna migrazione):**
- Congelare il formato backup v1 come fixture e aggiungere validazione schema/round-trip, con esempi sintetici e file malformati.
- Testare: offline, login/logout, sync PC→iPhone→PC, reinstallazione *solo con backup verificato*, errori di rete, duplicati Garmin.
- Registrare numero e hash degli allenamenti prima/dopo ogni migrazione, senza inserire dati personali nel repository.

**M1 — schema additivo cloud (SQL versionato, da applicare solo dopo backup DB):**
- Conservare `training_items` e PK esistenti. Aggiungere `updated_at timestamptz`, `revision bigint`, `deleted_at timestamptz NULL` (tombstone) tramite migration separata; backfill conservativo e indici `(user_id,updated_at,item_id)`.
- Abilitare policy RLS UPDATE soltanto per proprietario con `USING` e `WITH CHECK` e permessi minimi; nessuna DELETE fisica client. Verificare RLS con due utenti di test.
- Definire concorrenza ottimistica (compare-and-swap revision lato server tramite RPC atomica); evitare semplice upsert che sovrascrive.

**M2 — protocollo sync:**
- Client con coda locale durevole e operazioni idempotenti; push/pull paginati, retry con backoff e checkpoint, gestione offline e conflitti espliciti.
- Identificatori stabili e deduplica import basata su fingerprint di sorgente + timestamp, non soltanto su ID generato dal dispositivo.
- Non cancellare né sovrascrivere in automatico record discordanti; offrire risoluzione e possibilità di esportare backup.

**M3 — piani e obiettivi:**
- Introdurre `kind` aggiuntivi tramite modifica controllata del CHECK o tabelle dedicate, con validazione di payload per tipo e ownership RLS.
- Migrare `planned`, `goals`, `routine` in modo idempotente e preservare export/import v1; conservare bozze locali salvo scelta esplicita.

**M4 — backup v2 e rollout:**
- Export v2 con `schemaVersion`, timestamp, sezioni dati, checksum; importer capace di leggere v1 e v2 senza eliminare campi ignoti.
- Test su branch con origin/storage separati e Supabase di staging (mai puntare la build di test al DB reale).
- Feature flag: prima sync manuale v2, poi automatica opt-in, infine default dopo collaudo. Rollback del client possibile; rollback SQL solo se verificato e senza perdita di dati.

## Gate di rilascio
- [ ] Backup JSON v1 valido su PC e iPhone, test restore su dataset sintetico
- [ ] Nessuna perdita record e nessuna duplicazione nei test
- [ ] RLS e isolamento account testati su staging
- [ ] Sync offline/reconnect/conflitti verificata
- [ ] FIT/GPX/TCX reali testati con permesso dell'utente
- [ ] Safari iOS + PWA Home Screen testati, inclusi aggiornamenti SW
- [ ] Diff PR controllato; main e produzione non toccati fino all'approvazione

## Nota operativa
Questo audit è basato sui sorgenti GitHub: **non** prova lo stato live del DB, i dati locali dell'iPhone o la corretta esecuzione delle funzioni in Safari. Tali verifiche richiedono test su dispositivi/ambienti reali.
