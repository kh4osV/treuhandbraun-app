// Foto/PDF erfassen → JPEG (HEIC wird dabei konvertiert) + Kompression
// (kleiner = besser/billiger für die Gemini-Extraktion serverseitig) →
// in die Offline-Queue. Der Upload selbst passiert in queue.ts.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { ClientRow } from '../lib/supabase';
import { enqueue, subscribe, type QueueItem } from '../lib/queue';
import { fetchIntakeAccounts, type IntakeAccount } from '../lib/api';
import { colors, radius } from '../lib/theme';

export default function CaptureScreen({
  client,
  onChangeClient,
  onOpenQueue,
  tokenMode = false
}: {
  client: ClientRow;
  onChangeClient: () => void;
  onOpenQueue: () => void;
  tokenMode?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  // FR 11.08.2026 #22: Serien-Aufnahme. Solange die Serie läuft, öffnet sich
  // die Kamera nach jedem Bild sofort wieder — beendet wird sie mit „Fertig"
  // oder indem der Kunde die Kamera abbricht.
  const [seriesCount, setSeriesCount] = useState<number | null>(null);

  // FR 06.08.2026 #19/#20: Kontovorgabe für die nächsten Belege.
  const [accounts, setAccounts] = useState<IntakeAccount[]>([]);
  const [account, setAccount] = useState<IntakeAccount | null>(null);
  const [privatePaid, setPrivatePaid] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // FR 11.08.2026 #23: Der Kunde sah nicht, was er hochgeladen hat — der
  // Verlauf lag hinter einer unscheinbaren Leiste. Die letzten Belege stehen
  // jetzt direkt auf dem Startbildschirm.
  const [queue, setQueue] = useState<QueueItem[]>([]);
  useEffect(() => subscribe(setQueue), []);
  const recent = queue.slice(0, 3);
  const openCount = queue.filter((q) => q.status !== 'done').length;

  useEffect(() => {
    let alive = true;
    void fetchIntakeAccounts(client.client_id).then((list) => {
      if (alive) setAccounts(list);
    });
    return () => {
      alive = false;
    };
  }, [client.client_id]);

  // Mandantenwechsel: Vorgaben gehören zum alten Mandanten.
  useEffect(() => {
    setAccount(null);
    setPrivatePaid(false);
  }, [client.client_id]);

  async function handle(asset: ImagePicker.ImagePickerAsset) {
    setBusy(true);
    try {
      // Lange Kante auf 2000px, JPEG q70 — reicht für OCR/Gemini,
      // konvertiert HEIC mit.
      const out = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 2000 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await enqueue({
        fileUri: out.uri,
        fileName: `beleg_${ts}.jpg`,
        mime: 'image/jpeg',
        clientId: client.client_id,
        clientName: client.company_name ?? client.client_id,
        accountNumber: account?.account_number ?? null,
        accountLabel: account ? `${account.account_number} ${account.account_name ?? ''}`.trim() : null,
        // Nur der Haken — welches Gegenkonto „privat bezahlt" bedeutet,
        // entscheidet der Treuhänder pro Mandant in Fluke.
        privatePaid
      });
      // Kein Bestätigungs-Dialog — der Beleg geht still in die Queue, damit
      // das Erfassen mehrerer Belege nicht durch OK-Klicks unterbrochen wird.
      // Status/Fehler sind jederzeit im Verlauf sichtbar.
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte Beleg nicht verarbeiten.');
    } finally {
      setBusy(false);
    }
  }

  async function shoot() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Kamera', 'Kamerazugriff wurde verweigert.');
      return;
    }
    // Serie: nach jedem Bild direkt wieder auf. Abbrechen in der Kamera
    // beendet die Serie — das ist die natürliche „ich bin fertig"-Geste.
    let count = seriesCount ?? 0;
    setSeriesCount(count);
    for (;;) {
      const r = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
      if (r.canceled || !r.assets[0]) break;
      await handle(r.assets[0]);
      count += 1;
      setSeriesCount(count);
    }
  }

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      exif: false
    });
    if (!r.canceled && r.assets[0]) await handle(r.assets[0]);
  }

  function finishSeries() {
    setSeriesCount(null);
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.clientBar} onPress={onChangeClient}>
        <Text style={styles.clientLabel}>{tokenMode ? 'Angemeldet' : 'Mandant'}</Text>
        <Text style={styles.clientName}>{client.company_name ?? client.client_id}</Text>
        <Text style={styles.change}>{tokenMode ? 'abmelden ›' : 'ändern ›'}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.center}>
        {busy ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <>
            {/* FR 11.08.2026 #21 */}
            <Text style={styles.hint}>
              Bitte nur EINEN Beleg pro Foto — mehrere Belege auf einem Bild können nicht
              getrennt verarbeitet werden.
            </Text>

            <Pressable style={styles.primary} onPress={shoot}>
              <Text style={styles.primaryText}>📷  Beleg fotografieren</Text>
            </Pressable>

            {seriesCount !== null && (
              <View style={styles.series}>
                <Text style={styles.seriesText}>
                  {seriesCount === 0
                    ? 'Serie gestartet — die Kamera öffnet nach jedem Bild wieder.'
                    : `${seriesCount} Beleg${seriesCount === 1 ? '' : 'e'} in dieser Serie erfasst.`}
                </Text>
                <Pressable style={styles.done} onPress={finishSeries}>
                  <Text style={styles.doneText}>✓  Fertig</Text>
                </Pressable>
              </View>
            )}

            <Pressable style={styles.secondary} onPress={pick}>
              <Text style={styles.secondaryText}>Aus Galerie wählen</Text>
            </Pressable>

            {/* FR 06.08.2026 #19/#20 — nur zeigen, wenn der Mandant eine
                brauchbare Kurzliste hat. Sonst bleibt alles wie bisher. */}
            {accounts.length > 0 && (
              <View style={styles.optBox}>
                <Text style={styles.optTitle}>Kontierung (optional)</Text>
                <Pressable style={styles.optRow} onPress={() => setPickerOpen(true)}>
                  <Text style={styles.optLabel}>Sachkonto</Text>
                  <Text style={styles.optValue}>
                    {account
                      ? `${account.account_number} ${account.account_name ?? ''}`.trim()
                      : 'automatisch ›'}
                  </Text>
                </Pressable>
                <Pressable style={styles.optRow} onPress={() => setPrivatePaid((v) => !v)}>
                  <Text style={styles.optLabel}>Privat bezahlt</Text>
                  <Text style={styles.optValue}>{privatePaid ? 'ja ✓' : 'nein'}</Text>
                </Pressable>
                <Text style={styles.optHint}>
                  Gilt für alle Belege, die du ab jetzt fotografierst — bis du es wieder
                  änderst.
                </Text>
              </View>
            )}

            {/* FR 11.08.2026 #23 */}
            {recent.length > 0 && (
              <View style={styles.recentBox}>
                <Text style={styles.optTitle}>Zuletzt hochgeladen</Text>
                {recent.map((it) => (
                  <View key={it.id} style={styles.recentRow}>
                    <Text style={styles.recentDot}>
                      {it.status === 'done' ? '✓' : it.status === 'failed' ? '✗' : '…'}
                    </Text>
                    <Text style={styles.recentText} numberOfLines={1}>
                      {new Date(it.createdAt).toLocaleString('de-CH', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {it.accountLabel ? ` · ${it.accountLabel}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Pressable style={styles.queueBtn} onPress={onOpenQueue}>
        <Text style={styles.queueText}>
          Verlauf ansehen{openCount > 0 ? ` · ${openCount} offen` : ''}
        </Text>
      </Pressable>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sachkonto wählen</Text>
            <ScrollView style={styles.modalList}>
              <Pressable
                style={styles.accRow}
                onPress={() => {
                  setAccount(null);
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.accName}>Automatisch (Fluke entscheidet)</Text>
              </Pressable>
              {accounts.map((a) => (
                <Pressable
                  key={a.account_number}
                  style={styles.accRow}
                  onPress={() => {
                    setAccount(a);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.accNum}>{a.account_number}</Text>
                  <Text style={styles.accName} numberOfLines={1}>
                    {a.account_name ?? ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Abbrechen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  clientBar: {
    backgroundColor: colors.bgSidebar,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  clientLabel: { fontSize: 12, color: colors.textDim },
  clientName: { fontSize: 16, fontWeight: '700', color: colors.text },
  change: { position: 'absolute', right: 16, top: 22, color: colors.accent },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center'
  },
  primaryText: { color: colors.bg, fontSize: 18, fontWeight: '700' },
  series: {
    width: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    alignItems: 'center'
  },
  seriesText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  done: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center'
  },
  doneText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 12 },
  secondaryText: { color: colors.accent, fontSize: 16 },
  optBox: {
    width: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  optTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  optRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12
  },
  optLabel: { color: colors.textMuted, fontSize: 14 },
  optValue: { color: colors.accent, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  optHint: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
  recentBox: {
    width: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentDot: { color: colors.textMuted, fontSize: 14, width: 16 },
  recentText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  queueBtn: {
    padding: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSidebar
  },
  queueText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bgPanel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 16,
    maxHeight: '75%'
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingBottom: 10
  },
  modalList: { paddingHorizontal: 8 },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  accNum: { color: colors.accent, fontSize: 15, fontWeight: '700', width: 56 },
  accName: { color: colors.text, fontSize: 15, flex: 1 },
  modalClose: { padding: 18, alignItems: 'center' },
  modalCloseText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' }
});
