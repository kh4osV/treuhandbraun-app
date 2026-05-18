// Offline-Queue + Retry. Belege werden oft ohne Netz fotografiert —
// jeder Upload geht zuerst in eine persistente Queue (AsyncStorage),
// ein Prozessor arbeitet sie ab, sobald Netz da ist.
//
// Die Bilddatei wird vorher ins documentDirectory kopiert, damit sie
// einen App-Neustart / Cache-Clear überlebt.

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { uploadReceipt } from './api';

const STORE_KEY = 'intake.queue.v1';
const QUEUE_DIR = `${FileSystem.documentDirectory}intake-queue/`;

export type QueueStatus = 'pending' | 'uploading' | 'done' | 'failed';

export type QueueItem = {
  id: string;
  fileUri: string; // stabile Kopie in QUEUE_DIR
  fileName: string;
  mime: string;
  clientId: string;
  clientName: string;
  createdAt: number;
  attempts: number;
  status: QueueStatus;
  lastError?: string;
  remotePath?: string;
};

type Listener = (items: QueueItem[]) => void;
const listeners = new Set<Listener>();
let items: QueueItem[] = [];
let loaded = false;
let draining = false;

function emit() {
  for (const l of listeners) l([...items]);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  l([...items]);
  return () => listeners.delete(l);
}

async function persist() {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(items));
}

export async function loadQueue(): Promise<void> {
  if (loaded) return;
  await FileSystem.makeDirectoryAsync(QUEUE_DIR, { intermediates: true }).catch(() => {});
  const raw = await AsyncStorage.getItem(STORE_KEY);
  items = raw ? (JSON.parse(raw) as QueueItem[]) : [];
  // Hängengebliebene "uploading" beim Start zurücksetzen.
  for (const it of items) if (it.status === 'uploading') it.status = 'pending';
  loaded = true;
  emit();
}

export async function enqueue(src: {
  fileUri: string;
  fileName: string;
  mime: string;
  clientId: string;
  clientName: string;
}): Promise<void> {
  await loadQueue();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dest = `${QUEUE_DIR}${id}_${src.fileName}`;
  await FileSystem.copyAsync({ from: src.fileUri, to: dest });

  items.unshift({
    id,
    fileUri: dest,
    fileName: src.fileName,
    mime: src.mime,
    clientId: src.clientId,
    clientName: src.clientName,
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending'
  });
  await persist();
  emit();
  void drain();
}

export async function retryItem(id: string): Promise<void> {
  const it = items.find((x) => x.id === id);
  if (!it) return;
  it.status = 'pending';
  it.lastError = undefined;
  await persist();
  emit();
  void drain();
}

export async function removeItem(id: string): Promise<void> {
  const it = items.find((x) => x.id === id);
  if (it) await FileSystem.deleteAsync(it.fileUri, { idempotent: true }).catch(() => {});
  items = items.filter((x) => x.id !== id);
  await persist();
  emit();
}

export async function clearDone(): Promise<void> {
  const done = items.filter((x) => x.status === 'done');
  for (const it of done)
    await FileSystem.deleteAsync(it.fileUri, { idempotent: true }).catch(() => {});
  items = items.filter((x) => x.status !== 'done');
  await persist();
  emit();
}

// Sequentiell abarbeiten — eine Datei nach der anderen, kein Hammer
// gegen den Endpoint, klar nachvollziehbare Reihenfolge.
export async function drain(): Promise<void> {
  if (draining) return;
  await loadQueue();

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  draining = true;
  try {
    for (const it of items) {
      if (it.status !== 'pending') continue;
      it.status = 'uploading';
      it.attempts += 1;
      emit();

      const res = await uploadReceipt({
        fileUri: it.fileUri,
        fileName: it.fileName,
        mime: it.mime,
        clientId: it.clientId
      });

      if (res.ok) {
        it.status = 'done';
        it.remotePath = res.path;
        it.lastError = undefined;
      } else if (res.retryable) {
        it.status = 'pending'; // beim nächsten drain erneut
        it.lastError = res.error;
        await persist();
        emit();
        break; // Netz/Server-Problem → Rest später
      } else {
        it.status = 'failed'; // 400/401/403/409 — manueller Eingriff
        it.lastError = `${res.status}: ${res.error}`;
      }
      await persist();
      emit();
    }
  } finally {
    draining = false;
  }
}

// Wieder online → automatisch weitermachen.
NetInfo.addEventListener((s) => {
  if (s.isConnected) void drain();
});
