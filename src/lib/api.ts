// Upload-Client gegen /api/intake/upload.
//
// Der Endpoint erwartet die Datei als ROHEN Body (CSRF-Grund, siehe
// docs/mobile-intake.md im Web-Repo) — NICHT multipart. Expos
// FileSystem.uploadAsync mit BINARY_CONTENT macht genau das: der
// Datei-Inhalt IST der Request-Body, Metadaten gehen als Query-Param,
// Auth als Bearer-Header.

// SDK 55: uploadAsync/FileSystemUploadType leben in /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import { ACCOUNTS_ENDPOINT, UPLOAD_ENDPOINT } from './config';
import { currentAccessToken } from './supabase';
import { getTokenAsync } from './token';

export type UploadInput = {
  fileUri: string;
  fileName: string;
  mime: string;
  clientId: string;
  // FR 06.08.2026 #20: selbst gewähltes Sachkonto — überschreibt Regel und KI.
  accountNumber?: number | null;
  // FR 06.08.2026 #19: privat/bar bezahlt → Gegenkonto statt Bank. Welches
  // Konto das ist, entscheidet der Treuhänder pro Mandant in Fluke; die App
  // schickt nur den Haken.
  privatePaid?: boolean;
};

export type IntakeAccount = { account_number: number; account_name: string | null };

/**
 * Kurzliste des Kontenplans für die Sachkonto-Auswahl. Fehler sind hier nie
 * fatal: ohne Liste wird eben ohne Kontovorgabe hochgeladen, wie bisher.
 */
export async function fetchIntakeAccounts(clientId: string): Promise<IntakeAccount[]> {
  const token = (await getTokenAsync()) ?? (await currentAccessToken());
  if (!token) return [];
  try {
    const res = await fetch(
      `${ACCOUNTS_ENDPOINT}?${new URLSearchParams({ client_id: clientId }).toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.accounts) ? (body.accounts as IntakeAccount[]) : [];
  } catch {
    return [];
  }
}

export type TokenCheck =
  | { ok: true; clientId: string }
  | { ok: false; reason: 'invalid' | 'unreachable'; error: string };

/**
 * Prüft einen Mandanten-Code am Server. Der Login prüfte früher nur das
 * Prefix — ein unbekannter oder widerrufener Code (oder ein Prod-Code in einem
 * Dev-Build) fiel erst beim Upload auf, als 401 im Verlauf, und kein Beleg kam
 * an. /api/intake/accounts nimmt dieselbe Auth wie der Upload und liefert den
 * client_id aus dem Token, ohne etwas zu schreiben.
 *
 * "invalid" nur bei 401/403 — das ist eine klare Absage. Alles andere
 * (kein Netz, 5xx, unerwartete Antwort) ist "unreachable": der Code ist dann
 * weder bestätigt noch abgelehnt.
 */
export async function verifyMandantToken(token: string): Promise<TokenCheck> {
  try {
    const res = await fetch(`${ACCOUNTS_ENDPOINT}?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: 'invalid', error: `HTTP ${res.status}` };
    }
    if (!res.ok) return { ok: false, reason: 'unreachable', error: `HTTP ${res.status}` };
    const body = await res.json();
    if (typeof body?.client_id !== 'string' || !body.client_id) {
      return { ok: false, reason: 'unreachable', error: 'unerwartete Antwort' };
    }
    return { ok: true, clientId: body.client_id };
  } catch (e: any) {
    return { ok: false, reason: 'unreachable', error: e?.message ?? 'Netzwerkfehler' };
  }
}

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; status: number; error: string; retryable: boolean };

// 401/403/400/409 sind dauerhaft (kein Retry); Netzfehler/5xx schon.
function isRetryable(status: number): boolean {
  return status === 0 || status === 429 || (status >= 500 && status <= 599);
}

export async function uploadReceipt(input: UploadInput): Promise<UploadResult> {
  // Mandanten-Token hat Vorrang (Phase 2): der Endpoint leitet den
  // client_id daraus ab. Sonst das Supabase-Access-Token des Team-Users.
  const mandantToken = await getTokenAsync();
  const token = mandantToken ?? (await currentAccessToken());
  if (!token) {
    return { ok: false, status: 401, error: 'Nicht angemeldet', retryable: false };
  }

  const params: Record<string, string> = {
    client_id: input.clientId,
    filename: input.fileName
  };
  // Kontovorgaben nur mitschicken, wenn wirklich gewählt — ein leerer
  // Parameter würde serverseitig nur zu einem stillen null werden.
  if (input.accountNumber != null) params.account_number = String(input.accountNumber);
  if (input.privatePaid) params.private_paid = '1';
  const qs = new URLSearchParams(params).toString();

  try {
    const res = await FileSystem.uploadAsync(`${UPLOAD_ENDPOINT}?${qs}`, input.fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': input.mime
      }
    });

    let parsed: any = {};
    try {
      parsed = res.body ? JSON.parse(res.body) : {};
    } catch {
      parsed = { error: res.body?.slice(0, 200) || 'unbekannte Antwort' };
    }

    if (res.status === 200 && parsed.ok) {
      return { ok: true, path: parsed.path as string };
    }
    // Ein nacktes "unauthorized" im Verlauf sagt der Kundin nicht, was zu tun ist.
    if (res.status === 401 && mandantToken) {
      return {
        ok: false,
        status: 401,
        error: 'Code ungültig oder widerrufen. Bitte abmelden und mit einem neuen Code anmelden.',
        retryable: false
      };
    }
    return {
      ok: false,
      status: res.status,
      error: parsed.error ?? `HTTP ${res.status}`,
      retryable: isRetryable(res.status)
    };
  } catch (e: any) {
    // Netzwerk weg / Timeout → retrybar (Offline-Queue greift).
    return {
      ok: false,
      status: 0,
      error: e?.message ?? 'Netzwerkfehler',
      retryable: true
    };
  }
}
