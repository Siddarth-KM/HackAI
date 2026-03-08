'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TRANSCRIBE_INTERVAL_MS = 3000;

async function transcribeBlob(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  const res = await fetch(`${API_URL}/stt`, { method: 'POST', body: formData });
  if (!res.ok) return '';
  const data = await res.json();
  return data.text || '';
}

export default function useAudioRecorder() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcribingRef = useRef(false);

  const transcribeCurrentChunks = useCallback(async () => {
    if (transcribingRef.current || chunksRef.current.length === 0) return;
    transcribingRef.current = true;

    try {
      const blob = new Blob([...chunksRef.current], { type: 'audio/webm' });
      if (blob.size === 0) return;
      const text = await transcribeBlob(blob);
      if (text) setTranscript(text);
    } catch (err) {
      console.error('Live STT error:', err);
    } finally {
      transcribingRef.current = false;
    }
  }, []);

  const startListening = useCallback(async () => {
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsListening(true);

      // Periodically transcribe accumulated audio
      intervalRef.current = setInterval(transcribeCurrentChunks, TRANSCRIBE_INTERVAL_MS);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  }, [transcribeCurrentChunks]);

  const stopListening = useCallback(() => {
    // Stop periodic transcription
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    mediaRecorder.onstop = async () => {
      setIsListening(false);
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());

      // Final transcription of the complete audio
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];
      if (audioBlob.size === 0) return;

      try {
        const text = await transcribeBlob(audioBlob);
        if (text) setTranscript(text);
      } catch (err) {
        console.error('Final STT error:', err);
      }
    };

    mediaRecorder.stop();
  }, []);

  return { transcript, isListening, isSupported, startListening, stopListening };
}
