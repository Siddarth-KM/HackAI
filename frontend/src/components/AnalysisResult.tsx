'use client';

import React from 'react';

// Aligning with the Pydantic models in the backend
interface SignalExtraction {
  signal_summary: string;
  sector: string;
  timeframe: string;
  direction: string;
}

interface StockReturns {
  ticker: string;
  company_name: string;
  last_close: number | null;
  week_return_pct: number | null;
  month_return_pct: number | null;
  three_month_return_pct: number | null;
  year_return_pct: number | null;
}

interface ArticleSentiment {
  title: string;
  url: string;
  published_at: string;
  sentiment_score: number;
  relevance_score: number;
}

interface StockSentiment {
  ticker: string;
  articles: ArticleSentiment[];
  average_sentiment: number | null;
}

interface StockAnalysis {
  returns: StockReturns;
  sentiment: StockSentiment;
  chart_base64: string | null;
}

export interface AnalysisResponsePayload {
  signal: SignalExtraction;
  selected_stocks: string[];
  stock_analyses: StockAnalysis[];
  summary_recommendation: string;
}

interface AnalysisResultProps {
  data: AnalysisResponsePayload;
}

const FormatPct = ({ value }: { value: number | null }) => {
  if (value === null) return <span>N/A</span>;
  const isPositive = value >= 0;
  return (
    <span className={isPositive ? 'text-success' : 'text-danger'}>
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
};

type Timeframe = '1W' | '1M' | '3M' | '1Y';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '1W', label: '1 Week' },
  { key: '1M', label: '1 Month' },
  { key: '3M', label: '3 Months' },
  { key: '1Y', label: '1 Year' },
];

function getReturnForTimeframe(returns: StockReturns, tf: Timeframe): number | null {
  switch (tf) {
    case '1W': return returns.week_return_pct;
    case '1M': return returns.month_return_pct;
    case '3M': return returns.three_month_return_pct;
    case '1Y': return returns.year_return_pct;
  }
}

function ReturnBar({ value, maxAbsValue }: { value: number | null; maxAbsValue: number }) {
  if (value === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '100%', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>N/A</span>
        </div>
      </div>
    );
  }

  const isPositive = value >= 0;
  const widthPct = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 0;
  const barColor = isPositive ? 'var(--success)' : 'var(--danger)';
  const barBg = isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: '28px' }}>
      <div style={{ flex: 1, height: '100%', background: 'rgba(0,0,0,0.35)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: isPositive ? '50%' : `${50 - (widthPct / 2)}%`,
            width: `${widthPct / 2}%`,
            height: '100%',
            background: barBg,
            borderLeft: isPositive ? `2px solid ${barColor}` : 'none',
            borderRight: !isPositive ? `2px solid ${barColor}` : 'none',
            borderRadius: '2px',
            transition: 'width 0.5s ease-out, left 0.5s ease-out',
          }}
        />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <span style={{ minWidth: '72px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: barColor }}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
}

export default function AnalysisResult({ data }: AnalysisResultProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<Timeframe>('1M');
  const [showCharts, setShowCharts] = React.useState(false);
  const [ttsState, setTtsState] = React.useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Cleanup TTS audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const returnValues = data.stock_analyses.map(s => getReturnForTimeframe(s.returns, selectedTimeframe)).filter(v => v !== null) as number[];
  const maxAbsValue = returnValues.length > 0 ? Math.max(...returnValues.map(Math.abs), 1) : 1;

  const handleListenToSummary = async () => {
    if (ttsState === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTtsState('idle');
      return;
    }

    setTtsState('loading');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.summary_recommendation }),
      });

      if (!response.ok) throw new Error('TTS request failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setTtsState('idle');
        URL.revokeObjectURL(url);
      };

      audio.play();
      setTtsState('playing');
    } catch (err) {
      console.error('TTS error:', err);
      setTtsState('idle');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', marginTop: '3rem' }}>

      {/* 1. Signal Overview */}
      <div className="glass-card mb-8">
        <div className="flex-between mb-4">
          <h2>Investment Signal Detected</h2>
          <span className={`badge ${data.signal.direction.toLowerCase()}`}>
            {data.signal.direction.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          {data.signal.signal_summary}
        </p>
        <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Sector</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{data.signal.sector}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Timeframe</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{data.signal.timeframe}</div>
          </div>
        </div>
      </div>

      {/* 2. Comparative Returns with Timeframe Toggle */}
      <div className="glass-card mb-8">
        <div className="flex-between mb-6">
          <h3>Stock Returns Comparison</h3>
          <div className="timeframe-toggle">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                className={`tf-btn ${selectedTimeframe === tf.key ? 'active' : ''}`}
                onClick={() => setSelectedTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.stock_analyses.map((stock, idx) => {
            const returnVal = getReturnForTimeframe(stock.returns, selectedTimeframe);
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <span className="text-accent" style={{ fontWeight: 700, fontSize: '1rem' }}>{stock.returns.ticker}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    ${stock.returns.last_close?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <ReturnBar value={returnVal} maxAbsValue={maxAbsValue} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Matplotlib Charts Toggle */}
      {data.stock_analyses.some(s => s.chart_base64) && (
        <div className="glass-card mb-8">
          <div className="flex-between mb-4">
            <h3>Detailed Return Charts</h3>
            <button
              className={`btn ${showCharts ? '' : 'btn-outline'}`}
              onClick={() => setShowCharts(!showCharts)}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          {showCharts && (
            <div className="grid-2" style={{ marginTop: '1rem' }}>
              {data.stock_analyses.map((stock, idx) => (
                stock.chart_base64 && (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '0.5rem', overflow: 'hidden' }}>
                    <img
                      src={`data:image/png;base64,${stock.chart_base64}`}
                      alt={`${stock.returns.ticker} returns chart`}
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Stock Details Grid */}
      <h3 className="mb-4">Individual Stock Analysis</h3>
      <div className="grid-2 mb-8">
        {data.stock_analyses.map((stock, idx) => (
          <div key={idx} className="glass-card">
            <div className="flex-between mb-4">
              <h4 style={{ fontSize: '1.25rem' }}>
                <span className="text-accent">{stock.returns.ticker}</span>
              </h4>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {stock.returns.company_name}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div className="flex-between mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Last Close</span>
                <strong>${stock.returns.last_close?.toFixed(2) || 'N/A'}</strong>
              </div>
              <div className="flex-between mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>1W Return</span>
                <strong><FormatPct value={stock.returns.week_return_pct} /></strong>
              </div>
              <div className="flex-between mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>1M Return</span>
                <strong><FormatPct value={stock.returns.month_return_pct} /></strong>
              </div>
              <div className="flex-between mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>3M Return</span>
                <strong><FormatPct value={stock.returns.three_month_return_pct} /></strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)' }}>1Y Return</span>
                <strong><FormatPct value={stock.returns.year_return_pct} /></strong>
              </div>
            </div>
            <div>
              <div className="flex-between mb-2">
                <span style={{ fontSize: '0.9rem' }}>Average Sentiment</span>
                <span className={`badge ${stock.sentiment.average_sentiment != null && stock.sentiment.average_sentiment >= 0 ? 'long' : 'short'}`}>
                  {stock.sentiment.average_sentiment != null ? stock.sentiment.average_sentiment.toFixed(2) : 'N/A'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Based on {stock.sentiment.articles.length} recent articles
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Final Summary with TTS */}
      <div className="glass-card mb-8" style={{ border: '1px solid var(--accent)' }}>
        <div className="flex-between mb-4">
          <h3 className="text-accent">AI Summary & Recommendation</h3>
          <button
            className={`tts-btn ${ttsState === 'playing' ? 'playing' : ''} ${ttsState === 'loading' ? 'loading' : ''}`}
            onClick={handleListenToSummary}
            disabled={ttsState === 'loading'}
          >
            {ttsState === 'loading' && (
              <><div className="tts-spinner" /> Generating...</>
            )}
            {ttsState === 'playing' && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                Stop
              </>
            )}
            {ttsState === 'idle' && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                Listen
              </>
            )}
          </button>
        </div>
        <p style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#e4e4e7' }}>
          {data.summary_recommendation}
        </p>
      </div>

    </div>
  );
}
