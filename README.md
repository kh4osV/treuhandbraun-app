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

## Standalone-APK (EAS Build, netzunabhängig)

Kein Metro/Tunnel nötig — die App wird in der Cloud gebaut, das fertige
APK aufs Handy geladen und redet direkt mit `fluke-web-dev`.

EAS lädt die **gitignorete `.env` NICHT** mit hoch → die
`EXPO_PUBLIC_*`-Werte stehen darum in `eas.json` (nur client-seitige
Public-Werte; `preview` = Dev-Stack, `production` = Prod-Stack).
EAS archiviert den **committeten** Git-Stand — vor dem Build committen.

```bash
npx eas-cli login                              # Expo-Account (expo.dev)
npx eas-cli init                               # schreibt extra.eas.projectId in app.json
npx eas-cli build -p android --profile preview # Cloud-Build, ~10-15 min
```

Am Ende gibt EAS eine Download-URL/QR fürs APK aus → auf dem Handy
installieren (einmalig „Unbekannte Quellen" erlauben). `production`
analog mit `--profile production` (liefert ein .aab für den Store).

> ⚠️ Der von EAS gehostete Download-Link läuft auf dem Free-Tier nach
> ~30 Tagen ab. Für einen **dauerhaften** Link siehe unten.

## Release per GitHub Actions (dauerhafter Download-Link)

`.github/workflows/android-release.yml` baut das APK per EAS in der Cloud,
lädt es herunter und hängt es an ein **GitHub-Release** an. Der
Download-Link ist damit ein GitHub-Release-Asset und **läuft nicht ab**
(im Gegensatz zum von Expo gehosteten EAS-Link).

**Einmalige Einrichtung** — Expo-Access-Token als Repo-Secret hinterlegen:

1. Token erzeugen: <https://expo.dev/settings/access-tokens> (Account
   `kh4osv`, dem auch das EAS-Projekt gehört).
2. Repo → **Settings → Secrets and variables → Actions → New repository
   secret**: Name `EXPO_TOKEN`, Wert = das Token.

**Release auslösen:**

- Manuell: **Actions → „Android Release (APK)" → Run workflow** (Profil
  `production-apk` = Prod-Stack, Vorgabe; `preview` = Dev-Stack).
- Automatisch: Version-Tag pushen — `git tag v1.0.1 && git push origin v1.0.1`
  (baut immer `production-apk`).

Der Build dauert ~10–15 min; danach erscheint das Release unter
**Releases** mit dem APK als Asset (fester Download-Link).

> ⚠️ Kunden bekommen immer den Prod-Build. Ein `preview`-Build lädt nach
> `fluke-web-dev` hoch, wo Prod-Mandanten-Codes unbekannt sind — die Belege
> kommen nie in der Buchhaltung an. Er erscheint deshalb nur als
> **Pre-Release** mit `-dev` in Tag und Dateiname, nie als „Latest", und die
> App zeigt auf jedem Screen den roten Banner „TESTVERSION".

## Status

Phase 1 vollständig: Login, Mandantenwahl (RLS), Kamera/Galerie,
Konvertierung, Offline-Queue + Retry, Verlauf. EAS-Build-Config
(`eas.json`: preview=Dev-APK, production=Prod-AAB) vorhanden.
Offen/optional: Google-OAuth-Login, Push/Status
„verarbeitet/zugeordnet", Store-Auslieferung.
