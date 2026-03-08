'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Download, List, AlignLeft } from 'lucide-react';
import GeminiChat from './GeminiChat';

// Aligning with the Pydantic models in the backend
interface SignalExtraction {
  signal_summary: string;
  sector: string;
  timeframe: string;
  direction: string;
  reliability_score: number;
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
  chatContext?: string;
}

const FormatPct = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-white/50">N/A</span>;
  const isPositive = value >= 0;
  return (
    <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
};

type Timeframe = '1W' | '1M' | '3M' | '1Y';

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
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
      <div className="flex items-center h-7">
        <div className="w-full h-full bg-white/5 rounded flex items-center justify-center">
          <span className="text-xs text-white/40">N/A</span>
        </div>
      </div>
    );
  }

  const isPositive = value >= 0;
  const widthPct = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3 h-7">
      <div className="flex-1 h-full bg-black/40 rounded relative overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-sm transition-all duration-500"
          style={{
            left: isPositive ? '50%' : `${50 - (widthPct / 2)}%`,
            width: `${widthPct / 2}%`,
            background: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            borderLeft: isPositive ? '2px solid rgb(16, 185, 129)' : 'none',
            borderRight: !isPositive ? '2px solid rgb(239, 68, 68)' : 'none',
          }}
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
      </div>
      <span className={`min-w-[72px] text-right font-semibold text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
}

// Glass card wrapper with scroll-triggered reveal
function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function getActByDate(timeframe: string): { date: string; urgency: string; color: string } {
  const now = new Date();
  const tf = timeframe.toLowerCase().replace(/\s+/g, '');
  let daysToAct: number;

  if (tf.includes('1month') || tf.includes('1m')) {
    daysToAct = 1;
  } else if (tf.includes('3month') || tf.includes('3m')) {
    daysToAct = 7;
  } else if (tf.includes('6month') || tf.includes('6m')) {
    daysToAct = 21;
  } else if (tf.includes('1year') || tf.includes('1y') || tf.includes('12m')) {
    daysToAct = 60;
  } else {
    daysToAct = 3;
  }

  const actBy = new Date(now.getTime() + daysToAct * 86400000);
  const date = actBy.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let urgency: string;
  let color: string;
  if (daysToAct <= 1) {
    urgency = 'Act today';
    color = 'text-red-400';
  } else if (daysToAct <= 7) {
    urgency = 'Act this week';
    color = 'text-yellow-400';
  } else if (daysToAct <= 30) {
    urgency = 'Act this month';
    color = 'text-emerald-400';
  } else {
    urgency = 'Flexible window';
    color = 'text-emerald-400';
  }

  return { date, urgency, color };
}

function buildReportText(data: AnalysisResponsePayload): string {
  const lines: string[] = [];
  const sep = '='.repeat(60);

  lines.push(sep);
  lines.push('  SIGIL — SIGNAL INTELLIGENCE REPORT');
  lines.push(`  Generated: ${new Date().toLocaleString()}`);
  lines.push(sep);

  lines.push('');
  lines.push('SIGNAL OVERVIEW');
  lines.push('-'.repeat(40));
  lines.push(`Direction:    ${data.signal.direction.toUpperCase()}`);
  lines.push(`Sector:       ${data.signal.sector}`);
  lines.push(`Timeframe:    ${data.signal.timeframe}`);
  lines.push(`Reliability:  ${data.signal.reliability_score}/100`);
  const actBy = getActByDate(data.signal.timeframe);
  lines.push(`Act By:       ${actBy.date} (${actBy.urgency})`);
  lines.push('');
  lines.push(`Summary: ${data.signal.signal_summary}`);

  lines.push('');
  lines.push('SELECTED STOCKS');
  lines.push('-'.repeat(40));
  lines.push(data.selected_stocks.join(', '));

  for (const stock of data.stock_analyses) {
    const r = stock.returns;
    lines.push('');
    lines.push(sep);
    lines.push(`${r.ticker} — ${r.company_name}`);
    lines.push(sep);
    lines.push('');
    lines.push('Returns:');
    const fmt = (v: number | null) => v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : 'N/A';
    lines.push(`  Last Close:  $${r.last_close?.toFixed(2) ?? 'N/A'}`);
    lines.push(`  1-Week:      ${fmt(r.week_return_pct)}`);
    lines.push(`  1-Month:     ${fmt(r.month_return_pct)}`);
    lines.push(`  3-Month:     ${fmt(r.three_month_return_pct)}`);
    lines.push(`  1-Year:      ${fmt(r.year_return_pct)}`);

    lines.push('');
    lines.push('Sentiment:');
    lines.push(`  Average:     ${stock.sentiment.average_sentiment?.toFixed(3) ?? 'N/A'}`);
    lines.push(`  Articles:    ${stock.sentiment.articles.length}`);
    if (stock.sentiment.articles.length > 0) {
      lines.push('');
      lines.push('  Recent articles:');
      for (const a of stock.sentiment.articles.slice(0, 5)) {
        lines.push(`    • ${a.title}`);
        lines.push(`      Sentiment: ${a.sentiment_score.toFixed(3)}  |  ${a.url}`);
      }
    }
  }

  lines.push('');
  lines.push(sep);
  lines.push('AI SUMMARY & RECOMMENDATION');
  lines.push(sep);
  lines.push('');
  lines.push(data.summary_recommendation);
  lines.push('');

  return lines.join('\n');
}

export default function AnalysisResult({ data, chatContext }: AnalysisResultProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<Timeframe>('1M');
  const [showCharts, setShowCharts] = React.useState(false);
  const [ttsState, setTtsState] = React.useState<'idle' | 'loading' | 'playing'>('idle');
  const [bulletMode, setBulletMode] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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

  const directionColor = data.signal.direction.toLowerCase() === 'long'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : 'bg-red-500/20 text-red-300 border-red-500/30';

  return (
    <div className="space-y-6">

      {/* 1. Signal Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Investment Signal Detected</h2>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${directionColor}`}>
              {data.signal.direction.toUpperCase()}
            </span>
          </div>
        </div>
        <p className="text-base text-white/70 leading-relaxed mb-5">
          {data.signal.signal_summary}
        </p>
        <div className="flex items-center justify-between border-t border-white/10 pt-5">
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Target Sector</div>
            <div className="text-lg font-medium text-white">{data.signal.sector}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Reliability</div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                data.signal.reliability_score >= 70 ? 'text-emerald-400' :
                data.signal.reliability_score >= 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.signal.reliability_score}
              </span>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${data.signal.reliability_score}%` }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  className={`h-full rounded-full ${
                    data.signal.reliability_score >= 70 ? 'bg-emerald-400' :
                    data.signal.reliability_score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Timeframe</div>
            <div className="text-lg font-medium text-white">{data.signal.timeframe}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Act By</div>
            {(() => {
              const { date, urgency, color } = getActByDate(data.signal.timeframe);
              return (
                <div>
                  <div className="text-lg font-medium text-white">{date}</div>
                  <div className={`text-xs font-semibold ${color}`}>{urgency}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* 2. Comparative Returns */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-medium text-white">Stock Returns Comparison</h3>
          <div className="flex bg-white/10 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedTimeframe === tf.key
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
                onClick={() => setSelectedTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {data.stock_analyses.map((stock, idx) => (
            <div key={idx} className="grid gap-3 items-center" style={{ gridTemplateColumns: '130px 1fr' }}>
              <div>
                <span className="text-emerald-400 font-bold">{stock.returns.ticker}</span>
                <span className="text-white/40 text-xs ml-2">
                  ${stock.returns.last_close?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <ReturnBar value={getReturnForTimeframe(stock.returns, selectedTimeframe)} maxAbsValue={maxAbsValue} />
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Charts Toggle */}
      {data.stock_analyses.some(s => s.chart_base64) && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-medium text-white">Detailed Return Charts</h3>
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
              onClick={() => setShowCharts(!showCharts)}
            >
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          {showCharts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {data.stock_analyses.map((stock, idx) => (
                stock.chart_base64 && (
                  <div key={idx} className="bg-white/95 rounded-xl p-2 overflow-hidden">
                    <img
                      src={`data:image/png;base64,${stock.chart_base64}`}
                      alt={`${stock.returns.ticker} returns chart`}
                      className="w-full h-auto block rounded-lg"
                    />
                  </div>
                )
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. Stock Details Grid */}
      <div>
        <motion.h3
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-xl font-medium text-white mb-4"
        >Individual Stock Analysis</motion.h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.stock_analyses.map((stock, idx) => (
            <Card key={idx} delay={idx * 0.15}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-emerald-400">{stock.returns.ticker}</h4>
                <span className="text-sm text-white/50">{stock.returns.company_name}</span>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Last Close</span>
                  <span className="text-white font-semibold">${stock.returns.last_close?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">1W Return</span>
                  <span className="font-semibold"><FormatPct value={stock.returns.week_return_pct} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">1M Return</span>
                  <span className="font-semibold"><FormatPct value={stock.returns.month_return_pct} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">3M Return</span>
                  <span className="font-semibold"><FormatPct value={stock.returns.three_month_return_pct} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">1Y Return</span>
                  <span className="font-semibold"><FormatPct value={stock.returns.year_return_pct} /></span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/70">Average Sentiment</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    stock.sentiment.average_sentiment != null && stock.sentiment.average_sentiment >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {stock.sentiment.average_sentiment != null ? stock.sentiment.average_sentiment.toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-white/40">
                  Based on {stock.sentiment.articles.length} recent articles
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. Final Summary with TTS */}
      <Card className="border-emerald-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-emerald-400">AI Summary & Recommendation</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulletMode(!bulletMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
              title={bulletMode ? 'Show as paragraph' : 'Show as bullet points'}
            >
              {bulletMode ? <AlignLeft className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {bulletMode ? 'Paragraph' : 'Bullets'}
            </button>
            <button
              onClick={() => {
                const text = buildReportText(data);
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hackai-report-${data.selected_stocks.join('-').toLowerCase()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                ttsState === 'playing'
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : ttsState === 'loading'
                    ? 'bg-white/10 text-white/50 cursor-wait'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
              onClick={handleListenToSummary}
              disabled={ttsState === 'loading'}
            >
            {ttsState === 'loading' && (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
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
        </div>
        {bulletMode ? (
          <ul className="space-y-2 text-white/80 leading-relaxed list-none">
            {data.summary_recommendation
              .split(/(?<=[.!?])\s+/)
              .filter(s => s.trim().length > 0)
              .map((sentence, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{sentence.trim()}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {data.summary_recommendation}
          </p>
        )}

        {chatContext && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <GeminiChat context={chatContext} />
          </div>
        )}
      </Card>

    </div>
  );
}
