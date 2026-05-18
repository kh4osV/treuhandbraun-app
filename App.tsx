// Root: Auth-Gate + schlanke State-Navigation (kein react-navigation
// nötig für drei Screens). Session wird von Supabase persistiert.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase, type ClientRow } from './src/lib/supabase';
import { loadQueue, drain } from './src/lib/queue';
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
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
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
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerEmail: { flex: 1, color: '#6b7280', fontSize: 13 },
  logout: { color: '#c0392b', fontSize: 14, fontWeight: '600' }
});
