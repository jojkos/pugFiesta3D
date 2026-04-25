import { useCallback } from 'react';

export function useFunnySpeech(muted: boolean) {
  return useCallback(
    (text: string) => {
      if (muted || typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.pitch = 1 + (Math.random() - 0.5) * 0.35;
      utterance.rate = 1.08;

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((item) => item.lang.startsWith('en')) ?? voices[0];
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    },
    [muted],
  );
}
