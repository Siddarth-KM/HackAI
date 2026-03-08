'use client';

import { BarChart3, TrendingUp, Filter, Zap, Upload, ArrowRight, Mic, Sparkles, Play, ChevronDown, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import AnalysisResult from "../components/AnalysisResult";
import GeminiChat from "../components/GeminiChat";

// Dynamically import Iridescence with SSR disabled to prevent WebGL crashes
const Iridescence = dynamic(() => import("./imports/iridescence-effect"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Landing() {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Voice Recording (ElevenLabs STT) ---
  const handleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') return;

      recorder.onstop = async () => {
        setIsRecording(false);
        recorder.stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');
          const res = await fetch(`${API_URL}/stt`, { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setInputText(prev => prev ? prev + ' ' + data.text : data.text);
              setHasData(true);
            }
          } else {
            const err = await res.json().catch(() => ({}));
            console.error('STT error:', err.detail || res.status);
          }
        } catch (err) {
          console.error('STT network error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.stop();
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorderRef.current = recorder;
        recorder.start(250);
        setIsRecording(true);
      } catch {
        alert('Microphone access denied. Please allow microphone permissions.');
      }
    }
  }, [isRecording]);

  // --- File Upload ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
        setHasData(true);
      };
      reader.readAsText(file);
    } else if (name.endsWith('.pdf') || name.endsWith('.csv')) {
      // For PDF/CSV, send directly to /analyze endpoint
      runAnalysisWithFile(file);
    }
  };

  // --- Text Change ---
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setHasData(e.target.value.trim().length > 0);
  };

  // --- Run Analysis (text) ---
  const runAnalysis = useCallback(async () => {
    if (!inputText.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch(`${API_URL}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setAnalysisResult(data);
      // Scroll to results
      setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputText, isAnalyzing]);

  // --- Run Analysis (file) ---
  const runAnalysisWithFile = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setAnalysisResult(data);
      setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scrollToInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <Iridescence 
          color={[0, 1, 0.3]}
          mouseReact={false}
          amplitude={0.1}
          speed={1}
        />
      </div>

      {/* Content */}
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
              <span className="text-xl font-semibold text-white">Analytics</span>
            </div>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <button
                  onClick={() => resultSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white text-emerald-900 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  View Results
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </motion.nav>

        {/* Hero Section */}
        <div className="w-full max-w-[1400px] mx-auto px-6 py-8 flex flex-col items-center justify-center text-center min-h-screen">
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-6xl font-semibold text-white tracking-tight leading-tight">
                Interactive Analytics
                <br />
                <span className="text-white/90">Made Simple</span>
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
            >
              Monitor business performance with cross-filtering dashboards. 
              Get real-time insights across sales, revenue, and regional metrics.
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
            className="grid grid-cols-3 gap-6 max-w-5xl mx-auto mt-12"
          >
            {[
              { icon: Filter, title: "Cross-Filtering", description: "Interactive charts that update dynamically when you select data points across visualizations.", delay: 0 },
              { icon: TrendingUp, title: "Real-Time Metrics", description: "Track revenue, sales, customers, and units sold with year-over-year growth comparisons.", delay: 0.1 },
              { icon: Zap, title: "Fast & Responsive", description: "Optimized for desktop viewing with smooth interactions and accessible design.", delay: 0.2 }
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
            <p className="text-white/60 text-sm mb-2">Upload your data to get started</p>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <ChevronDown className="w-8 h-8 text-white/60" />
            </motion.div>
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="w-full max-w-3xl mx-auto mt-16"
            ref={inputSectionRef}
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="Paste or type your market intelligence here..."
                  className="w-full h-48 bg-black/20 text-white placeholder:text-white/40 border border-white/10 rounded-xl p-4 pr-28 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-white/20 hover:bg-white/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-white/80" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={isRecording ? { 
                      boxShadow: ["0 0 0 0 rgba(239, 68, 68, 0.7)", "0 0 0 10px rgba(239, 68, 68, 0)"],
                    } : {}}
                    transition={isRecording ? { repeat: Infinity, duration: 1.5 } : {}}
                    onClick={handleRecord}
                    disabled={isTranscribing}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isTranscribing
                        ? "bg-yellow-500/50 cursor-wait"
                        : isRecording 
                          ? "bg-red-500 hover:bg-red-600" 
                          : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Mic className={`w-5 h-5 ${isRecording ? "text-white" : "text-white/80"}`} />
                    )}
                  </motion.button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.pdf,.csv"
                  className="hidden"
                />
              </div>

              {/* Recording / Transcribing indicator */}
              {(isRecording || isTranscribing) && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {isRecording && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-300">Recording... click mic to stop</span>
                    </>
                  )}
                  {isTranscribing && (
                    <>
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-emerald-300">Transcribing audio...</span>
                    </>
                  )}
                </div>
              )}
              
              {/* Error display */}
              {analysisError && (
                <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {analysisError}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={runAnalysis}
                className={`w-full mt-6 px-6 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg font-medium group ${
                  hasData && !isAnalyzing
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-gray-500/30 text-white/50 cursor-not-allowed"
                }`}
                disabled={!hasData || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Run Analysis Pipeline
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Analysis Results */}
          {analysisResult && (
            <motion.div
              ref={resultSectionRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-5xl mx-auto mt-16 mb-16 space-y-6"
            >
              <AnalysisResult data={analysisResult} />
              <GeminiChat context={analysisResult.summary_recommendation || JSON.stringify(analysisResult.signal)} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}