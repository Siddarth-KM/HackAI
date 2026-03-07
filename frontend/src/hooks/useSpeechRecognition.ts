'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
  error: string | null;
}

export default function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect chunks every 250ms
      setIsRecording(true);
    } catch (err: any) {
      setError('Microphone access denied. Please allow mic access and try again.');
      console.error('MediaRecorder error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve('');
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);

        // Stop all tracks to release the mic
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (audioBlob.size === 0) {
          resolve('');
          return;
        }

        // Send to backend /stt endpoint
        setIsTranscribing(true);
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const response = await fetch(`${apiUrl}/stt`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.detail || `STT failed with status ${response.status}`;
            setError(msg);
            console.warn('STT error response:', msg);
            resolve('');
            return;
          }

          const data = await response.json();
          resolve(data.text || '');
        } catch (err: any) {
          setError(err.message || 'Transcription failed — check your connection and ElevenLabs API key');
          console.warn('STT fetch error:', err);
          resolve('');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}
