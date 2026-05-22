// Foto/PDF erfassen → JPEG (HEIC wird dabei konvertiert) + Kompression
// (kleiner = besser/billiger für die Gemini-Extraktion serverseitig) →
// in die Offline-Queue. Der Upload selbst passiert in queue.ts.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { ClientRow } from '../lib/supabase';
import { enqueue } from '../lib/queue';
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
        clientName: client.company_name ?? client.client_id
      });
      Alert.alert('In Queue', 'Beleg wird hochgeladen, sobald Netz da ist.');
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
    const r = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
    if (!r.canceled && r.assets[0]) await handle(r.assets[0]);
  }

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      exif: false
    });
    if (!r.canceled && r.assets[0]) await handle(r.assets[0]);
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.clientBar} onPress={onChangeClient}>
        <Text style={styles.clientLabel}>{tokenMode ? 'Beleg-Upload' : 'Mandant'}</Text>
        <Text style={styles.clientName}>{client.company_name ?? client.client_id}</Text>
        <Text style={styles.change}>{tokenMode ? 'abmelden ›' : 'ändern ›'}</Text>
      </Pressable>

      <View style={styles.center}>
        {busy ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <>
            <Pressable style={styles.primary} onPress={shoot}>
              <Text style={styles.primaryText}>📷  Beleg fotografieren</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={pick}>
              <Text style={styles.secondaryText}>Aus Galerie wählen</Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable style={styles.queueBtn} onPress={onOpenQueue}>
        <Text style={styles.queueText}>Verlauf / Queue</Text>
      </Pressable>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center'
  },
  primaryText: { color: colors.bg, fontSize: 18, fontWeight: '700' },
  secondary: { paddingVertical: 12 },
  secondaryText: { color: colors.accent, fontSize: 16 },
  queueBtn: {
    padding: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  queueText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' }
});
