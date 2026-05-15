/**
 * Sound utilities — WAV blobs played via fresh Audio elements.
 *
 * Key design decisions:
 *  - Blob URLs are created ONCE at module load (fast, no repeated encoding).
 *  - A NEW Audio element is created on every play() call so there is no
 *    "already paused" state that some browsers silently block.
 *  - unlockAudio() is kept for mobile autoplay policy: on the first user
 *    gesture we silently play every sound at volume 0 to earn permission.
 */

// ---------------------------------------------------------------------------
// WAV generator
// ---------------------------------------------------------------------------

function createWav(notes, sampleRate = 22050) {
  const totalDuration =
    notes.reduce((max, n) => Math.max(max, (n.startTime || 0) + n.duration), 0) + 0.02;
  const numSamples = Math.ceil(sampleRate * totalDuration);
  const dataBytes  = numSamples * 2;
  const buf        = new ArrayBuffer(44 + dataBytes);
  const view       = new DataView(buf);

  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0,  'RIFF'); view.setUint32(4, 36 + dataBytes, true);
  str(8,  'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, dataBytes, true);

  const mix = new Float32Array(numSamples);
  for (const note of notes) {
    const s   = Math.floor((note.startTime || 0) * sampleRate);
    const len = Math.min(numSamples - s, Math.ceil(note.duration * sampleRate));
    const vol = note.volume ?? 0.5;
    for (let i = 0; i < len; i++) {
      const t       = i / sampleRate;
      const attack  = Math.min(1, t / 0.008);
      const release = Math.max(0, 1 - (i / len) * 0.85);
      mix[s + i]   += Math.sin(2 * Math.PI * note.frequency * t) * attack * release * vol;
    }
  }

  // Normalise peak
  let peak = 0;
  for (let i = 0; i < numSamples; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const scale = peak > 0.95 ? 0.95 / peak : 1;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, Math.round(mix[i] * scale * 32767), true);
  }

  return new Blob([buf], { type: 'audio/wav' });
}

// ---------------------------------------------------------------------------
// Pre-build blob URLs once (cheap to reuse, fast to play)
// ---------------------------------------------------------------------------

function makeUrl(notes) {
  try { return URL.createObjectURL(createWav(notes)); } catch { return null; }
}

const URLS = {
  scanSuccess: makeUrl([
    { frequency: 1800, duration: 0.14, volume: 0.7, startTime: 0 },
  ]),
  scanError: makeUrl([
    { frequency: 260, duration: 0.18, volume: 0.7, startTime: 0    },
    { frequency: 180, duration: 0.18, volume: 0.7, startTime: 0.22 },
  ]),
  appReady: makeUrl([
    { frequency: 523, duration: 0.18, volume: 0.3, startTime: 0    },
    { frequency: 659, duration: 0.18, volume: 0.3, startTime: 0.22 },
    { frequency: 784, duration: 0.26, volume: 0.3, startTime: 0.44 },
  ]),
};

// ---------------------------------------------------------------------------
// Core play helper — always creates a FRESH Audio element
// ---------------------------------------------------------------------------

function play(url) {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.play().catch(() => {/* autoplay blocked */});
  } catch { /* not supported */ }
}

// ---------------------------------------------------------------------------
// Unlock — silently exercises each blob URL on the first user gesture so
// the browser grants autoplay permission for subsequent async calls.
// ---------------------------------------------------------------------------

export function unlockAudio() {
  const unlock = () => {
    Object.values(URLS).forEach((url) => {
      if (!url) return;
      const a = new Audio(url);
      a.volume = 0;
      a.play().then(() => { a.pause(); }).catch(() => {});
    });
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('mousedown',  unlock, true);
    document.removeEventListener('keydown',    unlock, true);
  };
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('mousedown',  unlock, true);
  document.addEventListener('keydown',    unlock, true);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Short beep — barcode scanned successfully. */
export function playScanSuccess() { play(URLS.scanSuccess); }

/** Double low buzz — barcode not found / error. */
export function playScanError()   { play(URLS.scanError);   }

/** Ascending chime — application has loaded. */
export function playAppReady()    { play(URLS.appReady);    }
