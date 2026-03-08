'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mic, Sparkles, Loader2, ChevronUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STORAGE_KEY = 'hackai-chat-history';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiChatProps {
  context: string;
}

export default function GeminiChat({ context }: GeminiChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load conversation from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored));
    } catch {}
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context,
          history: newMessages.slice(-10),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Voice recording
  const toggleRecording = async () => {
    if (isRecording) {
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
              sendMessage(data.text);
            }
          }
        } catch (err) {
          console.error('STT error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.stop();
    } else {
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
        console.error('Mic access denied');
      }
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'rgba(15, 15, 15, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Ask Gemini about these results</div>
            <div className="text-xs text-gray-400">Voice or text — powered by Gemini AI</div>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronUp className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Expandable Chat Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Messages */}
              <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-6">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-emerald-500/40" />
                    <p>Ask me anything about the analysis results above.</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-white/10 text-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-400 px-3 py-2 rounded-xl rounded-bl-sm text-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {isTranscribing && (
                  <div className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Transcribing...
                  </div>
                )}
                <div className="flex items-center gap-2 w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about the analysis..."
                    disabled={isLoading || isTranscribing}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleRecording}
                    disabled={isLoading || isTranscribing}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Mic className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-gray-400'}`} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading || isTranscribing}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Clear button */}
              {messages.length > 0 && (
                <div className="px-4 pb-3">
                  <button onClick={clearHistory} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    Clear conversation
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
