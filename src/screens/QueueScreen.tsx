// Verlauf/Queue: zeigt Status jedes Belegs, erlaubt Retry bei
// dauerhaften Fehlern und Aufräumen erledigter Einträge.

import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  subscribe,
  loadQueue,
  drain,
  retryItem,
  removeItem,
  clearDone,
  type QueueItem,
  type QueueStatus
} from '../lib/queue';
import { colors, radius } from '../lib/theme';

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: 'Wartet',
  uploading: 'Lädt…',
  done: 'Hochgeladen',
  failed: 'Fehler'
};
const STATUS_COLOR: Record<QueueStatus, string> = {
  pending: colors.warning,
  uploading: colors.info,
  done: colors.success,
  failed: colors.danger
};

export default function QueueScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    const unsub = subscribe(setItems);
    loadQueue().then(() => drain());
    return unsub;
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {/* Klar erkennbarer, grossflächiger Zurück-Button (Pill).
            Vertikaler Versatz unter die Statusleiste passiert in App.tsx. */}
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <Text style={styles.backTxt}>‹ Zurück</Text>
        </Pressable>
        <Pressable onPress={() => clearDone()} hitSlop={10}>
          <Text style={styles.clear}>Erledigte löschen</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        ListEmptyComponent={<Text style={styles.empty}>Keine Belege in der Queue.</Text>}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.client}>{item.clientName}</Text>
              <Text style={styles.file}>{item.fileName}</Text>
              {item.lastError ? <Text style={styles.errTxt}>{item.lastError}</Text> : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
              {item.status === 'failed' && (
                <Pressable onPress={() => retryItem(item.id)} hitSlop={8}>
                  <Text style={styles.action}>Erneut</Text>
                </Pressable>
              )}
              {(item.status === 'failed' || item.status === 'done') && (
                <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                  <Text style={styles.remove}>Entfernen</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgSidebar,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgPanel
  },
  backTxt: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  clear: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', padding: 16, gap: 12 },
  client: { fontSize: 15, fontWeight: '600', color: colors.text },
  file: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  errTxt: { fontSize: 12, color: colors.danger, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  status: { fontSize: 13, fontWeight: '700' },
  action: { color: colors.accent, fontSize: 13 },
  remove: { color: colors.textDim, fontSize: 12 },
  sep: { height: 1, backgroundColor: colors.border },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted }
});
