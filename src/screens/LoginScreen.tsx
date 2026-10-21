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
import { looksLikeToken } from '../lib/token';
import { verifyMandantToken } from '../lib/api';
import { IS_DEV_BUILD } from '../lib/config';
import { colors, radius } from '../lib/theme';

export default function LoginScreen({
  onTokenLogin
}: {
  onTokenLogin: (token: string) => void;
}) {
  const [mode, setMode] = useState<'staff' | 'token'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenErr, setTokenErr] = useState<string | null>(null);

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

  // Code erst am Server prüfen, dann speichern — sonst sieht der Login gut
  // aus und jeder Beleg scheitert später mit 401 im Verlauf.
  async function tokenSignIn() {
    const t = tokenInput.trim();
    if (!looksLikeToken(t)) {
      setTokenErr('Ungültiger Code. Ein gültiger Code beginnt mit "fit_".');
      return;
    }
    setTokenErr(null);
    setBusy(true);
    const check = await verifyMandantToken(t);
    setBusy(false);
    if (check.ok) {
      onTokenLogin(t);
    } else if (check.reason === 'invalid') {
      setTokenErr(
        IS_DEV_BUILD
          ? 'Dieser Code wird hier nicht akzeptiert. Das ist eine Testversion der App — Codes aus der Buchhaltung funktionieren nur in der regulären App.'
          : 'Dieser Code ist ungültig oder wurde widerrufen. Bitte bei deinem Treuhänder einen neuen Code anfordern.'
      );
    } else {
      setTokenErr(
        `Der Code konnte nicht geprüft werden (${check.error}). Bitte mit Internetverbindung erneut versuchen.`
      );
    }
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

      {mode === 'staff' ? (
        <>
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

          <Pressable style={styles.modeSwitch} onPress={() => setMode('token')} hitSlop={8}>
            <Text style={styles.modeSwitchText}>Als Mandant mit Code anmelden</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.tokenHint}>
            Code aus der E-Mail deines Treuhänders hier einfügen.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="fit_…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            value={tokenInput}
            onChangeText={setTokenInput}
          />

          {tokenErr ? <Text style={styles.err}>{tokenErr}</Text> : null}

          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={tokenSignIn}
          >
            {busy ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.btnText}>Anmelden</Text>
            )}
          </Pressable>

          <Pressable style={styles.modeSwitch} onPress={() => setMode('staff')} hitSlop={8}>
            <Text style={styles.modeSwitchText}>Team-Login (E-Mail / Passwort)</Text>
          </Pressable>
        </>
      )}
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
  err: { color: colors.danger, fontSize: 14 },
  modeSwitch: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  modeSwitchText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  tokenHint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 4 }
});
