# Treuhand Braun — Belege-App

Expo / React-Native-App: Belege fotografieren → in die bestehende
Intake-Pipeline von **fluke-web** hochladen. Die App ist nur der
Client; der serverseitige Vertrag liegt im Hauptrepo
`treuhandbraun/docs/mobile-intake.md` und wird **nicht** aufgeweicht.

## Architektur

```
App ──POST <BASE>/api/intake/upload?client_id&filename──▶ fluke-web
      Auth: Supabase-JWT (Phase 1)   Body: rohe JPEG-Bytes
   fluke-web prüft Allowlist + RLS, schreibt service-role → Bucket
   ──▶ intake-processor (Cron) / „Verarbeiten" auf /intake macht weiter
```

- **Auth**: dieselben Team-Accounts wie die Web-App
  (`supabase.auth.signInWithPassword`). Session via AsyncStorage.
- **Roher Body, kein multipart**: SvelteKit-CSRF blockt
  Formular-Content-Types. `expo-file-system` `uploadAsync` mit
  `BINARY_CONTENT` sendet den Datei-Inhalt direkt als Body.
- **Offline-Queue** (`src/lib/queue.ts`): jeder Beleg wird ins
  `documentDirectory` kopiert und persistent eingereiht; ein Prozessor
  lädt sequentiell hoch, sobald Netz da ist (NetInfo), mit Retry.
  Dauerhafte Fehler (400/401/403/409) → Status „Fehler" + manuelles
  Retry im Verlauf.
- **HEIC→JPEG + Kompression** (`expo-image-manipulator`): lange Kante
  2000 px, q70 — kleiner = besser/billiger für die Gemini-Extraktion.

## Setup

```bash
npm install
cp .env.example .env      # Werte eintragen (siehe unten)
npx expo start            # -c falls .env geändert (Cache leeren)
```

`.env` (nur client-seitige Werte — **kein** service-role):

| Variable | Wert |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | wie `web/.env(.dev)` — Dev: Dev-Projekt |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `EXPO_PUBLIC_INTAKE_BASE_URL` | Dev: `https://fluke-web-dev.fluketreuhand.workers.dev` · Prod: Prod-Worker-URL |

> Im Dev-Supabase-Projekt existiert noch **kein** Auth-Account — für
> App-Tests dort einen Team-User anlegen (siehe Hauptrepo-Doc).

## Test (Dev-Stack)

1. `.env` auf Dev zeigen lassen, `npx expo start -c`
2. Expo Go (oder Dev-Build) auf dem Handy, QR scannen
3. Mit Dev-Team-User anmelden → Mandant wählen → Foto → Verlauf prüft
   Status „Hochgeladen" + zeigt den Storage-Pfad
4. Gegencheck: in `fluke-web-dev` unter `/intake` taucht die Datei auf

## Status

Phase 1 vollständig: Login, Mandantenwahl (RLS), Kamera/Galerie,
Konvertierung, Offline-Queue + Retry, Verlauf. Offen/optional:
Google-OAuth-Login, Push/Status „verarbeitet/zugeordnet",
EAS-Build-Konfig für Store-Auslieferung.
