// Zentrale Konfig. Werte kommen aus EXPO_PUBLIC_* (.env, siehe
// .env.example). Bewusst nur client-seitige Werte — der service-role
// liegt ausschliesslich serverseitig in fluke-web.

function req(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Fehlende Env-Variable ${name}. .env aus .env.example anlegen und Metro neu starten (expo start -c).`
    );
  }
  return value;
}

export const SUPABASE_URL = req(
  'EXPO_PUBLIC_SUPABASE_URL',
  process.env.EXPO_PUBLIC_SUPABASE_URL
);

export const SUPABASE_PUBLISHABLE_KEY = req(
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// <BASE>/api/intake/upload  — Vertrag siehe treuhandbraun/docs/mobile-intake.md
export const INTAKE_BASE_URL = req(
  'EXPO_PUBLIC_INTAKE_BASE_URL',
  process.env.EXPO_PUBLIC_INTAKE_BASE_URL
).replace(/\/+$/, '');

export const UPLOAD_ENDPOINT = `${INTAKE_BASE_URL}/api/intake/upload`;

// Kurzliste des Kontenplans für die Sachkonto-Auswahl (FR 06.08.2026 #20).
export const ACCOUNTS_ENDPOINT = `${INTAKE_BASE_URL}/api/intake/accounts`;

// Dev-Build → Banner "Testversion" auf jedem Screen. eas.json setzt
// EXPO_PUBLIC_APP_ENV=prod nur in den Prod-Profilen; alles andere (preview,
// lokale .env) gilt als Dev. Zusätzlich zählt die Ziel-URL, damit ein
// falsch gesetztes "prod" einen Dev-Upload nicht verdeckt. Ein Dev-APK beim
// Kunden lädt sonst unbemerkt in die Dev-Umgebung (Wyland, 10/2026).
export const IS_DEV_BUILD =
  process.env.EXPO_PUBLIC_APP_ENV !== 'prod' || /\/\/fluke-web-dev\./.test(INTAKE_BASE_URL);
