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
