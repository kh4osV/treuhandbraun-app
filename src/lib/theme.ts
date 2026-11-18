// Visuelles Design-System — 1:1 auf die "fluke"-Palette der Web-App
// abgestimmt (web/src/app.css). Dunkles Theme, Bernstein-Akzent.
// Eine Quelle der Wahrheit, damit App- und Web-Look gleich bleiben.

import { Platform } from 'react-native';

export const colors = {
  bg: '#0e1320',
  bgPanel: '#161c2e',
  bgSidebar: '#11172a',
  bgRowHover: '#1a2238',
  bgInput: '#0b1020',
  border: '#1f2940',
  borderStrong: '#2c3957',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#f59e0b',
  accentHover: '#fbbf24',
  accentSoft: 'rgba(245, 158, 11, 0.12)',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa'
} as const;

export const radius = { md: 8, lg: 12 } as const;

/**
 * EN-0022: Freier Rand unten auf Android. Die App zeichnet edge-to-edge,
 * also auch unter die Navigationsleiste (Zurück/Home/Übersicht). Ohne
 * diesen Rand lag „Verlauf ansehen" auf diesen Symbolen und liess sich nicht
 * antippen. 48 dp ist die Höhe der Leiste mit drei Knöpfen (knapp 1 cm);
 * die genaue Höhe liefert erst react-native-safe-area-context, das einen
 * neuen nativen Build braucht.
 */
export const bottomInset = Platform.OS === 'android' ? 48 : 0;
