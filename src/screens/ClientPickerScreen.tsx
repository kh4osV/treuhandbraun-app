// Mandantenauswahl. Liste kommt RLS-gefiltert aus Supabase (Unternehmer
// sieht hier nur einen Eintrag und überspringt den Screen effektiv).

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { listClients, type ClientRow } from '../lib/supabase';
import { colors, radius } from '../lib/theme';

export default function ClientPickerScreen({
  onPick
}: {
  onPick: (c: ClientRow) => void;
}) {
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    listClients()
      .then(setRows)
      .catch((e) => setErr(e?.message ?? 'Laden fehlgeschlagen'));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        (r.company_name ?? '').toLowerCase().includes(needle) ||
        r.client_id.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  if (err) return <Text style={styles.err}>{err}</Text>;
  if (!rows)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Mandant wählen</Text>
      <TextInput
        style={styles.search}
        placeholder="Suchen…"
        placeholderTextColor={colors.textDim}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.client_id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onPick(item)}>
            <Text style={styles.name}>{item.company_name ?? '(ohne Name)'}</Text>
            <Text style={styles.cid}>{item.client_id}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Kein Mandant gefunden.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg
  },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text },
  search: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text
  },
  row: { paddingVertical: 14 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  cid: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.border },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  err: { color: colors.danger, padding: 16, backgroundColor: colors.bg }
});
