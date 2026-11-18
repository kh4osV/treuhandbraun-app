// Gemeinsame Anzeige von Zeitpunkt und Kontovorgaben eines Belegs
// (Startbildschirm „Zuletzt hochgeladen" und Verlauf, EN-0025).

import type { QueueItem } from './queue';

const pad = (n: number) => String(n).padStart(2, '0');

/** 18.11.2026 */
export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 14:30:05 — mit Sekunden, damit sich Belege einer Serie unterscheiden lassen. */
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Zahlungskonto des Belegs, wie es bei der Erfassung gewählt war. Heute gibt
 * es nur „privat bezahlt"; ohne Angabe ordnet Fluke den Beleg einer
 * Bankbuchung zu.
 */
export function paymentLabel(it: Pick<QueueItem, 'privatePaid'>): string {
  return it.privatePaid ? 'privat bezahlt' : 'Bank (automatisch)';
}
