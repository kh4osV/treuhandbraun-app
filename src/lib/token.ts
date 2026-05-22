// Mandanten-Upload-Token (Phase 2). Alternativer Auth-Modus zum
// Supabase-Login: der Mandant gibt einen Token-Code ein, mit dem die App
// Belege NUR für seinen Mandanten hochlädt (client_id steckt im Token,
// serverseitig aufgelöst — siehe treuhandbraun/docs/mobile-intake.md).
//
// Gespeichert wird der Rohtoken lokal (AsyncStorage). Er ist ein Geheimnis
// wie ein Passwort; "Abmelden" löscht ihn.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mandant.upload.token.v1';
export const TOKEN_PREFIX = 'fit_';

let cached: string | null = null;
let loaded = false;

export async function loadToken(): Promise<string | null> {
  cached = await AsyncStorage.getItem(KEY);
  loaded = true;
  return cached;
}

export async function getTokenAsync(): Promise<string | null> {
  if (!loaded) await loadToken();
  return cached;
}

export async function setToken(raw: string): Promise<void> {
  cached = raw;
  loaded = true;
  await AsyncStorage.setItem(KEY, raw);
}

export async function clearToken(): Promise<void> {
  cached = null;
  loaded = true;
  await AsyncStorage.removeItem(KEY);
}

export function looksLikeToken(raw: string): boolean {
  return raw.trim().startsWith(TOKEN_PREFIX) && raw.trim().length > TOKEN_PREFIX.length + 10;
}
