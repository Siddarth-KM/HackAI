'use client';

/**
 * Stub hook — STT integration is disabled for now.
 * Exposes the interface that page.tsx expects.
 */
export default function useAudioRecorder() {
  return {
    transcript: '',
    isListening: false,
    isSupported: false,   // hides voice buttons until STT is wired up
    startListening: () => {},
    stopListening: () => {},
  };
}
