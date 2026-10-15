import { useEffect, useRef, useState } from "react";

/** Plays a short tone and shows a browser notification when a new urgent item appears. */

const MUTE_KEY = "movera-admin-alert-sound";

/** The bell's sound switch, shared by every part of the panel that plays a sound. */
export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "off";
  } catch {
    return false;
  }
}

/**
 * A short tone made with Web Audio. With waitForClick, a browser that holds sound until the
 * person clicks plays it on that first click instead of not at all.
 */
export function tone(urgent: boolean, waitForClick = false) {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const play = () => {
      const start = context.currentTime;
      const notes = urgent ? [880, 660, 880] : [660];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + index * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.18, start + index * 0.22 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.22 + 0.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + index * 0.22);
        oscillator.stop(start + index * 0.22 + 0.21);
      });
      window.setTimeout(() => void context.close(), 1200);
    };
    if (context.state !== "suspended" || !waitForClick) {
      play();
      return;
    }
    const resume = () => {
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
      void context.resume().then(play, () => void context.close());
    };
    document.addEventListener("pointerdown", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });
  } catch {
    // Sound is a convenience; the on-screen alert stays either way.
  }
}

export type Signal = { id: string; title: string; body: string; urgent: boolean; sound?: boolean; notify?: boolean };

export function useAlertSignals(signals: Signal[], ready: boolean) {
  const [muted, setMuted] = useState(readMuted);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    // The first load only remembers what is already there; later loads announce what is new.
    if (seen.current === null) {
      seen.current = new Set(signals.map((signal) => signal.id));
      return;
    }
    const added = signals.filter((signal) => !seen.current!.has(signal.id));
    for (const signal of added) seen.current.add(signal.id);
    if (!added.length) return;
    setFresh(added.map((signal) => signal.id));
    window.setTimeout(() => setFresh([]), 6000);
    const loud = added.filter((signal) => signal.sound !== false);
    if (!muted && loud.length) tone(loud.some((signal) => signal.urgent));
    if (permission === "granted" && document.visibilityState !== "visible") {
      for (const signal of added.filter((signal) => signal.notify !== false).slice(0, 3)) {
        try {
          new Notification(signal.title, { body: signal.body, tag: signal.id });
        } catch {
          // Some browsers only allow notifications from a service worker.
        }
      }
    }
  }, [signals, ready, muted, permission]);

  return {
    muted,
    fresh,
    permission,
    toggleMute() {
      setMuted((value) => {
        try {
          localStorage.setItem(MUTE_KEY, value ? "on" : "off");
        } catch {
          // Remembering the choice is optional.
        }
        return !value;
      });
    },
    async askPermission() {
      if (typeof Notification === "undefined") return;
      setPermission(await Notification.requestPermission());
    },
  };
}
