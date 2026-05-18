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
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Mandant wählen</Text>
      <TextInput
        style={styles.search}
        placeholder="Suchen…"
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
  wrap: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  },
  row: { paddingVertical: 14 },
  name: { fontSize: 16, fontWeight: '600' },
  cid: { fontSize: 12, color: '#888', marginTop: 2 },
  sep: { height: 1, backgroundColor: '#eee' },
  empty: { color: '#888', textAlign: 'center', marginTop: 24 },
  err: { color: '#c0392b', padding: 16 }
});
