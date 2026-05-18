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
import { colors, radius } from '../lib/theme';

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
      {/* Brand-Block wie in der Web-Sidebar: grosser Name + Akzent-Mikrolabel */}
      <Text style={styles.brand}>Fluke</Text>
      <Text style={styles.edition}>BELEG-UPLOAD</Text>
      <Text style={styles.sub}>Belege fotografieren & hochladen</Text>

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        placeholderTextColor={colors.textDim}
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
          placeholderTextColor={colors.textDim}
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
        {busy ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.btnText}>Anmelden</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.bg
  },
  brand: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    color: colors.text
  },
  edition: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
    color: colors.accent,
    marginTop: 2
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md
  },
  pwInput: { flex: 1, padding: 14, fontSize: 16, color: colors.text },
  pwToggle: { paddingHorizontal: 12, paddingVertical: 14 },
  pwToggleText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  err: { color: colors.danger, fontSize: 14 }
});
