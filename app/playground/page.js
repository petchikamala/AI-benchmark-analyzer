'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Sparkles,
  Play,
  Copy,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  Check,
  Plus,
  LayoutGrid,
  Bookmark,
  X,
  Sliders,
  ChevronDown,
  Cpu,
  Search,
  Key,
  ShieldAlert,
  ArrowRight,
  Trophy,
  Clock,
  DollarSign,
  Code,
  Terminal,
  Eye,
  HelpCircle,
  CheckCircle2,
  Settings,
  Activity,
  History,
  BarChart3,
  Database,
  RefreshCw,
  AlertCircle,
  XCircle,
  KeyRound,
  FileText,
  ArrowLeft
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ZAxis,
  BarChart, Bar, Legend
} from 'recharts';

// ─── 15 Simple Beginner-Friendly JavaScript Presets ──────────────────────────
const PRESETS = [
  { label: 'Hello World Program', prompt: 'Write a simple JavaScript program that prints "Hello, World!" to the console.' },
  { label: 'Add Two Numbers', prompt: 'Write a JavaScript function that takes two numbers as parameters and returns their sum.' },
  { label: 'Check Even or Odd Number', prompt: 'Write a JavaScript function to check if a given number is even or odd.' },
  { label: 'Find Largest Number', prompt: 'Write a JavaScript function to find the largest of three numbers.' },
  { label: 'Reverse a String', prompt: 'Write a JavaScript function that takes a string and returns it reversed.' },
  { label: 'Count Characters in a String', prompt: 'Write a JavaScript function to count the number of characters in a string.' },
  { label: 'Check Palindrome', prompt: 'Write a JavaScript function to check if a string is a palindrome.' },
  { label: 'Calculate Factorial', prompt: 'Write a JavaScript program to calculate the factorial of a given positive integer.' },
  { label: 'Generate Fibonacci Series', prompt: 'Write a JavaScript function to generate the first N numbers in the Fibonacci series.' },
  { label: 'Find Array Sum', prompt: 'Write a JavaScript function that calculates the sum of all numbers in an array.' },
  { label: 'Find Maximum Value in Array', prompt: 'Write a JavaScript function to find the maximum number in an array.' },
  { label: 'Sort an Array', prompt: 'Write a JavaScript program to sort an array of numbers in ascending order.' },
  { label: 'Basic Object Manipulation', prompt: 'Write a JavaScript snippet that creates a student object with properties (name, age, grade) and updates the grade.' },
  { label: 'Basic Function Creation', prompt: 'Write a JavaScript function called greetUser that accepts a name string and returns a greeting message.' },
];

export default function PlaygroundPage() {
  const [activeNav, setActiveNav] = useState('Run Benchmark');

  // Dynamic Available Models State
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  // Selected Models IDs
  const [selectedModelIds, setSelectedModelIds] = useState(['groq/llama-3.3-70b-versatile', 'groq/llama-3.1-8b-instant']);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Prompt State
  const [promptText, setPromptText] = useState('Write a simple JavaScript program that prints "Hello, World!" to the console.');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI coding assistant. Provide clean, correct JavaScript code with simple explanations.');
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  
  // Modal Visibility States
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = () => {
    window.print();
  };

  // Fetch Available Models Dynamically
  const fetchAvailableModels = async () => {
    setIsModelsLoading(true);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success && data.models) {
        setAvailableModels(data.models);
      }
    } catch (_) {
    } finally {
      setIsModelsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data && data.config?.models?.length) {
          setSelectedModelIds(data.config.models);
        }
      } catch (e) {}
    })();
    fetchAvailableModels();
  }, []);

  // Results State: map of modelId -> { text, streaming, metrics, error }
  const [modelOutputs, setModelOutputs] = useState({});

  // Dynamic Run History State
  const [runHistory, setRunHistory] = useState([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [abortControllers, setAbortControllers] = useState({});
  const [copiedModelId, setCopiedModelId] = useState(null);
  const [liveQueue, setLiveQueue] = useState([]);
  const [isMobileModelsOpen, setIsMobileModelsOpen] = useState(false);

  // Live Sandbox Modal
  const [sandboxCode, setSandboxCode] = useState(null);
  const [sandboxActiveTab, setSandboxActiveTab] = useState('preview');
  const [sandboxEditableCode, setSandboxEditableCode] = useState('');

  const isGeminiReady = useMemo(() => availableModels.some(m => m.provider.toLowerCase().includes('gemini') && m.hasKey), [availableModels]);
  const isGroqReady = useMemo(() => availableModels.some(m => m.provider.toLowerCase().includes('groq') && m.hasKey), [availableModels]);
  const isOpenRouterReady = useMemo(() => availableModels.some(m => m.provider.toLowerCase().includes('openrouter') && m.hasKey), [availableModels]);

  // Outside click for model dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle Model Selection
  const toggleModelSelection = (modelId) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSelectAllPlaygroundModels = (e) => {
    e.stopPropagation();
    const availableWithKey = availableModels.filter(m => m.hasKey).map(m => m.id);
    setSelectedModelIds(availableWithKey);
  };

  const handleClearAllPlaygroundModels = (e) => {
    e.stopPropagation();
    setSelectedModelIds([]);
  };

  const handleStopAll = () => {
    Object.values(abortControllers).forEach(controller => controller.abort());
    setIsGenerating(false);
  };

  const handleStopModel = (modelId) => {
    if (abortControllers[modelId]) {
      abortControllers[modelId].abort();
    }
  };

  // Submit Prompt Handler (Streams all selected models concurrently using real APIs)
  const handleRunBenchmark = async (overridePrompt = null) => {
    const activePrompt = overridePrompt || promptText;
    if (!activePrompt.trim() || isGenerating) return;

    setIsGenerating(true);

    const activeModels = availableModels.filter(m => selectedModelIds.includes(m.id));

    // Initialize cross-tab live benchmark status queue
    const initialQueue = activeModels.map(m => ({
      id: m.id,
      model: m.id,
      status: 'running',
      progress: 10,
      taskName: 'Playground Query'
    }));
    setLiveQueue(initialQueue);
    localStorage.setItem('live_benchmark_queue', JSON.stringify(initialQueue));
    const chStart = new BroadcastChannel('live-benchmark-channel');
    chStart.postMessage({ type: 'update', queue: initialQueue });
    chStart.close();

    const controllers = {};
    activeModels.forEach(m => {
      controllers[m.id] = new AbortController();
    });
    setAbortControllers(controllers);

    // Reset outputs for selected models
    setModelOutputs(prev => {
      const next = { ...prev };
      activeModels.forEach(m => {
        next[m.id] = { text: '', streaming: true, metrics: { latency: '...', score: m.score || 90, tokens: 0, cost: m.cost || '$0.002' } };
      });
      return next;
    });

    const runResults = [];

    const saveModelResultToBackend = (res) => {
      try {
        const payload = [{
          model: res.id,
          task: 'Playground Query',
          prompt: res.prompt,
          ttft_ms: res.ttftMs || 0,
          latency_ms: Math.round(res.latencyNum * 1000) || 0,
          tokens: res.tokens || 0,
          speed_tps: res.speed || 0,
          cost: res.costNum || 0,
          success: res.success,
          response_text: res.responseText || '',
          error_message: res.error || null,
          session_id: 'playground-session'
        }];
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: payload })
        }).catch(err => console.error('Failed to save to backend:', err));
      } catch (err) {
        console.error('Error preparing backend payload:', err);
      }
    };

    const streamPromises = activeModels.map(async (modelObj) => {
      const modelId = modelObj.id;
      let fullText = '';
      const startTime = Date.now();

      try {
        const response = await fetch('/api/run-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controllers[modelId].signal,
          body: JSON.stringify({
            model: modelId,
            task: 'JavaScript Program',
            prompt: systemPrompt ? `System: ${systemPrompt}\n\nUser: ${activePrompt}` : activePrompt
          })
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let apiErrorMsg = null;
        let isSuccess = false;
        let apiTtftMs = 0;
        let apiSpeed = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const msg = JSON.parse(line.slice(6));
              
              if (msg.type === 'output') {
                isSuccess = msg.data.success;
                if (msg.data.error) apiErrorMsg = msg.data.error;
                if (msg.data.text) fullText = msg.data.text;
                if (msg.data.ttftMs) apiTtftMs = msg.data.ttftMs;
                if (msg.data.speed) apiSpeed = msg.data.speed;

                const elapsedSec = (msg.data.durationMs / 1000).toFixed(2) + 's';
                setModelOutputs(prev => ({
                  ...prev,
                  [modelId]: {
                    text: fullText,
                    streaming: false,
                    error: apiErrorMsg,
                    metrics: { latency: isSuccess ? elapsedSec : 'Failed', score: isSuccess ? (modelObj.score || 90) : 0, tokens: msg.data.tokens || 0, cost: modelObj.cost || '$0.002' }
                  }
                }));
              } else if (msg.type === 'log' && msg.text) {
                const chunk = msg.text;
                if (chunk.includes('[CONFIG ERROR]') || chunk.includes('[API ERROR]')) {
                  apiErrorMsg = chunk.trim();
                } else if (!chunk.startsWith('[')) {
                  fullText += chunk;
                  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
                  const tokenEst = Math.max(5, Math.round(fullText.length / 4));
                  const estProgress = Math.min(90, 15 + Math.round(fullText.length / 12));

                  try {
                    const q = JSON.parse(localStorage.getItem('live_benchmark_queue') || '[]');
                    const idx = q.findIndex(item => item.id === modelId);
                    if (idx !== -1) {
                      q[idx].progress = estProgress;
                      localStorage.setItem('live_benchmark_queue', JSON.stringify(q));
                      const ch = new BroadcastChannel('live-benchmark-channel');
                      ch.postMessage({ type: 'update', queue: q });
                      ch.close();
                    }
                  } catch (_) {}
                  setLiveQueue(prev => prev.map(item => item.id === modelId ? { ...item, progress: estProgress } : item));

                  setModelOutputs(prev => ({
                    ...prev,
                    [modelId]: {
                      text: fullText,
                      streaming: true,
                      metrics: { latency: elapsedSec, score: modelObj.score || 90, tokens: tokenEst, cost: modelObj.cost || '$0.002' }
                    }
                  }));
                }
              }
            } catch (_) { }
          }
        }

        const totalLatencySec = ((Date.now() - startTime) / 1000).toFixed(2);
        const finalTokens = Math.max(5, Math.round(fullText.length / 4));

        const resultObj = {
          id: modelId,
          name: modelObj.name,
          provider: modelObj.provider,
          latency: `${totalLatencySec}s`,
          latencyNum: parseFloat(totalLatencySec),
          score: isSuccess ? (modelObj.score || 90) : 0,
          tokens: finalTokens,
          cost: modelObj.cost || '$0.002',
          costNum: parseFloat((modelObj.cost || '$0.002').replace('$', '')) || 0.002,
          success: isSuccess && !apiErrorMsg,
          // Extra backend metrics
          prompt: systemPrompt ? `System: ${systemPrompt}\n\nUser: ${activePrompt}` : activePrompt,
          ttftMs: apiTtftMs,
          speed: apiSpeed,
          responseText: fullText,
          error: apiErrorMsg
        };
        runResults.push(resultObj);
        saveModelResultToBackend(resultObj);

        // Update live queue to complete
        try {
          const q = JSON.parse(localStorage.getItem('live_benchmark_queue') || '[]');
          const idx = q.findIndex(item => item.id === modelId);
          if (idx !== -1) {
            q[idx].status = resultObj.success ? 'completed' : 'failed';
            q[idx].progress = 100;
            localStorage.setItem('live_benchmark_queue', JSON.stringify(q));
            const ch = new BroadcastChannel('live-benchmark-channel');
            ch.postMessage({ type: 'update', queue: q });
            ch.close();
          }
        } catch (_) {}
        setLiveQueue(prev => prev.map(item => item.id === modelId ? { ...item, status: resultObj.success ? 'completed' : 'failed', progress: 100 } : item));

      } catch (err) {
        let isAbort = err.name === 'AbortError';
        let errorMsg = isAbort ? 'Cancelled by user.' : (err.message || 'API request failed.');

        const errorResultObj = {
          id: modelId,
          name: modelObj.name,
          provider: modelObj.provider,
          latency: '0.0s',
          latencyNum: 0,
          score: 0,
          tokens: 0,
          cost: '$0.000',
          costNum: 0,
          success: false,
          prompt: systemPrompt ? `System: ${systemPrompt}\n\nUser: ${activePrompt}` : activePrompt,
          ttftMs: 0,
          speed: 0,
          responseText: fullText || (isAbort ? '' : 'Error: ' + errorMsg),
          error: isAbort ? null : errorMsg
        };
        runResults.push(errorResultObj);
        if (!isAbort) {
          saveModelResultToBackend(errorResultObj);
        }

        setModelOutputs(prev => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            text: fullText || (isAbort ? '' : 'Error: ' + errorMsg),
            streaming: false,
            error: isAbort ? null : errorMsg,
            metrics: { ...(prev[modelId]?.metrics || {}), latency: isAbort ? 'Stopped' : 'Failed' }
          }
        }));

        // Update live queue to failed
        try {
          const q = JSON.parse(localStorage.getItem('live_benchmark_queue') || '[]');
          const idx = q.findIndex(item => item.id === modelId);
          if (idx !== -1) {
            q[idx].status = isAbort ? 'stopped' : 'failed';
            q[idx].progress = 100;
            localStorage.setItem('live_benchmark_queue', JSON.stringify(q));
            const ch = new BroadcastChannel('live-benchmark-channel');
            ch.postMessage({ type: 'update', queue: q });
            ch.close();
          }
        } catch (_) {}
        setLiveQueue(prev => prev.map(item => item.id === modelId ? { ...item, status: isAbort ? 'stopped' : 'failed', progress: 100 } : item));
      }
    });

    await Promise.allSettled(streamPromises);
    setIsGenerating(false);
    setAbortControllers({});

    // Wait 3 seconds, then clear the live status queue
    setTimeout(() => {
      localStorage.removeItem('live_benchmark_queue');
      const ch = new BroadcastChannel('live-benchmark-channel');
      ch.postMessage({ type: 'clear' });
      ch.close();
      setLiveQueue([]);
    }, 3000);

    // Save run record to dynamic history
    if (runResults.length > 0) {
      const newHistoryRecord = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        prompt: activePrompt,
        modelsCount: runResults.length,
        results: runResults
      };
      setRunHistory(prev => [newHistoryRecord, ...prev]);


    }
  };

  // Dynamic Calculated Benchmark Statistics
  const dynamicSummaryStats = useMemo(() => {
    const totalRuns = runHistory.length;
    let totalTokensAcc = 0;
    let totalCostAcc = 0;
    let totalLatencyAcc = 0;
    let totalScoreAcc = 0;
    let countAcc = 0;
    let successCount = 0;
    let failureCount = 0;

    let bestModelObj = availableModels[0] || { name: 'None Selected', score: 0, provider: 'N/A' };
    let topScore = -1;

    runHistory.forEach(run => {
      run.results.forEach(res => {
        if (res.success) {
          successCount++;
          totalTokensAcc += res.tokens || 0;
          totalCostAcc += res.costNum || 0.002;
          totalLatencyAcc += res.latencyNum || 1.0;
          totalScoreAcc += res.score || 90;
          countAcc++;

          if (res.score > topScore) {
            topScore = res.score;
            const found = availableModels.find(m => m.id === res.id);
            if (found) bestModelObj = found;
          }
        } else {
          failureCount++;
        }
      });
    });

    const avgLatency = countAcc > 0 ? (totalLatencyAcc / countAcc).toFixed(2) + 's' : '0.00s';
    const avgScore = countAcc > 0 ? (totalScoreAcc / countAcc).toFixed(1) : '0.0';

    return {
      totalRuns,
      modelsTestedCount: selectedModelIds.length,
      avgLatency,
      avgScore,
      totalTokens: totalTokensAcc.toLocaleString(),
      totalCost: `$${totalCostAcc.toFixed(3)}`,
      bestModel: bestModelObj,
      successCount,
      failureCount
    };
  }, [runHistory, selectedModelIds, availableModels]);

  // Check if any response has been received from the API
  const hasApiResponse = useMemo(() => {
    if (runHistory.length > 0) return true;
    return Object.values(modelOutputs).some(
      out => (out.text && out.text.trim().length > 0) || out.error || (!out.streaming && out.metrics?.latency !== '...')
    );
  }, [runHistory, modelOutputs]);

  // Copy Clipboard Handler
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedModelId(id);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  // Helper to extract clean JS/HTML code from markdown text or code blocks
  const extractExecutableCode = (rawText) => {
    if (!rawText) return '';

    // Match code blocks and capture their language identifier
    const codeBlockRegex = /```([a-zA-Z0-9_+#-]*)[ \t]*\n?([\s\S]*?)```/gi;
    const matches = [...rawText.matchAll(codeBlockRegex)];
    if (matches.length > 0) {
      // If there's an HTML or CSS block, we treat this as a UI response
      const isUiComponent = matches.some(m => {
        const l = (m[1] || '').toLowerCase();
        return l === 'html' || l === 'css' || l === 'style';
      });
      
      if (isUiComponent) {
        return matches.map(m => {
          const lang = (m[1] || '').toLowerCase();
          const code = m[2].trim();
          if (lang === 'css' || lang === 'style') {
            return `<style>\n${code}\n</style>`;
          } else if (lang === 'javascript' || lang === 'js') {
            return `<script>\n${code}\n</script>`;
          }
          return code;
        }).join('\n\n');
      } else {
        // Otherwise just return the raw code blocks joined together (e.g. pure JS execution)
        return matches.map(m => m[2].trim()).join('\n\n');
      }
    }

    // Fallback: strip leading ```language and trailing ```
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z0-9_+#-]*[ \t]*\n?/, '').replace(/```$/, '').trim();
    }
    return cleaned;
  };

  // Live Sandbox Runner Opener
  const handleRunCode = (code, language = 'javascript', title = 'JavaScript Program') => {
    const cleanCode = extractExecutableCode(code);
    setSandboxCode({ rawCode: code, code: cleanCode, language, title });
    setSandboxEditableCode(cleanCode);
    setSandboxActiveTab('preview');
  };

  // Helper to render markdown text segment safely
  const renderFormattedText = (text) => {
    if (!text) return null;

    // Inline formatter helper
    const formatLineContent = (str) => {
      return str.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold" style={{ color: 'var(--foreground)' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} className="px-1 py-0.5 rounded font-mono text-[11px] border" style={{ background: 'oklch(0.26 0.028 275 / 50%)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="font-semibold text-xs mt-2 mb-1 uppercase tracking-wider num" style={{ color: 'var(--primary-glow)' }}>{formatLineContent(trimmed.slice(4))}</h4>;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return <h3 key={idx} className="font-semibold text-sm mt-2 mb-1 pb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)', borderBottom: '1px solid var(--border)' }}>{formatLineContent(trimmed.replace(/^#+\s*/, ''))}</h3>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <h4 key={idx} className="font-semibold text-xs mt-2 mb-0.5 num" style={{ color: 'var(--accent)' }}>{formatLineContent(trimmed.slice(2, -2))}</h4>;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 pl-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span className="font-bold" style={{ color: 'var(--primary-glow)' }}>•</span>
            <span>{formatLineContent(trimmed.slice(2))}</span>
          </div>
        );
      }

      return <p key={idx} className="my-1 text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{formatLineContent(line)}</p>;
    });
  };

  // Code Language Detector
  const detectCodeLanguage = (codeStr) => {
    if (!codeStr) return 'javascript';
    const lower = codeStr.toLowerCase();
    if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<div')) return 'html';
    return 'javascript';
  };

  // Helper to parse response content into formatted text & code block segments
  const parseResponseContent = (text) => {
    if (!text) return [];
    let normalizedText = text.replace(/\r\n/g, '\n');

    const fenceCount = (normalizedText.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) {
      normalizedText += '\n```';
    }

    const regex = /```([a-zA-Z0-9_+#-]*)[ \t]*\n?([\s\S]*?)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(normalizedText)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = normalizedText.slice(lastIndex, match.index).trim();
        if (textChunk) {
          segments.push({ type: 'text', content: textChunk });
        }
      }
      const lang = match[1] ? match[1].trim() : detectCodeLanguage(match[2]);
      const codeContent = match[2].trim();
      if (codeContent) {
        segments.push({
          type: 'code',
          language: lang || detectCodeLanguage(codeContent),
          code: codeContent
        });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < normalizedText.length) {
      const textChunk = normalizedText.slice(lastIndex).trim();
      if (textChunk) {
        segments.push({ type: 'text', content: textChunk });
      }
    }

    return segments;
  };

  // Enhanced Terminal Sandbox Iframe Renderer (Base64 UTF-8 Encoded for Bulletproof Execution)
  const renderSandboxIframe = (code) => {
    let base64Code = '';
    try {
      const utf8Bytes = new TextEncoder().encode(code || '');
      let binaryStr = '';
      utf8Bytes.forEach(b => { binaryStr += String.fromCharCode(b); });
      base64Code = btoa(binaryStr);
    } catch (_) {
      try {
        base64Code = btoa(unescape(encodeURIComponent(code || '')));
      } catch (e) {}
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            background: #0f172a;
            color: #f8fafc;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            padding: 16px;
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .terminal-container {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          }
          .terminal-header {
            background: #0f172a;
            padding: 12px 16px;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .terminal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #10b981;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .terminal-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          .dot-red { background: #ef4444; }
          .dot-yellow { background: #f59e0b; }
          .dot-green { background: #10b981; }
          #out {
            padding: 16px;
            min-height: 240px;
            max-height: 520px;
            overflow-y: auto;
          }
          #html-preview {
            background: #ffffff;
            color: #0f172a;
            padding: 16px;
            border-radius: 12px;
            margin-top: 8px;
            border: 1px solid #cbd5e1;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .log-line {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 6px 10px;
            border-radius: 8px;
            margin-bottom: 6px;
            word-break: break-word;
            font-weight: 600;
            font-size: 12px;
          }
          .log-time { color: #64748b; font-size: 11px; flex-shrink: 0; user-select: none; font-family: monospace; }
          .log-info { background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; color: #93c5fd; }
          .log-success { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; color: #6ee7b7; }
          .log-warn { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; color: #fde047; }
          .log-error { background: rgba(239, 68, 68, 0.15); border-left: 3px solid #ef4444; color: #fca5a5; }
          .log-return { background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; color: #d8b4fe; }
          .type-number { color: #f472b6; font-weight: bold; }
          .type-string { color: #34d399; font-weight: bold; }
          .type-boolean { color: #60a5fa; font-weight: bold; }
          .type-null { color: #94a3b8; font-style: italic; }
          pre.code-obj { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 12px; color: #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="terminal-container">
          <div class="terminal-header">
            <div class="terminal-title">
              <span class="terminal-dot dot-red"></span>
              <span class="terminal-dot dot-yellow"></span>
              <span class="terminal-dot dot-green"></span>
              <span style="margin-left: 6px;">⚡ Terminal Output Console</span>
            </div>
            <div id="status-badge" style="font-size:11px; font-weight:700; color:#94a3b8;">Executing...</div>
          </div>
          <div id="out"></div>
        </div>
        <script>
          const out = document.getElementById('out');
          const badge = document.getElementById('status-badge');
          const startTime = performance.now();

          function getTime() {
            const d = new Date();
            return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
          }

          function appendLine(type, message, isHtml = false) {
            const div = document.createElement('div');
            div.className = 'log-line log-' + type;
            const timeSpan = document.createElement('span');
            timeSpan.className = 'log-time';
            timeSpan.textContent = '[' + getTime() + ']';
            const msgSpan = document.createElement('span');
            msgSpan.style.flex = '1';
            if (isHtml) msgSpan.innerHTML = message;
            else msgSpan.textContent = message;
            div.appendChild(timeSpan);
            div.appendChild(msgSpan);
            out.appendChild(div);
            out.scrollTop = out.scrollHeight;
          }

          function formatArg(arg) {
            if (arg === null) return '<span class="type-null">null</span>';
            if (arg === undefined) return '<span class="type-null">undefined</span>';
            if (typeof arg === 'number') return '<span class="type-number">' + arg + '</span>';
            if (typeof arg === 'boolean') return '<span class="type-boolean">' + String(arg) + '</span>';
            if (typeof arg === 'string') return '<span class="type-string">"' + arg.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + '"</span>';
            if (typeof arg === 'function') return '<span class="type-null">f ' + (arg.name || 'anonymous') + '()</span>';
            try {
              return '<pre class="code-obj">' + JSON.stringify(arg, null, 2).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + '</pre>';
            } catch (e) {
              return String(arg);
            }
          }

          const origLog = console.log;
          const origError = console.error;
          const origWarn = console.warn;
          const origInfo = console.info;

          console.log = function(...args) {
            origLog.apply(console, args);
            appendLine('info', args.map(formatArg).join(' '), true);
          };

          console.error = function(...args) {
            origError.apply(console, args);
            appendLine('error', args.map(a => typeof a === 'object' ? formatArg(a) : String(a)).join(' '), true);
          };

          console.warn = function(...args) {
            origWarn.apply(console, args);
            appendLine('warn', args.map(formatArg).join(' '), true);
          };

          console.info = function(...args) {
            origInfo.apply(console, args);
            appendLine('info', args.map(formatArg).join(' '), true);
          };

          window.onerror = function(msg, url, line, col, err) {
            let errStr = 'Runtime Error: ' + msg + (line ? ' (Line ' + line + ')' : '');
            
            const isNodeError = msg.includes('require is not defined') || 
                                msg.includes('process is not defined') || 
                                msg.includes('module is not defined');
                                
            if (isNodeError) {
              errStr += '<br><br><span style="color:#fde047">⚠️ <b>Environment Mismatch:</b> This sandbox runs in a browser environment, but the AI generated Node.js code. Node.js features like <code>require()</code> or <code>process</code> are not available here.</span>';
              appendLine('error', errStr, true);
            } else {
              appendLine('error', errStr);
            }
            
            badge.textContent = '🔴 Failed';
            badge.style.color = '#ef4444';
            return true;
          };

          window.onunhandledrejection = function(e) {
            appendLine('error', 'Unhandled Promise Rejection: ' + (e.reason?.message || e.reason));
            badge.textContent = '🔴 Failed';
            badge.style.color = '#ef4444';
          };

          try {
            const rawBase64 = "${base64Code}";
            let codeToExec = "";
            try {
              const binaryStr = atob(rawBase64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              codeToExec = new TextDecoder().decode(bytes);
            } catch (e) {
              codeToExec = decodeURIComponent(escape(atob(rawBase64)));
            }

            if (!codeToExec || !codeToExec.trim()) {
              appendLine('warn', '⚠️ No code found to execute. Switch to the "Source Code" tab to write or edit code.');
              const elapsed = (performance.now() - startTime).toFixed(1);
              badge.textContent = '🟡 Empty Code (' + elapsed + 'ms)';
              badge.style.color = '#f59e0b';
            } else {
              // Remove leading language tag if present
              codeToExec = codeToExec.replace(/^(?:html|javascript|js|css|json|ts|typescript|xml)\\s*\\n?/i, '').trim();

              const isHtmlCode = /^\\s*<([a-z]+|!DOCTYPE|!--|\\?xml)/i.test(codeToExec);

              if (isHtmlCode) {
                appendLine('info', 'ℹ️ Rendered HTML Preview:');
                const previewDiv = document.createElement('div');
                previewDiv.id = 'html-preview';
                previewDiv.innerHTML = codeToExec;
                out.appendChild(previewDiv);

                // innerHTML does not execute <script> tags by default. Manually execute them.
                const scripts = previewDiv.querySelectorAll('script');
                scripts.forEach(s => {
                  if (s.textContent) {
                    const newScript = document.createElement('script');
                    newScript.textContent = s.textContent;
                    out.appendChild(newScript);
                  }
                });

                // Since we injected the HTML dynamically after the real page load, 
                // any scripts waiting for DOMContentLoaded or load events will be stuck. 
                // We manually dispatch them here to trigger initialization logic.
                setTimeout(() => {
                  document.dispatchEvent(new Event('DOMContentLoaded'));
                  window.dispatchEvent(new Event('load'));
                }, 10);

                const elapsed = (performance.now() - startTime).toFixed(1);
                badge.textContent = '🟢 HTML Rendered (' + elapsed + 'ms)';
                badge.style.color = '#10b981';
              } else {
                // Strip ES Module import/export statements for standard browser execution
                codeToExec = codeToExec
                  .replace(/^import\\s+[\\s\\S]*?from\\s+['"].*?['"];?/gm, '')
                  .replace(/^import\\s+['"].*?['"];?/gm, '')
                  .replace(/^export\\s+default\\s+/gm, '')
                  .replace(/^export\\s+\\{[^}]*\\};?/gm, '')
                  .replace(/^export\\s+(const|let|var|function|class)/gm, '$1');

                const result = eval(codeToExec);
                const elapsed = (performance.now() - startTime).toFixed(1);
                
                if (result !== undefined) {
                  appendLine('return', 'Return Value: ' + formatArg(result), true);
                }

                // If no console output was generated, check for declared functions and auto-invoke them with sample args
                if (out.children.length === 0) {
                  const fnMatches = [...codeToExec.matchAll(/(?:function\\s+([a-zA-Z0-9_$]+)|const\\s+([a-zA-Z0-9_$]+)\\s*=\\s*(?:\\([^)]*\\)|[a-zA-Z0-9_$]+)\\s*=>)/g)];
                  const fnNames = fnMatches.map(m => m[1] || m[2]).filter(Boolean);

                  let invokedAny = false;
                  fnNames.forEach(fnName => {
                    try {
                      const fnObj = eval(fnName);
                      if (typeof fnObj === 'function') {
                        invokedAny = true;
                        const sampleArgs = [5, 3, "Hello World", [10, 20, 30], { key: "value" }];
                        const argsToPass = sampleArgs.slice(0, Math.max(1, fnObj.length));
                        const res = fnObj(...argsToPass);
                        appendLine('info', '▶ Auto-executed function: <strong>' + fnName + '(' + argsToPass.map(a => JSON.stringify(a)).join(', ') + ')</strong>', true);
                        if (res !== undefined) {
                          appendLine('return', 'Output: ' + formatArg(res), true);
                        }
                      }
                    } catch (_) {}
                  });

                  if (!invokedAny) {
                    appendLine('success', 'Program executed successfully with no console logs.');
                  }
                }

                badge.textContent = '🟢 Success (' + elapsed + 'ms)';
                badge.style.color = '#10b981';
              }
            }

          } catch (e) {
            const elapsed = (performance.now() - startTime).toFixed(1);
            appendLine('error', 'Runtime Error: ' + e.message);
            badge.textContent = '🔴 Error (' + elapsed + 'ms)';
            badge.style.color = '#ef4444';
          }
        </script>
      </body>
      </html>
    `;
  };

  const activeModelsList = availableModels.filter(m => selectedModelIds.includes(m.id) && m.hasKey);

  const performanceChartData = useMemo(() => {
    const data = [];
    activeModelsList.forEach((model, index) => {
      const output = modelOutputs[model.id];
      if (output && output.metrics && output.metrics.latency !== '...' && output.metrics.latency !== 'Failed' && output.metrics.latency !== 'Stopped') {
        const latencySec = parseFloat(output.metrics.latency);
        const tokens = parseInt(output.metrics.tokens, 10) || 0;
        const speed = latencySec > 0 ? Math.round(tokens / latencySec) : 0;
        
        let cost = 0;
        if (typeof output.metrics.cost === 'string') {
          cost = parseFloat(output.metrics.cost.replace('$', '')) || 0;
        } else if (typeof output.metrics.cost === 'number') {
          cost = output.metrics.cost;
        }

        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];

        data.push({
          id: model.id,
          name: model.name,
          provider: model.provider,
          speed,
          cost,
          latency: latencySec,
          tokens,
          fill: colors[index % colors.length]
        });
      }
    });
    return data;
  }, [activeModelsList, modelOutputs]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-slate-900 mb-1">{data.provider} - {data.name}</p>
          <p className="text-emerald-600 font-semibold">Speed: {data.speed} tokens/sec</p>
          <p className="text-rose-600 font-semibold">Cost: ${data.cost.toFixed(4)}</p>
          <p className="text-slate-500 mt-1">Latency: {data.latency}s | Tokens: {data.tokens}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen font-sans transition-colors duration-200 print:block print:bg-white print:min-h-0" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ─── 1. LEFT SIDEBAR NAVIGATION ───────────────────────────────────── */}
      <aside className="w-full lg:w-64 flex flex-col justify-between flex-shrink-0 print:hidden lg:h-screen lg:sticky lg:top-0 overflow-hidden" style={{ borderRight: '1px solid var(--sidebar-border)', background: 'var(--sidebar)' }}>
        
        <div className="p-5 flex-1 flex flex-col min-h-0 space-y-4">
          {/* Logo Branding */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold transition-transform group-hover:scale-105" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>AI Benchmark</h1>
              <span className="num text-[8px] uppercase tracking-[0.2em] block" style={{ color: 'var(--muted-foreground)' }}>Analyzer Studio</span>
            </div>
          </Link>

          {/* Back to Dashboard Button */}
          <nav className="shrink-0 text-xs font-bold">
            <Link
              href="/"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
              style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'oklch(0.26 0.028 275 / 50%)'}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--primary-glow)' }} />
              <span className="num text-[11px] uppercase tracking-wider">Back to Dashboard</span>
            </Link>
          </nav>

          {/* Divider */}
          <div className="h-[1px] shrink-0" style={{ background: 'var(--sidebar-border)' }} />

          {/* Model Selection Checklist (Fills Space) */}
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0" style={{ fontSize: '10px' }}>
              <span>Select Models</span>
              <span className="num text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'oklch(0.26 0.028 275 / 50%)', border: '1px solid var(--border)' }}>
                {selectedModelIds.length} Selected
              </span>
            </div>

            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearchQuery}
                onChange={e => setModelSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none"
                style={{ border: '1px solid var(--border)', background: 'oklch(0.20 0.015 275)', color: 'var(--foreground)' }}
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSelectAllPlaygroundModels}
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
                style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'oklch(0.26 0.028 275 / 30%)'}
              >
                Select All
              </button>
              <button
                onClick={handleClearAllPlaygroundModels}
                className="flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
                style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'oklch(0.26 0.028 275 / 30%)'}
              >
                Clear All
              </button>
            </div>

            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 border border-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {isModelsLoading ? (
                Array(6).fill(0).map((_, idx) => (
                  <div key={idx} className="p-2 rounded-xl text-xs flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2 truncate flex-1">
                      <div className="w-4 h-4 rounded-full bg-zinc-800 shrink-0 animate-pulse" />
                      <div className="h-3 bg-zinc-800 rounded-md w-28 animate-pulse" />
                    </div>
                    <div className="w-3.5 h-3.5 rounded bg-zinc-800 shrink-0 animate-pulse" />
                  </div>
                ))
              ) : (
                availableModels.filter(m => m.hasKey && (m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()))).map(m => {
                  const isSelected = selectedModelIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleModelSelection(m.id)}
                      className="p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition select-none"
                      style={isSelected ? { background: 'oklch(0.75 0.17 155 / 8%)', border: '1px solid oklch(0.75 0.17 155 / 25%)', color: 'var(--success)' } : { background: 'transparent', border: '1px solid transparent', color: 'var(--muted-foreground)' }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0">{m.icon}</span>
                        <span className="truncate font-semibold text-[11px]" style={{ color: isSelected ? 'var(--success)' : 'var(--foreground)' }}>{m.name.split('/').pop()}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-3.5 h-3.5 rounded-lg border-2 accent-emerald-500 shrink-0"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>



        </div>

        {/* Bottom System Status */}
        <div className="p-4 space-y-3 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span style={{ color: 'var(--muted-foreground)' }}>API System</span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--success)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} /> Connected
            </span>
          </div>
        </div>

      </aside>

      {/* ─── 2. MAIN WORKSPACE CONTAINER ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto print:hidden">

        {/* Clean Header */}
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md" style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}>
          
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
            <span className="text-xs font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--muted-foreground)' }}>Active Workspace</span>
            
            {/* Selected Active Model Badges */}
            <div 
              className="flex items-center gap-1.5 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {activeModelsList.map(m => (
                <span
                  key={m.id}
                  title={`${m.provider} - ${m.name}`}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 shrink-0 max-w-[180px]"
                  style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                >
                  <span className="shrink-0">{m.icon}</span>
                  <span className="truncate">{m.provider} - {m.name}</span>
                  <button onClick={() => toggleModelSelection(m.id)} className="hover:text-foreground shrink-0 cursor-pointer pointer-events-auto" style={{ color: 'var(--muted-foreground)' }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Clean Action Buttons (No Profile Badge) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileModelsOpen(true)}
              className="md:hidden px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
              style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
            >
              <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Models
            </button>

            <button
              onClick={() => setIsPromptLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
              style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
            >
              <Bookmark className="w-3.5 h-3.5" style={{ color: 'var(--primary-glow)' }} /> <span className="num">15</span> Presets
            </button>
          </div>

        </header>

        {/* Workspace Content Padding */}
        <div className="p-6 space-y-6 max-w-[1400px] w-full mx-auto">

          {/* ─── 3. PROMPT INPUT CARD ────────────────────────────────────────── */}
          <section className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                Enter your JavaScript query
              </h2>
              <span className="text-[10px] font-mono" style={{ color: 'var(--muted-foreground)' }}>Executing <span className="num">{selectedModelIds.length}</span> API models</span>
            </div>

            <div className="relative rounded-2xl p-3 focus-within:border-foreground transition-all" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleRunBenchmark();
                  }
                }}
                placeholder="Type a JavaScript program request (e.g. Write a JavaScript function to reverse a string)..."
                className="w-full bg-transparent border-none text-sm focus:outline-none resize-none min-h-[120px] sm:min-h-[80px] font-sans"
                style={{ color: 'var(--foreground)' }}
                rows={4}
              />

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsSystemPromptOpen(!isSystemPromptOpen)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 sm:flex-none"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                  >
                    <Sliders className="w-3.5 h-3.5" style={{ color: 'var(--primary-glow)' }} /> System Persona
                  </button>

                  <button
                    onClick={() => setIsPromptLibraryOpen(true)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 sm:flex-none"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                  >
                    <Bookmark className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> JS Presets
                  </button>
                </div>

                <button
                  onClick={isGenerating ? handleStopAll : () => handleRunBenchmark()}
                  disabled={!isGenerating && !promptText.trim()}
                  className="px-6 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer w-full sm:w-auto"
                  style={
                    isGenerating
                      ? { background: 'var(--destructive)', color: 'var(--destructive-foreground)', boxShadow: '0 0 12px var(--destructive)' }
                      : !promptText.trim()
                        ? { background: 'oklch(1 0 0 / 8%)', color: 'var(--muted-foreground)', cursor: 'not-allowed' }
                        : { backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-glow)' }
                  }
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Calling APIs... <span className="mx-1 opacity-50">|</span> <XCircle className="w-4 h-4 ml-1" /> Stop All
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Run Benchmark <span className="text-[10px] opacity-75 font-mono hidden sm:inline">Ctrl + Enter</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expandable System Instructions Editor */}
              {isSystemPromptOpen && (
                <div className="mt-3 pt-3 animate-fade-in space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--muted-foreground)' }}>System Persona Prompt</label>
                  <textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs focus:outline-none font-mono"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 20%)', color: 'var(--foreground)' }}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Live Benchmark Status Panel */}
          <div id="live-status-section" className="panel p-5 space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Live Benchmark Status</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Running', value: liveQueue.filter(q => q.status === 'running').length, color: 'var(--accent)' },
                { label: 'Completed', value: liveQueue.filter(q => q.status === 'completed').length, color: 'var(--success)' },
                { label: 'Failed', value: liveQueue.filter(q => q.status === 'failed' || q.status === 'stopped').length, color: 'var(--destructive)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-3" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 40%)' }}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </div>
                  <p className="num mt-2 text-xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            {liveQueue.length === 0 ? (
              <p className="rounded-xl py-5 text-center text-xs" style={{ border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}>
                No active benchmark runs in queue.
              </p>
            ) : (
              <div className="space-y-2 text-xs font-semibold max-h-32 overflow-y-auto pr-1">
                {liveQueue.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: 'var(--foreground)' }}>{item.model.split('/').pop()}</span>
                      <span className="capitalize" style={{ color: 'var(--muted-foreground)' }}>{item.status} {item.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${item.progress || 0}%`, backgroundImage: 'var(--gradient-primary)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── 4. MODEL OUTPUT GRID (STRICT REAL API RESPONSES) ────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeModelsList.map(model => {
              const output = modelOutputs[model.id] || { text: '', streaming: false, metrics: { latency: '...', score: 0, tokens: 0, cost: model.cost } };
              const parsedSegments = parseResponseContent(output.text);

              return (
                <div
                  key={model.id}
                  className="panel flex flex-col justify-between transition-all duration-300 relative hover:-translate-y-1 p-5"
                >
                  
                  {/* Model Output Header */}
                  <div>
                    <div className="flex items-center justify-between pb-3.5 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-sm font-bold" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)' }}>
                          {model.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>{model.provider} - {model.name}</h3>
                          </div>
                          <span className="text-[11px] font-medium" style={{ color: 'var(--muted-foreground)' }}>Real API Stream</span>
                        </div>
                      </div>

                      {/* Performance Metrics Pills */}
                      <div className="flex items-center gap-3 text-xs font-mono">
                        {output.streaming && (
                          <button
                            onClick={() => handleStopModel(model.id)}
                            className="px-2 py-1 text-[10px] font-bold text-red-400 bg-red-950/40 hover:bg-red-950/60 rounded-lg flex items-center gap-1 transition-colors border border-red-900/40"
                          >
                            <XCircle className="w-3 h-3" /> Stop
                          </button>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] font-bold block" style={{ color: 'var(--muted-foreground)' }}>LATENCY</span>
                          <span className="font-bold num text-xs" style={{ color: 'var(--foreground)' }}>{output.metrics.latency}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] font-bold block" style={{ color: 'var(--muted-foreground)' }}>TOKENS</span>
                          <span className="font-bold num text-xs" style={{ color: 'var(--foreground)' }}>{output.metrics.tokens}</span>
                        </div>
                      </div>
                    </div>

                    {/* Output Text & Code Display Area */}
                    <div className="min-h-[220px] text-xs leading-relaxed max-h-[420px] overflow-y-auto space-y-2 pr-1 font-sans">
                      {output.streaming && !output.text && (
                        <div className="flex flex-col items-center justify-center h-48 space-y-3 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--primary-glow)' }} />
                          <span className="font-semibold text-xs">Streaming response from {model.provider}...</span>
                        </div>
                      )}

                      {!output.streaming && !output.text && !output.error && (
                        <div className="flex flex-col items-center justify-center h-48 space-y-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                          <Code className="w-6 h-6" style={{ color: 'var(--border)' }} />
                          <span className="text-xs">Ready for evaluation. Enter prompt and click Run.</span>
                        </div>
                      )}

                      {/* Real API Key or Execution Error Banner */}
                      {output.error && (
                        <div className="p-4 rounded-2xl text-rose-300 space-y-2" style={{ border: '1px solid oklch(0.65 0.2 350 / 20%)', background: 'oklch(0.65 0.2 350 / 10%)' }}>
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <span>API Configuration Required</span>
                          </div>
                          <p className="text-[11px] leading-relaxed font-mono">{output.error}</p>
                          <p className="text-[10px] font-medium" style={{ color: 'var(--muted-foreground)' }}>Please configure the corresponding API key inside the server's environment variables or local <code>config.json</code> file.</p>
                        </div>
                      )}

                      {parsedSegments.map((seg, idx) => {
                        if (seg.type === 'text') {
                          return (
                            <div key={idx} className="my-2" style={{ color: 'var(--muted-foreground)' }}>
                              {renderFormattedText(seg.content)}
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="my-2.5 rounded-2xl overflow-hidden shadow-sm animate-fade-in" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 20%)' }}>
                            <div className="px-3.5 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide" style={{ background: 'oklch(0.26 0.028 275 / 50%)', borderBottom: '1px solid var(--border)' }}>
                              <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--primary-glow)' }}><Code className="w-3.5 h-3.5" /> {seg.language || 'javascript'}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRunCode(seg.code, seg.language || 'javascript', `${model.name} Snippet`)}
                                  className="font-bold flex items-center gap-1 cursor-pointer transition px-2.5 py-1 rounded-lg border"
                                  style={{ border: '1px solid var(--border)', background: 'oklch(0.75 0.17 155 / 10%)', color: 'var(--success)' }}
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Run Sandbox</span>
                                </button>
                                <button
                                  onClick={() => handleCopy(seg.code, `${model.id}-${idx}`)}
                                  className="font-semibold flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded-lg"
                                  style={{ color: 'var(--muted-foreground)' }}
                                >
                                  {copiedModelId === `${model.id}-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  <span>Copy</span>
                                </button>
                              </div>
                            </div>
                            <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre max-h-72" style={{ background: 'oklch(0.2 0.028 275 / 20%)', color: 'oklch(0.9 0.02 275)' }}>
                              <code>{seg.code}</code>
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Output Footer Action Bar */}
                  <div className="pt-3 mt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      <button
                        onClick={() => handleCopy(output.text, model.id)}
                        className="hover:text-foreground flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedModelId === model.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Response</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </section>

        </div>

      </div>

      {/* ─── 5. RIGHT SIDEBAR BENCHMARK SUMMARY (DYNAMIC DATA) ───────────── */}
      <aside className="w-full lg:w-80 flex flex-col justify-between flex-shrink-0 print:hidden p-5" style={{ borderLeft: '1px solid var(--sidebar-border)', background: 'var(--sidebar)' }}>
        <div className="space-y-6">

          {!hasApiResponse ? (
            <div className="p-5 rounded-3xl text-center space-y-3" style={{ border: '1px dashed var(--border)', background: 'oklch(0.26 0.028 275 / 20%)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto shadow-sm" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)' }}>
                <BarChart3 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-xs" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>API Execution Summary</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  The execution summary and real-time benchmark metrics will be displayed here automatically after receiving a response from the API.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}>
                  <Clock className="w-3 h-3 animate-pulse" style={{ color: 'var(--primary-glow)' }} /> Awaiting API Execution
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Benchmark Summary Header */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary-glow)' }} /> API Execution Summary
                </h3>

                {/* Dynamic Benchmark Metrics Breakdown List */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl flex items-center justify-between" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                    <div>
                      <span className="text-[10px] font-bold uppercase block" style={{ color: 'var(--muted-foreground)' }}>⚡ Avg Latency</span>
                      <span className="font-semibold num" style={{ color: 'var(--foreground)' }}>{dynamicSummaryStats.avgLatency}</span>
                    </div>
                    <span className="font-mono font-bold num" style={{ color: 'var(--success)' }}>{dynamicSummaryStats.avgLatency}</span>
                  </div>

                  <div className="p-3 rounded-xl flex items-center justify-between" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                    <div>
                      <span className="text-[10px] font-bold uppercase block" style={{ color: 'var(--muted-foreground)' }}>📊 API Success / Error</span>
                      <span className="font-semibold num" style={{ color: 'var(--foreground)' }}>{dynamicSummaryStats.successCount} Passed</span>
                    </div>
                    <span className="font-mono font-bold num" style={{ color: dynamicSummaryStats.failureCount > 0 ? 'var(--destructive)' : 'var(--muted-foreground)' }}>{dynamicSummaryStats.failureCount} Errors</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Block */}
              <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                <h4 className="font-semibold text-xs flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: 'var(--primary-glow)' }} /> Real-time Execution Stats
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                    <span>Total Benchmark Runs</span>
                    <span className="font-bold num" style={{ color: 'var(--foreground)' }}>{dynamicSummaryStats.totalRuns}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                    <span>Active Models Tested</span>
                    <span className="font-bold num" style={{ color: 'var(--foreground)' }}>{dynamicSummaryStats.modelsTestedCount}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                    <span>Total Tokens Generated</span>
                    <span className="font-bold num" style={{ color: 'var(--foreground)' }}>{dynamicSummaryStats.totalTokens}</span>
                  </div>
                </div>
                
                {/* View Full Report Button */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full mt-4 py-2 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                >
                  <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span>View Full Report</span>
                </button>
              </div>
            </>
          )}

        </div>
      </aside>

      {/* ─── MOBILE DRAWER: MODEL CONFIG (Only md-hidden) ────────────────── */}
      {isMobileModelsOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 md:hidden flex justify-start animate-fade-in">
          <div className="w-[280px] h-full flex flex-col p-5 animate-slide-in-left" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}>
            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Model Config</span>
              <button onClick={() => setIsMobileModelsOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model Selection Checklist inside mobile drawer */}
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0" style={{ fontSize: '10px' }}>
                <span>Select Models</span>
                <span className="num text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'oklch(0.26 0.028 275 / 50%)', border: '1px solid var(--border)' }}>
                  {selectedModelIds.length} Selected
                </span>
              </div>

              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearchQuery}
                  onChange={e => setModelSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'oklch(0.20 0.015 275)', color: 'var(--foreground)' }}
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleSelectAllPlaygroundModels}
                  className="flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
                  style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAllPlaygroundModels}
                  className="flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
                  style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                >
                  Clear All
                </button>
              </div>

              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 border border-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                {isModelsLoading ? (
                  Array(6).fill(0).map((_, idx) => (
                    <div key={idx} className="p-2 rounded-xl text-xs flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2 truncate flex-1">
                        <div className="w-4 h-4 rounded-full bg-zinc-800 shrink-0 animate-pulse" />
                        <div className="h-3 bg-zinc-800 rounded-md w-28 animate-pulse" />
                      </div>
                      <div className="w-3.5 h-3.5 rounded bg-zinc-800 shrink-0 animate-pulse" />
                    </div>
                  ))
                ) : (
                  availableModels.filter(m => m.hasKey && (m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()))).map(m => {
                    const isSelected = selectedModelIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModelSelection(m.id)}
                        className="p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition select-none"
                        style={isSelected ? { background: 'oklch(0.75 0.17 155 / 8%)', border: '1px solid oklch(0.75 0.17 155 / 25%)', color: 'var(--success)' } : { background: 'transparent', border: '1px solid transparent', color: 'var(--muted-foreground)' }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs shrink-0">{m.icon}</span>
                          <span className="truncate font-semibold text-[11px]" style={{ color: isSelected ? 'var(--success)' : 'var(--foreground)' }}>{m.name.split('/').pop()}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-3.5 h-3.5 rounded-lg border-2 accent-emerald-500 shrink-0"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: 15 SIMPLE JAVASCRIPT PRESETS LIBRARY ────────────────── */}
      {isPromptLibraryOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--elevated)', color: 'var(--foreground)' }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-base flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                <Bookmark className="w-5 h-5" style={{ color: 'var(--primary-glow)' }} /> <span className="num">15</span> Simple JavaScript Presets
              </h3>
              <button onClick={() => setIsPromptLibraryOpen(false)} className="p-1 rounded-lg hover:text-foreground cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptText(preset.prompt);
                    setIsPromptLibraryOpen(false);
                    handleRunBenchmark(preset.prompt);
                  }}
                  className="w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer group hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                >
                  <div>
                    <span className="font-semibold text-xs block" style={{ color: 'var(--foreground)' }}><span className="num">{idx + 1}</span>. {preset.label}</span>
                    <span className="text-[11px] block truncate" style={{ color: 'var(--muted-foreground)' }}>{preset.prompt}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--primary-glow)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: COMPREHENSIVE PERFORMANCE REPORT ────────────────────── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in print:static print:bg-transparent print:p-0 print:block">
          <div className="rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:block" style={{ border: '1px solid var(--border)', background: 'var(--elevated)', color: 'var(--foreground)' }}>
            <div className="flex items-center justify-between p-6 flex-shrink-0 print:hidden" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                <BarChart3 className="w-6 h-6" style={{ color: 'var(--primary-glow)' }} /> Comprehensive Performance Report
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportToPDF}
                  className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-transform hover:-translate-y-px"
                  style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-glow)' }}
                >
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1 rounded-lg hover:text-foreground cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto print:overflow-visible print:p-0">
              <div className="space-y-8 p-4 print:bg-white print:text-slate-900" style={{ background: 'transparent' }} ref={reportRef}>
                
                {/* PDF Header (Only visible in exported PDF but good for preview) */}
                <div className="pb-4 mb-4 print:border-b print:border-slate-200" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="text-2xl font-semibold print:text-slate-900" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>AI Benchmark Analyzer - Performance Report</h2>
                  <p className="text-sm mt-1 print:text-slate-500" style={{ color: 'var(--muted-foreground)' }}>Generated on <span className="num">{new Date().toLocaleString()}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scatter Chart (Speed vs Cost) */}
                  <div className="p-4 rounded-xl print:bg-slate-50 print:border-slate-200" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                    <h4 className="font-semibold text-sm mb-4 print:text-slate-900" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>Speed vs. Cost Tradeoff</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis type="number" dataKey="speed" name="Speed" unit=" t/s" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                          <YAxis type="number" dataKey="cost" name="Cost" unit="$" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                          <ZAxis type="category" dataKey="name" name="Model" />
                          <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                          <Scatter name="Models" data={performanceChartData}>
                            {performanceChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart (Latency) */}
                  <div className="p-4 rounded-xl print:bg-slate-50 print:border-slate-200" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                    <h4 className="font-semibold text-sm mb-4 print:text-slate-900" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>Latency Comparison (Seconds)</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <defs>
                            <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.85}/>
                              <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity={0.15}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 8%)" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} interval={0} tickFormatter={(val) => val.split('/').pop()} angle={-30} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} unit="s" />
                          <RechartsTooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} />
                          <Bar dataKey="latency" name="Latency (s)" radius={[6, 6, 0, 0]} maxBarSize={32} fill="url(#latencyGrad)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Bar Chart (Speed) */}
                <div className="p-4 rounded-xl print:bg-slate-50 print:border-slate-200" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                  <h4 className="font-semibold text-sm mb-4 print:text-slate-900" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>Throughput Comparison (Tokens per Second)</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <defs>
                          <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.85}/>
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.15}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 8%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} interval={0} tickFormatter={(val) => val.split('/').pop()} angle={-30} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} unit=" t/s" />
                        <RechartsTooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} />
                        <Bar dataKey="speed" name="Tokens/sec" radius={[6, 6, 0, 0]} maxBarSize={32} fill="url(#speedGrad)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Data Table */}
                <div className="rounded-xl overflow-hidden print:border-slate-200 print:bg-white" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="print:bg-slate-50 print:border-slate-200 print:text-slate-500 font-bold uppercase tracking-wider text-[11px]" style={{ background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                          <th className="px-4 py-3">Provider</th>
                          <th className="px-4 py-3">Model</th>
                          <th className="px-4 py-3 text-right">Latency</th>
                          <th className="px-4 py-3 text-right">Tokens</th>
                          <th className="px-4 py-3 text-right">Speed (t/s)</th>
                          <th className="px-4 py-3 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {performanceChartData.map((row, idx) => (
                          <tr key={idx} className="print:hover:bg-slate-50" style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-4 py-3 font-semibold print:text-slate-700">{row.provider}</td>
                            <td className="px-4 py-3 font-bold print:text-slate-900" style={{ color: 'var(--foreground)' }}>{row.name}</td>
                            <td className="px-4 py-3 text-right num">{row.latency}s</td>
                            <td className="px-4 py-3 text-right num">{row.tokens}</td>
                            <td className="px-4 py-3 text-right font-bold num" style={{ color: 'var(--success)' }}>{row.speed}</td>
                            <td className="px-4 py-3 text-right font-bold num" style={{ color: 'var(--accent)' }}>${row.cost.toFixed(4)}</td>
                          </tr>
                        ))}
                        {performanceChartData.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No successful runs to display in the report.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─── MODAL: LIVE SANDBOX EXECUTION (BRIGHT THEME) ───────────────── */}
      {sandboxCode && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="rounded-3xl shadow-2xl max-w-5xl w-full h-[82vh] flex flex-col overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--elevated)', color: 'var(--foreground)' }}>
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)' }}>
                  <Play className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm block" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                    Code Runner: {sandboxCode.title}
                  </h3>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--success)' }}>Interactive JavaScript Sandbox</span>
                </div>
              </div>

              {/* Modal Actions & Tabs */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const current = sandboxEditableCode;
                    setSandboxEditableCode('');
                    setTimeout(() => setSandboxEditableCode(current), 50);
                    setSandboxActiveTab('preview');
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm hover:-translate-y-px"
                  style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-glow)' }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Code
                </button>

                <div className="flex items-center gap-1 p-1 rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)' }}>
                  <button
                    onClick={() => setSandboxActiveTab('preview')}
                    className="px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 font-semibold"
                    style={sandboxActiveTab === 'preview' ? { background: 'oklch(0.75 0.17 155 / 15%)', color: 'var(--success)' } : { color: 'var(--muted-foreground)' }}
                  >
                    <Eye className="w-3.5 h-3.5" /> Terminal Output
                  </button>
                  <button
                    onClick={() => setSandboxActiveTab('code')}
                    className="px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 font-semibold"
                    style={sandboxActiveTab === 'code' ? { background: 'oklch(0.75 0.17 155 / 15%)', color: 'var(--success)' } : { color: 'var(--muted-foreground)' }}
                  >
                    <Code className="w-3.5 h-3.5" /> Source Code
                  </button>
                </div>

                {/* Close Button */}
                <button onClick={() => setSandboxCode(null)} className="p-1.5 rounded-xl hover:text-foreground cursor-pointer" style={{ background: 'oklch(0.26 0.028 275 / 50%)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 relative overflow-hidden" style={{ background: 'oklch(0.2 0.028 275 / 50%)' }}>
              {sandboxActiveTab === 'preview' ? (
                <iframe
                  key={sandboxEditableCode}
                  srcDoc={renderSandboxIframe(sandboxEditableCode)}
                  title="Live Sandbox"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-modals allow-forms"
                />
              ) : (
                <div className="p-4 h-full flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span style={{ color: 'var(--muted-foreground)' }}>Language: <strong className="uppercase" style={{ color: 'var(--foreground)' }}>JavaScript</strong></span>
                    <button
                      onClick={() => handleCopy(sandboxEditableCode, 'modal-code')}
                      className="px-3 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer border"
                      style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </button>
                  </div>
                  <textarea
                    value={sandboxEditableCode}
                    onChange={e => setSandboxEditableCode(e.target.value)}
                    className="flex-1 w-full font-mono text-xs p-4 rounded-2xl focus:outline-none resize-none leading-relaxed font-medium"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 30%)', color: 'var(--foreground)' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: API Keys modal removed */}

    </div>
  );
}
