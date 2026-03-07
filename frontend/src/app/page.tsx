'use client';

import React, { useState, useRef } from 'react';
import AnalysisResult, { AnalysisResponsePayload } from '../components/AnalysisResult';
import useAudioRecorder from '../hooks/useSpeechRecognition';

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, isTranscribing, startRecording, stopRecording, error: recError } = useAudioRecorder();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRecord = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        setText(prev => prev ? prev + '\n' + transcript : transcript);
      }
    } else {
      startRecording();
    }
  };

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const data: AnalysisResponsePayload = await response.json();
      setResult(data);
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setError('Cannot connect to backend server. Make sure the FastAPI server is running on http://localhost:8000');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1 className="title mt-8">HackAI Market Intelligence</h1>
      <p className="subtitle">
        Type, paste, upload, or speak your market intelligence. Our AI pipeline extracts signals, identifies affected S&P 500 stocks, and computes financial metrics & sentiment.
      </p>

      {!result && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Input mode buttons */}
          <div className="input-modes mb-4">
            <button
              className="input-mode-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload a .txt file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload .txt
            </button>

            <button
              className={`input-mode-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleRecord}
              disabled={isTranscribing}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording && <span className="recording-dot" />}
              {isTranscribing ? (
                <><div className="tts-spinner" style={{ width: '14px', height: '14px' }} /> Transcribing...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  {isRecording ? 'Stop' : 'Record'}
                </>
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt"
              style={{ display: 'none' }}
            />
          </div>

          {/* Textarea */}
          <textarea
            className="input-textarea mb-4"
            placeholder="Type or paste your market intelligence, news, report, or signal here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />

          {isRecording && (
            <div className="recording-banner mb-4">
              <span className="recording-dot" />
              Recording... Click &quot;Stop&quot; when done speaking
            </div>
          )}

          {isTranscribing && (
            <div className="recording-banner mb-4" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>
              <div className="tts-spinner" /> Transcribing with ElevenLabs Scribe...
            </div>
          )}

          {(recError || error) && (
            <div className="mt-2 mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#ff8a8a', fontSize: '0.9rem' }}>
              {recError || error}
            </div>
          )}

          {/* Analyze button */}
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn"
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              style={{ width: '100%', maxWidth: '300px' }}
            >
              {loading ? 'Processing Pipeline...' : 'Run Analysis Pipeline'}
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <div className="loader" />
              <p style={{ color: 'var(--text-secondary)' }}>Running AI pipeline — this may take a minute...</p>
            </div>
          )}
        </div>
      )}

      {result && !loading && (
        <>
          <AnalysisResult data={result} />
          <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '3rem' }}>
            <button className="btn" onClick={() => { setResult(null); setText(''); }}>
              Analyze Another Document
            </button>
          </div>
        </>
      )}
    </main>
  );
}
