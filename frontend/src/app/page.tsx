'use client';

import React, { useState, useRef } from 'react';
import AnalysisResult, { AnalysisResponsePayload } from '../components/AnalysisResult';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to parse the JSON error body from FastAPI
        let errorMessage = `Server returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Response wasn't JSON, try reading as text
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch {
            // ignore
          }
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
        Upload market news, reports, or text signals. Our AI pipeline will extract signals, identify affected S&P 500 stocks, and compute their financial metrics & sentiment.
      </p>

      {!result && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div 
            className={`upload-area ${dragOver ? 'dragover' : ''} mb-6`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".txt" 
            />
            {file ? (
              <div>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--accent)' }}>{file.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Ready to analyze</div>
              </div>
            ) : (
              <div>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.5rem' }}>Click to upload or drag & drop</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>TXT files only (max 10MB)</div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button 
              className="btn" 
              onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
              disabled={!file || loading}
              style={{ width: '100%', maxWidth: '300px' }}
            >
              {loading ? 'Processing Pipeline...' : 'Run Analysis Pipeline'}
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--text-secondary)' }}>Running Massive API & Alpha Vantage Data Fetching...</p>
            </div>
          )}

          {error && (
            <div className="mt-6" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', color: '#ff8a8a', textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {result && !loading && (
        <>
          <AnalysisResult data={result} />
          <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '3rem' }}>
            <button className="btn" onClick={() => { setResult(null); setFile(null); }}>
              Analyze Another Document
            </button>
          </div>
        </>
      )}

    </main>
  );
}
