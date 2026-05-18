// Login mit denselben Team-Accounts wie die Web-App (E-Mail/Passwort).
// Google-OAuth wäre additiv möglich, ist für Phase 1 bewusst weggelassen.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function signIn() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) setErr(error.message);
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>fluke Treuhand</Text>
      <Text style={styles.sub}>Belege fotografieren & hochladen</Text>

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.pwRow}>
        <TextInput
          style={styles.pwInput}
          placeholder="Passwort"
          secureTextEntry={!showPw}
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={styles.pwToggle} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
          <Text style={styles.pwToggleText}>{showPw ? '🙈 verbergen' : '👁 anzeigen'}</Text>
        </Pressable>
      </View>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={signIn}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Anmelden</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 16
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8
  },
  pwInput: { flex: 1, padding: 14, fontSize: 16 },
  pwToggle: { paddingHorizontal: 12, paddingVertical: 14 },
  pwToggleText: { color: '#1a56db', fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  err: { color: '#c0392b', fontSize: 14 }
});
