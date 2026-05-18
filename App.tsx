// Root: Auth-Gate + schlanke State-Navigation (kein react-navigation
// nötig für drei Screens). Session wird von Supabase persistiert.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { loadQueue, drain } from './src/lib/queue';
import { colors } from './src/lib/theme';
import LoginScreen from './src/screens/LoginScreen';
import ClientPickerScreen from './src/screens/ClientPickerScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import QueueScreen from './src/screens/QueueScreen';

type Screen = 'capture' | 'queue';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [view, setView] = useState<Screen>('capture');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setClient(null);
    });
    loadQueue().then(() => drain());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor={colors.bg} />
      {!session ? (
        <LoginScreen />
      ) : !client ? (
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
