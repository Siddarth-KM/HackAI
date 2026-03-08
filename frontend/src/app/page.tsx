import { Link } from "react-router";
import { BarChart3, TrendingUp, Filter, Zap, Upload, ArrowRight, Mic, Sparkles, Play, ChevronDown } from "lucide-react";
import Iridescence from "../imports/iridescence-effect";
import { motion } from "motion/react";
import { useState, useRef } from "react";

export default function Landing() {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasData, setHasData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);

  const handleRecord = () => {
    setIsRecording(!isRecording);
    // In a real app, this would start/stop voice recording
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
        setHasData(true);
      };
      reader.readAsText(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setHasData(e.target.value.trim().length > 0);
  };

  const scrollToInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <Iridescence 
          color={[0, 1, 0.3]}
          mouseReact={true}
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
            {hasData && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <button
                  onClick={() => alert('Dashboard feature coming soon!')}
                  className="px-6 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white text-emerald-900 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  View Dashboard
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
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isRecording 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? "text-white" : "text-white/80"}`} />
                  </motion.button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full mt-6 px-6 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg font-medium group ${
                  hasData 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-gray-500/30 text-white/50 cursor-not-allowed"
                }`}
                disabled={!hasData}
              >
                <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Run Analysis Pipeline
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}