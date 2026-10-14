# My Training 2.0 beta — stato implementazione e collaudo

## Implementato sul ramo (non in produzione)
- Dashboard: riepilogo dislivello settimanale, prossimi allenamenti; riutilizza storage v1.
- Calendario: attività pianificate (◌) e completate (●), dettaglio giornaliero.
- Garmin: indicatori FC e dislivello ricavati da dati attività esistenti; import FIT/GPX/TCX preesistente conservato.
- Migrazione SQL `migrations/002_staging_additive_sync_metadata.sql`: aggiunge campi di versionamento, **non eseguita**, nessuna policy UPDATE.
- Backup v1, `cloud.js`, service worker e GitHub Pages main non modificati.

## Ancora da implementare / verificare
- Sync automatico con coda durevole, tombstone, concorrenza ottimistica, RPC server, paginazione, conflitti e test multi-device.
- Garmin grafici campione-per-campione, tracce mappa e deduplica con fixture reali.
- Calendario: riconciliazione esplicita tra attività pianificata e completata (attualmente corrispondenza per giorno/tipo), sync cloud dei piani.
- Test automatici browser, round-trip backup v1 e Safari iOS/PWA installata.
- Staging Supabase isolato e test RLS con due account; nessuna operazione su database reale.

## Smoke test manuale prima di ogni merge
1. Esportare JSON v1 dalla 1.6.1 su entrambi i dispositivi; conservarli.
2. In browser isolato, importare un backup sintetico v1; confrontare count e ID.
3. Verificare Home, Bike Performance e Calendario con attività presenti e assenti.
4. Pianificare un allenamento; controllare calendario e riepilogo; eliminare il piano e verificare che gli allenamenti non cambino.
5. Importare FIT, GPX, TCX validi e corrotti; confrontare statistiche e duplicati.
6. Simulare rete assente e rientro online; verificare dati e nessuna cancellazione.
7. Testare PWA installata su iPhone con storage isolato.
8. Verificare in PR diff vs main; merge soltanto dopo accettazione.

**Release gate: BLOCCATO.** Non promuovere a main finché i punti sopra non sono completati.
