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
  FileText
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
    } catch (_) {}
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

  // Live Sandbox Modal
  const [sandboxCode, setSandboxCode] = useState(null);
  const [sandboxActiveTab, setSandboxActiveTab] = useState('preview');
  const [sandboxEditableCode, setSandboxEditableCode] = useState('');

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

        runResults.push({
          id: modelId,
          name: modelObj.name,
          provider: modelObj.provider,
          latency: `${totalLatencySec}s`,
          latencyNum: parseFloat(totalLatencySec),
          score: isSuccess ? (modelObj.score || 90) : 0,
          tokens: finalTokens,
          cost: modelObj.cost || '$0.002',
          costNum: parseFloat((modelObj.cost || '$0.002').replace('$', '')) || 0.002,
          success: isSuccess && !apiErrorMsg
        });

      } catch (err) {
        let isAbort = err.name === 'AbortError';
        let errorMsg = isAbort ? 'Cancelled by user.' : (err.message || 'API request failed.');

        runResults.push({
          id: modelId,
          name: modelObj.name,
          provider: modelObj.provider,
          latency: '0.0s',
          latencyNum: 0,
          score: 0,
          tokens: 0,
          cost: '$0.000',
          costNum: 0,
          success: false
        });

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
      }
    });

    await Promise.allSettled(streamPromises);
    setIsGenerating(false);
    setAbortControllers({});

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
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="font-extrabold text-xs text-purple-700 mt-2 mb-1 uppercase tracking-wider">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return <h3 key={idx} className="font-extrabold text-sm text-slate-900 mt-2 mb-1 border-b border-slate-200 pb-1">{trimmed.replace(/^#+\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <h4 key={idx} className="font-bold text-xs text-slate-900 mt-2 mb-0.5">{trimmed.slice(2, -2)}</h4>;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 pl-2 text-xs text-slate-700">
            <span className="text-purple-600 font-bold">•</span>
            <span>{trimmed.slice(2)}</span>
          </div>
        );
      }

      const formattedLine = line.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded font-mono text-[11px] border border-purple-200">{part.slice(1, -1)}</code>;
        }
        return part;
      });

      return <p key={idx} className="my-1 text-xs text-slate-700 leading-relaxed">{formattedLine}</p>;
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
    <div className="flex min-h-screen font-sans transition-colors duration-200 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-purple-50 text-slate-900 print:block print:bg-white print:min-h-0">

      {/* ─── 1. LEFT SIDEBAR NAVIGATION ───────────────────────────────────── */}
      <aside className="w-64 border-r border-slate-200/50 bg-white/40 backdrop-blur-xl flex flex-col justify-between flex-shrink-0 print:hidden">
        
        <div className="p-5 space-y-6">
          {/* Logo Branding */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight leading-tight text-slate-900">AI Benchmark</h1>
              <span className="text-[10px] font-bold text-purple-600 tracking-wider uppercase block">Analyzer Studio</span>
            </div>
          </Link>

          {/* New Benchmark Action Button */}
          <button
            onClick={() => {
              setPromptText('');
              handleRunBenchmark('Write a simple JavaScript program that prints "Hello, World!" to the console.');
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Benchmark</span>
          </button>

          {/* Main Navigation Links */}
          <nav className="space-y-1 text-xs font-bold">
            {[
              { label: 'Run Benchmark', icon: Play, active: true },
              { label: 'Compare Models', icon: Sliders, action: () => setIsModelDropdownOpen(true) },
              { label: 'Prompt Library', icon: Bookmark, action: () => setIsPromptLibraryOpen(true) },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveNav(item.label);
                    if (item.action) item.action();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition cursor-pointer ${
                    item.label === activeNav || item.active
                      ? 'bg-purple-50 text-purple-700 font-extrabold border border-purple-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${item.label === activeNav || item.active ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full uppercase font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">API System</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
            </span>
          </div>
        </div>

      </aside>

      {/* ─── 2. MAIN WORKSPACE CONTAINER ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto print:hidden">

        {/* Clean Header (No User Profile Section) */}
        <header className="h-16 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Selected Models</span>
            
            {/* Dynamic Model Selector Dropdown Trigger Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold flex items-center gap-2 cursor-pointer transition shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>{selectedModelIds.length} Models Selected</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dynamic Model Multi-Select Dropdown Box */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 mt-2 w-84 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search API models..."
                      value={modelSearchQuery}
                      onChange={e => setModelSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="flex gap-1.5 pb-1">
                    <button onClick={handleSelectAllPlaygroundModels} className="flex-1 text-[11px] py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-semibold">Select All</button>
                    <button onClick={handleClearAllPlaygroundModels} className="flex-1 text-[11px] py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors font-semibold">Clear All</button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {availableModels.filter(m => m.hasKey && (m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()))).map(m => {
                      const isSelected = selectedModelIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleModelSelection(m.id)}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold'
                              : 'bg-white border-transparent hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{m.icon}</span>
                            <div>
                              <div className="font-bold">{m.provider} - {m.name}</div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Ready</span>
                                <span className="text-slate-400">• {m.cost}</span>
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Active Model Badges */}
            <div 
              className="hidden lg:flex items-center gap-1.5 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {activeModelsList.map(m => (
                <span
                  key={m.id}
                  title={`${m.provider} - ${m.name}`}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shrink-0 max-w-[160px]"
                >
                  <span className="shrink-0">{m.icon}</span>
                  <span className="truncate">{m.provider} - {m.name}</span>
                  <button onClick={() => toggleModelSelection(m.id)} className="text-slate-400 hover:text-slate-700 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Clean Action Buttons (No Profile Badge) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsPromptLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-600" /> 15 JS Presets
            </button>
          </div>

        </header>

        {/* Workspace Content Padding */}
        <div className="p-6 space-y-6 max-w-[1400px] w-full mx-auto">

          {/* ─── 3. PROMPT INPUT CARD ────────────────────────────────────────── */}
          <section className="border border-white/60 rounded-3xl p-5 shadow-2xl shadow-purple-900/5 space-y-4 transition-all bg-white/60 backdrop-blur-2xl text-slate-900 hover:shadow-purple-900/10">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm flex items-center gap-2 text-slate-900">
                Enter your JavaScript query
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Executing {selectedModelIds.length} API models</span>
            </div>

            <div className="relative border border-slate-200 rounded-2xl focus-within:border-purple-600 transition-all p-3 bg-slate-50 text-slate-900">
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
                className="w-full bg-transparent border-none text-sm focus:outline-none resize-none min-h-[60px] font-sans"
                rows={2}
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSystemPromptOpen(!isSystemPromptOpen)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-600" /> System Persona
                  </button>

                  <button
                    onClick={() => setIsPromptLibraryOpen(true)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> JavaScript Presets
                  </button>
                </div>

                <button
                  onClick={isGenerating ? handleStopAll : () => handleRunBenchmark()}
                  disabled={!isGenerating && !promptText.trim()}
                  className={`px-6 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ${
                    isGenerating
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                      : !promptText.trim()
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Calling APIs... <span className="mx-1 opacity-50">|</span> <XCircle className="w-4 h-4 ml-1" /> Stop All
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Run Benchmark <span className="text-[10px] opacity-75 font-mono">Ctrl + Enter</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expandable System Instructions Editor */}
              {isSystemPromptOpen && (
                <div className="mt-3 pt-3 border-t border-slate-200 animate-fade-in space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">System Persona Prompt</label>
                  <textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-mono"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ─── 4. MODEL OUTPUT GRID (STRICT REAL API RESPONSES) ────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeModelsList.map(model => {
              const output = modelOutputs[model.id] || { text: '', streaming: false, metrics: { latency: '...', score: 0, tokens: 0, cost: model.cost } };
              const parsedSegments = parseResponseContent(output.text);

              return (
                <div
                  key={model.id}
                  className="border border-white/60 rounded-3xl p-5 shadow-xl shadow-indigo-900/5 flex flex-col justify-between transition-all duration-300 bg-white/60 backdrop-blur-2xl text-slate-900 relative hover:-translate-y-1 hover:shadow-indigo-900/15"
                >
                  
                  {/* Model Output Header */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-lg shadow-sm font-bold">
                          {model.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900">{model.provider} - {model.name}</h3>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">Real API Stream</span>
                        </div>
                      </div>

                      {/* Performance Metrics Pills */}
                      <div className="flex items-center gap-3 text-xs font-mono">
                        {output.streaming && (
                          <button
                            onClick={() => handleStopModel(model.id)}
                            className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Stop
                          </button>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">LATENCY</span>
                          <span className="font-bold text-slate-900">{output.metrics.latency}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-slate-400 font-bold block">TOKENS</span>
                          <span className="font-bold text-slate-900">{output.metrics.tokens}</span>
                        </div>
                      </div>
                    </div>

                    {/* Output Text & Code Display Area */}
                    <div className="min-h-[220px] text-xs leading-relaxed max-h-[420px] overflow-y-auto space-y-2 pr-1 font-sans">
                      {output.streaming && !output.text && (
                        <div className="flex flex-col items-center justify-center h-48 space-y-3 text-slate-500 font-mono">
                          <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                          <span className="font-bold">Streaming response from {model.provider}...</span>
                        </div>
                      )}

                      {!output.streaming && !output.text && !output.error && (
                        <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400 font-mono">
                          <Code className="w-8 h-8 text-slate-300" />
                          <span>Ready for evaluation. Enter prompt and click Run.</span>
                        </div>
                      )}

                      {/* Real API Key or Execution Error Banner */}
                      {output.error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <span>API Configuration Required</span>
                          </div>
                          <p className="text-[11px] leading-relaxed font-mono">{output.error}</p>
                          <p className="text-[10px] text-rose-600 font-medium">Please configure the corresponding API key inside the server's environment variables or local <code>config.json</code> file.</p>
                        </div>
                      )}

                      {parsedSegments.map((seg, idx) => {
                        if (seg.type === 'text') {
                          return (
                            <div key={idx} className="my-2">
                              {renderFormattedText(seg.content)}
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="my-2.5 rounded-2xl bg-white border border-slate-300 overflow-hidden shadow-sm text-slate-900">
                            <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-[10px] font-mono text-purple-700 font-extrabold uppercase tracking-wide">
                              <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-purple-600" /> {seg.language || 'javascript'}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRunCode(seg.code, seg.language || 'javascript', `${model.name} Snippet`)}
                                  className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer transition bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Run Sandbox</span>
                                </button>
                                <button
                                  onClick={() => handleCopy(seg.code, `${model.id}-${idx}`)}
                                  className="text-slate-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded-lg hover:bg-slate-200"
                                >
                                  {copiedModelId === `${model.id}-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>Copy</span>
                                </button>
                              </div>
                            </div>
                            <pre className="p-4 bg-[#f8fafc] text-slate-900 font-mono text-xs font-medium leading-relaxed overflow-x-auto whitespace-pre max-h-72">
                              <code>{seg.code}</code>
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Output Footer Action Bar */}
                  <div className="pt-3 border-t border-slate-200 mt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-500 font-bold">
                      <button
                        onClick={() => handleCopy(output.text, model.id)}
                        className="hover:text-purple-600 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedModelId === model.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Code</span>
                      </button>
                    </div>

                    {output.text && (
                      <button
                        onClick={() => handleRunCode(output.text, 'javascript', `${model.name} Output`)}
                        className="text-purple-600 hover:text-purple-800 font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Run Code Sandbox
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </section>

        </div>

      </div>

      {/* ─── 5. RIGHT SIDEBAR BENCHMARK SUMMARY (DYNAMIC DATA) ───────────── */}
      <aside className="w-80 border-l border-slate-200/50 bg-white/40 backdrop-blur-xl p-5 flex flex-col justify-between flex-shrink-0 text-slate-900 print:hidden">
        <div className="space-y-6">

          {!hasApiResponse ? (
            <div className="p-5 rounded-3xl border border-dashed border-purple-200 bg-purple-50/40 text-center space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900">API Execution Summary</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The execution summary and real-time benchmark metrics will be displayed here automatically after receiving a response from the API.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-purple-200 text-[10px] font-bold text-purple-700 shadow-2xs">
                  <Clock className="w-3 h-3 text-purple-500 animate-pulse" /> Awaiting API Execution
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Benchmark Summary Header */}
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2 mb-4 text-slate-900">
                  <BarChart3 className="w-4 h-4 text-purple-600" /> API Execution Summary
                </h3>

                {/* Dynamic Benchmark Metrics Breakdown List */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">⚡ Avg Latency</span>
                      <span className="font-extrabold">{dynamicSummaryStats.avgLatency}</span>
                    </div>
                    <span className="text-emerald-600 font-mono font-extrabold">{dynamicSummaryStats.avgLatency}</span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">📊 API Success / Error</span>
                      <span className="font-extrabold">{dynamicSummaryStats.successCount} Passed</span>
                    </div>
                    <span className="text-emerald-600 font-mono font-extrabold">{dynamicSummaryStats.failureCount} Errors</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Block */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-slate-900">
                  <Zap className="w-3.5 h-3.5 text-purple-600" /> Real-time Execution Stats
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Benchmark Runs</span>
                    <span className="font-bold text-slate-900 font-mono">{dynamicSummaryStats.totalRuns}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Active Models Tested</span>
                    <span className="font-bold text-slate-900 font-mono">{dynamicSummaryStats.modelsTestedCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Tokens Generated</span>
                    <span className="font-bold text-slate-900 font-mono">{dynamicSummaryStats.totalTokens}</span>
                  </div>
                </div>
                
                {/* View Full Report Button */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full mt-4 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Full Report</span>
                </button>
              </div>
            </>
          )}

        </div>
      </aside>

      {/* ─── MODAL: 15 SIMPLE JAVASCRIPT PRESETS LIBRARY ────────────────── */}
      {isPromptLibraryOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="border border-slate-200 bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-600" /> 15 Simple JavaScript Presets
              </h3>
              <button onClick={() => setIsPromptLibraryOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="w-full p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer group bg-slate-50 border-slate-200 hover:border-purple-600 hover:bg-purple-50/50"
                >
                  <div>
                    <span className="font-bold text-xs group-hover:text-purple-700 block text-slate-900">{idx + 1}. {preset.label}</span>
                    <span className="text-[11px] text-slate-500 block truncate">{preset.prompt}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: COMPREHENSIVE PERFORMANCE REPORT ────────────────────── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in print:static print:bg-transparent print:p-0 print:block">
          <div className="border border-slate-200 bg-white text-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:block">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 flex-shrink-0 print:hidden">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-600" /> Comprehensive Performance Report
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto print:overflow-visible print:p-0">
              <div className="space-y-8 bg-white p-4" ref={reportRef}>
                
                {/* PDF Header (Only visible in exported PDF but good for preview) */}
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h2 className="text-2xl font-black text-slate-900">AI Benchmark Analyzer - Performance Report</h2>
                  <p className="text-slate-500 text-sm mt-1">Generated on {new Date().toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scatter Chart (Speed vs Cost) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h4 className="font-bold text-sm mb-4">Speed vs. Cost Tradeoff</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" dataKey="speed" name="Speed" unit=" t/s" tick={{ fontSize: 10 }} />
                          <YAxis type="number" dataKey="cost" name="Cost" unit="$" tick={{ fontSize: 10 }} />
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
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h4 className="font-bold text-sm mb-4">Latency Comparison (Seconds)</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10 }} unit="s" />
                          <RechartsTooltip />
                          <Bar dataKey="latency" name="Latency (s)" radius={[4, 4, 0, 0]}>
                            {performanceChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Bar Chart (Speed) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <h4 className="font-bold text-sm mb-4">Throughput Comparison (Tokens per Second)</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                        <YAxis tick={{ fontSize: 10 }} unit=" t/s" />
                        <RechartsTooltip />
                        <Bar dataKey="speed" name="Tokens/sec" radius={[4, 4, 0, 0]}>
                          {performanceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Provider</th>
                          <th className="px-4 py-3">Model</th>
                          <th className="px-4 py-3 text-right">Latency</th>
                          <th className="px-4 py-3 text-right">Tokens</th>
                          <th className="px-4 py-3 text-right">Speed (t/s)</th>
                          <th className="px-4 py-3 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {performanceChartData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">{row.provider}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.name}</td>
                            <td className="px-4 py-3 text-right">{row.latency}s</td>
                            <td className="px-4 py-3 text-right font-mono">{row.tokens}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.speed}</td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">${row.cost.toFixed(4)}</td>
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
          <div className="bg-white border border-slate-300 rounded-3xl shadow-2xl max-w-5xl w-full h-[82vh] flex flex-col overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 block">
                    Code Runner: {sandboxCode.title}
                  </h3>
                  <span className="text-[10px] text-emerald-600 font-mono font-semibold">Interactive JavaScript Sandbox</span>
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
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Code
                </button>

                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300 text-xs font-semibold">
                  <button
                    onClick={() => setSandboxActiveTab('preview')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      sandboxActiveTab === 'preview' ? 'bg-purple-600 text-white font-bold' : 'text-slate-700 hover:text-purple-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Terminal Output
                  </button>
                  <button
                    onClick={() => setSandboxActiveTab('code')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      sandboxActiveTab === 'code' ? 'bg-purple-600 text-white font-bold' : 'text-slate-700 hover:text-purple-700'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> Source Code
                  </button>
                </div>

                {/* Close Button */}
                <button onClick={() => setSandboxCode(null)} className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-[#f8fafc] relative overflow-hidden">
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
                  <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                    <span>Language: <strong className="text-purple-700 uppercase">JavaScript</strong></span>
                    <button
                      onClick={() => handleCopy(sandboxEditableCode, 'modal-code')}
                      className="px-3 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </button>
                  </div>
                  <textarea
                    value={sandboxEditableCode}
                    onChange={e => setSandboxEditableCode(e.target.value)}
                    className="flex-1 w-full bg-white text-slate-900 font-mono text-xs p-4 rounded-2xl border border-slate-300 focus:outline-none focus:border-purple-600 resize-none leading-relaxed font-medium shadow-inner"
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
