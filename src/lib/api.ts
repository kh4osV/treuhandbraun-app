// Upload-Client gegen /api/intake/upload.
//
// Der Endpoint erwartet die Datei als ROHEN Body (CSRF-Grund, siehe
// docs/mobile-intake.md im Web-Repo) — NICHT multipart. Expos
// FileSystem.uploadAsync mit BINARY_CONTENT macht genau das: der
// Datei-Inhalt IST der Request-Body, Metadaten gehen als Query-Param,
// Auth als Bearer-Header.

import * as FileSystem from 'expo-file-system';
import { UPLOAD_ENDPOINT } from './config';
import { currentAccessToken } from './supabase';

export type UploadInput = {
  fileUri: string;
  fileName: string;
  mime: string;
  clientId: string;
};

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; status: number; error: string; retryable: boolean };

// 401/403/400/409 sind dauerhaft (kein Retry); Netzfehler/5xx schon.
function isRetryable(status: number): boolean {
  return status === 0 || status === 429 || (status >= 500 && status <= 599);
}

export async function uploadReceipt(input: UploadInput): Promise<UploadResult> {
  const token = await currentAccessToken();
  if (!token) {
    return { ok: false, status: 401, error: 'Nicht angemeldet', retryable: false };
  }

  const qs = new URLSearchParams({
    client_id: input.clientId,
    filename: input.fileName
  }).toString();

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
