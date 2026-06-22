// Verlauf/History: zeigt jeden erfassten Beleg mit Foto-Vorschau und Status,
// erlaubt das erneute Hochladen fehlgeschlagener Uploads und das Aufräumen
// erledigter Einträge. Die Fotos liegen lokal in QUEUE_DIR (queue.ts) und
// bleiben erhalten, bis ein Eintrag entfernt wird — so lassen sich Belege
// jederzeit nachschauen.

import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
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

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function QueueScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  // Aktuell im Vollbild geöffneter Beleg (Foto-Vorschau).
  const [preview, setPreview] = useState<QueueItem | null>(null);

  useEffect(() => {
    const unsub = subscribe(setItems);
    loadQueue().then(() => drain());
    return unsub;
  }, []);

  // Erledigte löschen entfernt jetzt auch die lokal gespeicherten Fotos —
  // deshalb vorher nachfragen, damit niemand versehentlich Belege verliert.
  function confirmClearDone() {
    const done = items.filter((i) => i.status === 'done').length;
    if (done === 0) return;
    Alert.alert(
      'Erledigte löschen',
      `${done} hochgeladene${done === 1 ? 'n Beleg' : ' Belege'} inkl. Foto vom Gerät entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => void clearDone() }
      ]
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {/* Klar erkennbarer, grossflächiger Zurück-Button (Pill).
            Vertikaler Versatz unter die Statusleiste passiert in App.tsx. */}
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <Text style={styles.backTxt}>‹ Zurück</Text>
        </Pressable>
        <Pressable onPress={confirmClearDone} hitSlop={10}>
          <Text style={styles.clear}>Erledigte löschen</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        ListEmptyComponent={<Text style={styles.empty}>Noch keine Belege erfasst.</Text>}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {/* Foto-Thumbnail — Tippen öffnet die Vollbild-Vorschau. */}
            <Pressable onPress={() => setPreview(item)} hitSlop={6}>
              <Image source={{ uri: item.fileUri }} style={styles.thumb} resizeMode="cover" />
            </Pressable>

            <View style={styles.mid}>
              <Text style={styles.title}>Beleg vom {fmtDate(item.createdAt)}</Text>
              <Text style={styles.file} numberOfLines={1}>
                {fmtTime(item.createdAt)} Uhr · {item.fileName}
              </Text>
              {item.lastError ? <Text style={styles.errTxt}>{item.lastError}</Text> : null}
            </View>

            <View style={styles.right}>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
              {item.status === 'failed' && (
                <Pressable style={styles.retryBtn} onPress={() => retryItem(item.id)} hitSlop={8}>
                  <Text style={styles.retryTxt}>Nochmals hochladen</Text>
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

      {/* Vollbild-Vorschau des Belegfotos. */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <Pressable style={styles.modalBg} onPress={() => setPreview(null)}>
          {preview ? (
            <>
              <Image source={{ uri: preview.fileUri }} style={styles.full} resizeMode="contain" />
              <Text style={styles.modalCaption}>
                Beleg vom {fmtDate(preview.createdAt)} · {fmtTime(preview.createdAt)} Uhr
              </Text>
              <Text style={styles.modalHint}>Tippen zum Schliessen</Text>
            </>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const THUMB = 56;

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
  row: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'center' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border
  },
  mid: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  file: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  errTxt: { fontSize: 12, color: colors.danger, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  status: { fontSize: 13, fontWeight: '700' },
  retryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent
  },
  retryTxt: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  remove: { color: colors.textDim, fontSize: 12 },
  sep: { height: 1, backgroundColor: colors.border },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted },
  // ── Vollbild-Vorschau ──────────────────────────────────────────────
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  full: { width: '100%', height: '82%' },
  modalCaption: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 16 },
  modalHint: { color: colors.textMuted, fontSize: 13, marginTop: 6 }
});
