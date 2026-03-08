'use client';

import { BarChart3, TrendingUp, Filter, Zap, Upload, Mic, Play, ChevronDown, Loader2, ChevronUp, Brain, LineChart, Globe } from "lucide-react";
import Iridescence from "./imports/iridescence-effect";
import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import useAudioRecorder from "../hooks/useSpeechRecognition";
import AnalysisResult, { type AnalysisResponsePayload } from "../components/AnalysisResult";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Landing() {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersona] = useState('Default');
  const [personaOpen, setPersonaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const { transcript, isListening, isSupported, startListening, stopListening } = useAudioRecorder();

  // Append transcript to textarea as voice recording produces text
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const hasData = inputText.trim().length > 0;

  const handleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const scrollToInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAnalyze = async () => {
    if (!hasData || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const res = await fetch(`${API_URL}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, persona }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: 'Analysis failed' }));
        throw new Error(body.detail || `Server returned ${res.status}`);
      }
      const data: AnalysisResponsePayload = await res.json();
      setAnalysisResult(data);
      setTimeout(() => resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ===== HERO SECTION with animated background ===== */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Animated Gradient Background - only covers hero */}
        <div className="absolute inset-0 w-full h-full z-0 blur-in-lg">
          <Iridescence 
            color={[0, 0.7, 0.3]}
            mouseReact={true}
            amplitude={0.1}
            speed={1}
          />
        </div>

        <div className="relative z-10">
          {/* Navigation */}
          <motion.nav 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[1400px] mx-auto px-6 py-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg"
                >
                  <BarChart3 className="w-6 h-6 text-emerald-800" />
                </motion.div>
                <span className="text-xl font-semibold text-white">HackAI Market Intelligence</span>
              </div>
            </div>
          </motion.nav>

          {/* Hero Content */}
          <div className="w-full max-w-[1400px] mx-auto px-6 py-8 flex flex-col items-center justify-center text-center min-h-[calc(100vh-88px)]">
            <div className="max-w-4xl mx-auto space-y-6">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h1 className="text-6xl font-semibold text-white tracking-tight leading-tight">
                  Market Intelligence
                  <br />
                  <span className="text-white/90">Powered by AI</span>
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
              >
                Turn raw market text into actionable investment signals. 
                Extract sectors, select S&P 500 stocks, analyze returns & sentiment — all in one pipeline.
              </motion.p>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex items-center justify-center gap-4 pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={scrollToInput}
                  className="px-8 py-4 bg-white hover:bg-gray-50 text-emerald-900 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-xl font-medium"
                >
                  <ChevronDown className="w-5 h-5" />
                  <span>Get Started</span>
                </motion.button>
              </motion.div>
            </div>

            {/* Feature Cards */}
            <motion.div 
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12"
            >
              {[
                { icon: Filter, title: "Signal Extraction", description: "AI extracts investment signals, identifies sectors and directional bias from your raw market text.", delay: 0 },
                { icon: TrendingUp, title: "Stock Selection & Returns", description: "Automatically selects relevant S&P 500 stocks and fetches historical returns across multiple timeframes.", delay: 0.1 },
                { icon: Zap, title: "Sentiment & Recommendations", description: "Aggregates news sentiment per stock and generates an AI-powered investment recommendation.", delay: 0.2 }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1 + feature.delay }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-left hover:bg-white/15 transition-all duration-300 cursor-pointer group"
                >
                  <motion.div 
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors"
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.6 }}
              className="mt-8 flex flex-col items-center cursor-pointer"
              onClick={scrollToInput}
            >
              <p className="text-white/60 text-sm mb-2">Paste market text or speak to get started</p>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ChevronDown className="w-8 h-8 text-white/60" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ===== Gradient bridge between hero and work section ===== */}
      <div className="h-40 -mt-40 relative z-20 bg-gradient-to-b from-transparent to-[#1f4d35]" />

      {/* ===== WORK SECTION with solid dark green background ===== */}
      <div className="bg-[#1f4d35] min-h-screen" ref={inputSectionRef}>
        <div className="w-full max-w-[1400px] mx-auto px-6 py-16">
          {/* Input Section */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-3xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="Paste or type your market intelligence here..."
                  className="w-full h-48 bg-emerald-800/50 text-white placeholder:text-white/40 border border-white/15 rounded-xl p-4 pr-28 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-white/10 hover:bg-white/20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-white/80" />
                  </motion.button>
                  {isSupported && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={isListening ? { 
                        boxShadow: ["0 0 0 0 rgba(239, 68, 68, 0.7)", "0 0 0 10px rgba(239, 68, 68, 0)"],
                      } : {}}
                      transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
                      onClick={handleRecord}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isListening 
                          ? "bg-red-500 hover:bg-red-600" 
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <Mic className={`w-5 h-5 ${isListening ? "text-white" : "text-white/80"}`} />
                    </motion.button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                {/* Persona Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPersonaOpen(!personaOpen)}
                    className="h-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-medium flex items-center gap-2 hover:bg-white/15 transition-all min-w-[160px] justify-between"
                  >
                    <span className="truncate">{persona}</span>
                    <ChevronUp className={`w-4 h-4 text-white/60 transition-transform ${personaOpen ? '' : 'rotate-180'}`} />
                  </button>
                  {personaOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl overflow-hidden shadow-2xl z-50">
                      {['Default', 'Ray Dalio', 'Warren Buffett', 'Simplify', 'Quant'].map((p) => (
                        <button
                          key={p}
                          onClick={() => { setPersona(p); setPersonaOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-all ${
                            persona === p
                              ? 'bg-emerald-600/30 text-emerald-300'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              <motion.button
                whileHover={hasData && !isAnalyzing ? { scale: 1.02 } : {}}
                whileTap={hasData && !isAnalyzing ? { scale: 0.98 } : {}}
                className={`flex-1 px-6 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg font-medium group ${
                  hasData && !isAnalyzing
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-gray-500/30 text-white/50 cursor-not-allowed"
                }`}
                disabled={!hasData || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> Run Analysis Pipeline</>
                )}
              </motion.button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>
          </motion.div>

          {/* How It Works Cards */}
          {!analysisResult && (
            <div className="w-full max-w-5xl mx-auto mt-16">
              <motion.h3
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5 }}
                className="text-2xl font-semibold text-white text-center mb-8"
              >How It Works</motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Brain,
                    title: "AI-Powered NLP",
                    body: "Your raw text is sent to Google's Gemini 2.5 Flash model, which uses natural language processing to extract the core investment signal — identifying the relevant market sector, directional bias (long or short), and recommended timeframe. It also scores the reliability of the input so you know how actionable the signal really is.",
                    delay: 0,
                  },
                  {
                    icon: LineChart,
                    title: "Market Data & Returns",
                    body: "We cross-reference the AI's signal against the full S&P 500 list, filter by sector, and select the top 4 stocks. Each stock's historical returns (1W, 1M, 3M, 1Y) are fetched via the Polygon / Massive API, and detailed return charts are generated with Matplotlib for visual comparison.",
                    delay: 0.15,
                  },
                  {
                    icon: Globe,
                    title: "Sentiment & Recommendation",
                    body: "For each selected stock, we pull recent news articles and sentiment scores from Alpha Vantage's News Sentiment API. All data — returns, sentiment, and the original signal — is fed back into Gemini to produce a final AI-generated investment recommendation you can listen to via ElevenLabs text-to-speech.",
                    delay: 0.3,
                  },
                ].map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: card.delay }}
                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col items-start"
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
                      <card.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-3">{card.title}</h4>
                    <p className="text-white/60 text-sm leading-relaxed">{card.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div ref={resultsSectionRef} className="w-full max-w-5xl mx-auto mt-12 mb-16">
              <AnalysisResult data={analysisResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}