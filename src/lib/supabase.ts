// Supabase-Client für die App. Identisches Auth-Modell wie die Web-App:
// Login mit denselben Accounts, RLS gilt automatisch. Der Endpoint
// validiert das Access-Token serverseitig erneut — der Client hier
// dient nur Login + RLS-gefilterter Mandantenliste.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Native App: kein OAuth-Redirect über die URL.
    detectSessionInUrl: false
  }
});

export type ClientRow = { client_id: string; name: string | null };

// RLS-gefiltert: Admin/Treuhänder sehen alle, Unternehmer nur den
// eigenen Mandanten — exakt wie im Web (siehe roles.ts im Web-Repo).
export async function listClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('client_id, name')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
