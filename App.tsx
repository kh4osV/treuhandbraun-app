// Root: Auth-Gate + schlanke State-Navigation (kein react-navigation
// nötig für drei Screens). Session wird von Supabase persistiert.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase, type ClientRow } from './src/lib/supabase';
import { loadToken, setToken, clearToken } from './src/lib/token';
import { loadQueue, drain, staleItems } from './src/lib/queue';
import { colors } from './src/lib/theme';
import LoginScreen from './src/screens/LoginScreen';
import ClientPickerScreen from './src/screens/ClientPickerScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import QueueScreen from './src/screens/QueueScreen';

type Screen = 'capture' | 'queue';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mandantToken, setMandantToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [view, setView] = useState<Screen>('capture');

  useEffect(() => {
    // Session UND Mandanten-Token laden, bevor das Auth-Gate entscheidet.
    Promise.all([supabase.auth.getSession(), loadToken()]).then(([s, t]) => {
      setSession(s.data.session);
      setMandantToken(t);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setClient(null);
    });
    // Queue laden, hochladen — und beim Start warnen, falls Belege seit
    // über 24 h hängen (z. B. dauerhaft kein Netz oder ein Server-Fehler).
    loadQueue().then(() => {
      const stale = staleItems();
      if (stale.length > 0) {
        Alert.alert(
          'Belege noch nicht hochgeladen',
          `${stale.length} Beleg${stale.length === 1 ? '' : 'e'} ` +
            `${stale.length === 1 ? 'konnte' : 'konnten'} seit über 24 Stunden ` +
            'nicht hochgeladen werden. Bitte Netzverbindung prüfen und im ' +
            'Verlauf den Status kontrollieren.'
        );
      }
      void drain();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleTokenLogin(t: string) {
    await setToken(t);
    setMandantToken(t);
    setView('capture');
  }
  async function tokenLogout() {
    await clearToken();
    setMandantToken(null);
  }

  // Synthetischer "Mandant" für den Token-Modus: der echte client_id steckt
  // im Token und wird serverseitig aufgelöst (Upload braucht ihn nicht). Kein
  // Firmenname clientseitig bekannt → neutrale Beschriftung statt "Mein Betrieb".
  const tokenClient: ClientRow = { client_id: '', company_name: 'Beleg-Upload' };

  if (!ready)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor={colors.bg} />
      {session ? (
        // ── Team-User (Phase 1): Mandant wählen, dann erfassen ──
        !client ? (
          <View style={{ flex: 1 }}>
            <Header email={session.user.email ?? ''} />
            <ClientPickerScreen
              onPick={(c) => {
                setClient(c);
                setView('capture');
              }}
            />
          </View>
        ) : view === 'queue' ? (
          <QueueScreen onBack={() => setView('capture')} />
        ) : (
          <CaptureScreen
            client={client}
            onChangeClient={() => setClient(null)}
            onOpenQueue={() => setView('queue')}
          />
        )
      ) : mandantToken ? (
        // ── Mandant (Phase 2): kein Picker, client_id steckt im Token ──
        view === 'queue' ? (
          <QueueScreen onBack={() => setView('capture')} />
        ) : (
          <CaptureScreen
            client={tokenClient}
            tokenMode
            onChangeClient={tokenLogout}
            onOpenQueue={() => setView('queue')}
          />
        )
      ) : (
        <LoginScreen onTokenLogin={handleTokenLogin} />
      )}
    </SafeAreaView>
  );
}

function Header({ email }: { email: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerEmail} numberOfLines={1}>
        {email}
      </Text>
      <Pressable onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logout}>Abmelden</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // SafeAreaView von react-native deckt nur iOS-Insets ab. Auf Android
  // (edge-to-edge) zeichnet die App sonst UNTER die Statusleiste — der
  // Zurück-Button lag dadurch hinter Uhr/Akku. paddingTop = Höhe der
  // Statusleiste schiebt den gesamten Inhalt darunter.
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgSidebar,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerEmail: { flex: 1, color: colors.textMuted, fontSize: 13 },
  logout: { color: colors.danger, fontSize: 14, fontWeight: '600' }
});
