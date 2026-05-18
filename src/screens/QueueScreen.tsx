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

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: 'Wartet',
  uploading: 'Lädt…',
  done: 'Hochgeladen',
  failed: 'Fehler'
};
const STATUS_COLOR: Record<QueueStatus, string> = {
  pending: '#b45309',
  uploading: '#1a56db',
  done: '#15803d',
  failed: '#c0392b'
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
        <Pressable onPress={onBack}>
          <Text style={styles.back}>‹ Zurück</Text>
        </Pressable>
        <Pressable onPress={() => clearDone()}>
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
                <Pressable onPress={() => retryItem(item.id)}>
                  <Text style={styles.action}>Erneut</Text>
                </Pressable>
              )}
              {(item.status === 'failed' || item.status === 'done') && (
                <Pressable onPress={() => removeItem(item.id)}>
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
  wrap: { flex: 1, backgroundColor: '#fff' },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  back: { color: '#1a56db', fontSize: 16 },
  clear: { color: '#6b7280', fontSize: 14 },
  row: { flexDirection: 'row', padding: 16, gap: 12 },
  client: { fontSize: 15, fontWeight: '600' },
  file: { fontSize: 12, color: '#888', marginTop: 2 },
  errTxt: { fontSize: 12, color: '#c0392b', marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  status: { fontSize: 13, fontWeight: '700' },
  action: { color: '#1a56db', fontSize: 13 },
  remove: { color: '#9ca3af', fontSize: 12 },
  sep: { height: 1, backgroundColor: '#f0f0f0' },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#888' }
});
