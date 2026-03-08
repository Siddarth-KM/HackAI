'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Grainient from './Granient';
import AnalysisResult, { AnalysisResponsePayload } from '../components/AnalysisResult';
import useAudioRecorder from '../hooks/useSpeechRecognition';

export default function Home() {

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening
  } = useAudioRecorder();

  /* Live-update text with speech transcript */
  const preRecordTextRef = useRef('');
  useEffect(() => {
    if (isListening && !preRecordTextRef.current && text) {
      preRecordTextRef.current = text;
    }
    if (!isListening && preRecordTextRef.current) {
      // Recording stopped — snapshot is stale
    }
  }, [isListening, text]);

  useEffect(() => {
    if (transcript) {
      const base = preRecordTextRef.current;
      const sep = base.endsWith('\n') || base === '' ? '' : ' ';
      setText(base + sep + transcript);
    }
  }, [transcript]);

  // Reset snapshot when recording starts
  const handleStartListening = useCallback(() => {
    preRecordTextRef.current = text;
    startListening();
  }, [text, startListening]);

  /* File upload */
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

  const handleRecord = () => {
    if (isListening) stopListening();
    else handleStartListening();
  };

  /* Run AI analysis */
  const handleAnalyze = async () => {

    const trimmed = text.trim();
    if (!trimmed) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    try {

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data: AnalysisResponsePayload = await response.json();

      setResult(data);

    } catch (err: unknown) {

      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);

    } finally {

      setLoading(false);

    }

  };

  return (

    <div style={{ position: "relative", minHeight: "100vh" }}>

      {/* BACKGROUND */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "#0c5e0b"
        }}
      >
        <Grainient
          color1="#0c5e0b"
          color2="#46bd3d"
          color3="#3e8603"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      <main className="container" style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}

        <h1 className="title mt-8">
          Interactive Analytics <br /> Made Simple
        </h1>

        <p className="subtitle">
          Upload market news, earnings calls, or incident reports.
          Our AI pipeline extracts signals, selects stocks, and delivers actionable recommendations.
        </p>

        {/* Upload Button */}

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>

          <button
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.csv,.md"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

        </div>

        {/* FEATURE CARDS */}

        <div className="grid-2 mb-8">

          <div className="glass-card">

            <h3>Signal Extraction</h3>

            <p className="mt-2">
              AI-powered analysis detects investment signals from raw text
              — earnings calls, incident reports, or market news.
            </p>

          </div>

          <div className="glass-card">

            <h3>Stock Selection</h3>

            <p className="mt-2">
              Automatically identifies the top S&amp;P 500 stocks most
              impacted by the detected signal and sector.
            </p>

          </div>

          <div className="glass-card">

            <h3>Sentiment &amp; Returns</h3>

            <p className="mt-2">
              Fetches real-time price returns and news sentiment scores
              to quantify each stock&apos;s outlook.
            </p>

          </div>

          <div className="glass-card">

            <h3>AI Recommendation</h3>

            <p className="mt-2">
              Generates an actionable long/short recommendation with
              timeframe, sector context, and supporting data.
            </p>

          </div>

        </div>

        {/* TEXT INPUT */}

        <div className="glass-card" style={{ maxWidth: "900px", margin: "0 auto" }}>

          <textarea
            className="input-textarea mb-4"
            placeholder="Paste or type your market intelligence here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {isSupported && (

            <button
              className={`input-mode-btn ${isListening ? "recording" : ""}`}
              onClick={handleRecord}
            >
              {isListening ? "Stop Recording" : "Record Voice"}
            </button>

          )}

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>

            <button
              className="btn"
              disabled={!text.trim() || loading}
              onClick={handleAnalyze}
            >
              {loading ? "Processing..." : "Run Analysis Pipeline"}
            </button>

          </div>

          {loading && (

            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <div className="loader" />
              <p>Running AI pipeline...</p>
            </div>

          )}

          {error && (

            <div
              className="mt-4"
              style={{
                background: "rgba(239,68,68,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                color: "#ff8a8a",
                textAlign: "center"
              }}
            >
              {error}
            </div>

          )}

        </div>

        {/* RESULT */}

        {result && !loading && (

          <>
            <AnalysisResult data={result} />

            <div style={{ textAlign: "center", marginTop: "3rem" }}>

              <button
                className="btn"
                onClick={() => {
                  setResult(null);
                  setText('');
                }}
              >
                Analyze Another
              </button>

            </div>
          </>

        )}

      </main>

    </div>

  );
}
