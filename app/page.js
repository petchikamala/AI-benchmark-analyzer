'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlayCircle,
  Activity,
  Trophy,
  History as HistoryIcon,
  BarChart3,
  Database,
  Code,
  Key,
  Settings,
  Search,
  Bell,
  User,
  Cpu,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Sliders,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Menu,
  Check,
  ChevronDown,
  Info,
  Layers,
  Sparkline,
  Plus,
  Eye,
  ArrowRight,
  X,
  Lock,
  Calendar
} from 'lucide-react';

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MODELS_GROUPED = {
  "Google Gemini": [
    "gemini-3.5-flash",
    "gemini-2.5-flash"
  ],
  "Groq API": [],
  "OpenRouter Models": [
    "openrouter/openrouter/free",
    "openrouter/google/gemma-4-26b-a4b-it:free",
    "openrouter/nvidia/nemotron-3-nano-30b-a3b:free"
  ],
  "Ollama / Custom Cloud": [
  ],
};

const PLAYGROUND_PROMPTS = {
  Coding: {
    Easy: "Write a JavaScript function to sum two numbers. Output only the code block.",
    Medium: "Write a JavaScript function to reverse a singly linked list. Output only the code block.",
    Hard: "Write a JavaScript program to find the shortest path in a graph using Dijkstra's algorithm. Include comments."
  },
  Reasoning: {
    Easy: "John has 5 apples. He eats 2. How many does he have left? Explain briefly.",
    Medium: "A farmer has chickens and rabbits. There are 35 heads and 94 legs. How many chickens and how many rabbits does he have? Explain your reasoning.",
    Hard: "Explain the logical paradox of the liar sentence: 'This statement is false.' Analyze its philosophical implications in under 100 words."
  },
  Mathematics: {
    Easy: "What is 15% of 200? Explain the steps.",
    Medium: "Solve for x: 3x + 7 = 22. Show your work.",
    Hard: "Find the derivative of f(x) = x^3 * ln(x) with respect to x. Explain each step."
  },
  Creative: {
    Easy: "Write a 4-line poem about a cat that loves computing.",
    Medium: "Write a short story (under 150 words) about a time traveler who gets stuck in yesterday.",
    Hard: "Write a Shakespearean sonnet exploring the concept of entropy in the universe."
  }
};

const NAV_ITEMS = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Leaderboard', icon: Trophy },
  { name: 'Compare Models', icon: Sliders },
  { name: 'History', icon: HistoryIcon },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'Playground', icon: Code },
];

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getGroupForModel(model) {
  if (model.startsWith("gemini-")) return "Google Gemini";
  if (model.startsWith("groq/")) return "Groq API";
  if (model.startsWith("openrouter/")) return "OpenRouter Models";
  return "Ollama / Custom Cloud";
}

function parseInline(text) {
  const parts = [];
  const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[1];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index} className="font-semibold" style={{ color: 'var(--foreground)' }}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="px-1 py-0.5 rounded-md font-mono text-[10px]" style={{ background: 'oklch(0.20 0.015 275)', border: '1px solid var(--border)', color: 'var(--accent)' }}>{token.slice(1, -1)}</code>);
    }
    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function renderMarkdown(text) {
  if (!text) return null;
  
  const parts = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1], content: match[2] });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts.map((part, index) => {
    if (part.type === 'code') {
      return (
        <pre key={index} className="code-block-embed overflow-x-auto p-3.5 rounded-xl text-[11px] font-mono my-3 block whitespace-pre" style={{ background: 'oklch(0.18 0.015 275)', border: '1px solid var(--border)', color: 'oklch(0.85 0.03 200)' }}>
          <code className={part.language ? `language-${part.language}` : ''}>
            {part.content.trim()}
          </code>
        </pre>
      );
    } else {
      const lines = part.content.split('\n');
      return (
        <div key={index} className="space-y-2 my-2">
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lineIdx} className="h-1.5" />;

            if (trimmed.startsWith('#')) {
              const depth = (trimmed.match(/^#+/) || ['#'])[0].length;
              const title = trimmed.replace(/^#+\s*/, '');
              const sizeClass = depth === 1 ? 'text-base font-bold mt-4 mb-2' : depth === 2 ? 'text-sm font-semibold mt-3 mb-2' : 'text-xs font-semibold mt-2 mb-1.5';
              return (
                <div key={lineIdx} className={sizeClass} style={{ color: 'var(--foreground)' }}>
                  {parseInline(title)}
                </div>
              );
            }

            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const listContent = trimmed.replace(/^[*+-]\s*/, '');
              return (
                <ul key={lineIdx} className="list-disc pl-4 space-y-1 my-1">
                  <li className="leading-relaxed">{parseInline(listContent)}</li>
                </ul>
              );
            }

            return (
              <p key={lineIdx} className="leading-relaxed">
                {parseInline(line)}
              </p>
            );
          })}
        </div>
      );
    }
  });
}

// ─── Component ────────────────────────────────────────────────────────────────


export default function BenchmarkDashboard() {
  const router = useRouter();
  // Config state
  const [config, setConfig] = useState({
    env: { ollamaApiKey: '', ollamaHost: 'http://localhost:11434', geminiApiKey: '', groqApiKey: '', openRouterApiKey: '' },
    config: { models: [], tasks: [], iterations: 3 }
  });
  const [modelsGrouped, setModelsGrouped] = useState(structuredClone(DEFAULT_MODELS_GROUPED));
  const [selectedModels, setSelectedModels] = useState(['gemini-3.5-flash', 'openrouter/google/gemma-4-31b-it:free']);
  const [iterations, setIterations] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');
  const [configStatus, setConfigStatus] = useState('');

  // Modals & UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [searchModelQuery, setSearchModelQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [inspectedRow, setInspectedRow] = useState(null);

  // API Key Inputs in Modal
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState('');

  // Prompt Category & Difficulty & Priority states
  const [promptCategory, setPromptCategory] = useState('Coding');
  const [promptDifficulty, setPromptDifficulty] = useState('Medium');
  const [priorityGoal, setPriorityGoal] = useState('Balanced');

  // Removed unused AI Recommendation states

  // Live Queue & Run logs states
  const [liveQueue, setLiveQueue] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Ready');
  const [terminalLines, setTerminalLines] = useState(['AI Benchmark Analyzer ready. Configure models and press Start Evaluation.\n']);
  const abortRef = useRef(false);
  const sessionIdRef = useRef('');

  // Results & History state
  const [runResults, setRunResults] = useState([]);
  const [runOutputs, setRunOutputs] = useState({});
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyModelFilter, setHistoryModelFilter] = useState('All');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);

  // Comparison State
  const [compareModelA, setCompareModelA] = useState('');
  const [compareModelB, setCompareModelB] = useState('');

  // Analytics Chart Active Tab
  const [activeChartTab, setActiveChartTab] = useState('latency');
  const [toasts, setToasts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  const terminalRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    document.documentElement.classList.remove('dark');
    (async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data) {
          setConfig(data);
          if (data.config?.models?.length) setSelectedModels(data.config.models);
          setIterations(data.config?.iterations || 3);
          setGeminiKeyInput(data.env?.geminiApiKey || '');
          setGroqKeyInput(data.env?.groqApiKey || '');
          setOpenRouterKeyInput(data.env?.openRouterApiKey || '');
        }
      } catch (e) { }
    })();
    loadHistory();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  useEffect(() => {
    const savedQueue = localStorage.getItem('live_benchmark_queue');
    if (savedQueue) {
      try {
        setLiveQueue(JSON.parse(savedQueue));
      } catch (_) {}
    }

    const channel = new BroadcastChannel('live-benchmark-channel');
    channel.onmessage = (event) => {
      if (event.data) {
        if (event.data.type === 'update') {
          setLiveQueue(event.data.queue);
        } else if (event.data.type === 'clear') {
          setLiveQueue([]);
          loadHistory();
        }
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const appendLog = useCallback((text) => {
    setTerminalLines(prev => {
      if (prev.length > 0 && text.length < 100 && !text.includes('\n')) {
        const updated = [...prev];
        updated[updated.length - 1] = updated[updated.length - 1] + text;
        return updated;
      }
      return [...prev, text];
    });
  }, []);

  // Navigation Click Handler
  const handleNavClick = (navName) => {
    setActiveNav(navName);
    setIsMobileMenuOpen(false);
    if (navName === 'Playground') {
      router.push('/playground');
      return;
    }
    if (navName === 'Overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (navName === 'Leaderboard') {
      document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Compare Models') {
      document.getElementById('compare-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'History') {
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Analytics') {
      document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  function handleModelToggle(model, checked) {
    setSelectedModels(prev => checked ? [...prev, model] : prev.filter(m => m !== model));
  }

  function handleSelectAllModels() {
    const allModels = Object.values(modelsGrouped).flat();
    setSelectedModels(allModels);
    showToast('Selected all models');
  }

  function handleClearAllModels() {
    setSelectedModels([]);
    showToast('Cleared model selection');
  }

  async function handleSaveConfigKeys() {
    const payload = {
      env: {
        ...config.env,
        geminiApiKey: geminiKeyInput.trim(),
        groqApiKey: groqKeyInput.trim(),
        openRouterApiKey: openRouterKeyInput.trim(),
      },
      config: { models: selectedModels, tasks: [], iterations: Number(iterations) }
    };
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setConfig(payload);
      setIsApiKeysModalOpen(false);
      showToast('API Keys saved successfully!');
    } catch (e) {
      showToast('Failed to save API keys', 'error');
    }
  }

  async function handleStartBenchmark() {
    if (!selectedModels.length) {
      showToast('Please select at least one model to benchmark.', 'error');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setRunResults([]);
    setRunOutputs({});
    setTerminalLines(['Starting benchmark evaluation...\n']);
    setStatusText('Initializing...');
    abortRef.current = false;
    sessionIdRef.current = generateSessionId();

    let promptText = '';
    let taskName = '';
    let taskId = '';

    if (promptCategory === 'Custom Prompt') {
      if (!customPrompt.trim()) {
        showToast('Please enter a custom prompt.', 'error');
        setIsRunning(false);
        return;
      }
      promptText = customPrompt.trim();
      taskName = 'Custom Prompt';
      taskId = 'custom-prompt';
    } else {
      const catKey = promptCategory === 'Creative Writing' ? 'Creative' : promptCategory;
      promptText = PLAYGROUND_PROMPTS[catKey]?.[promptDifficulty] || "Explain AI.";
      taskName = `${promptCategory} (${promptDifficulty})`;
      taskId = `${promptCategory.toLowerCase()}-${promptDifficulty.toLowerCase()}`;
    }

    const iter = Number(iterations) || 3;
    const totalRuns = selectedModels.length * iter;
    let completedRuns = 0;

    const initialQueue = [];
    selectedModels.forEach(model => {
      for (let i = 0; i < iter; i++) {
        initialQueue.push({
          id: `${model}-run-${i}`,
          model,
          iteration: i + 1,
          taskName,
          status: 'queued',
          progress: 0
        });
      }
    });
    setLiveQueue(initialQueue);

    appendLog(`Session ID: ${sessionIdRef.current}\nModels: ${selectedModels.join(', ')}\nTask: ${taskName}\nIterations: ${iter}\n=========================================\n`);
    showToast(`Benchmark running: ${totalRuns} tasks scheduled`);

    const resultBuffer = {};

    for (const model of selectedModels) {
      if (abortRef.current) break;

      const key = `${model}::${taskName}`;
      resultBuffer[key] = { model, task: taskName, runs: [] };

      for (let i = 0; i < iter; i++) {
        if (abortRef.current) break;

        completedRuns++;
        setStatusText(`Running ${model} | ${taskName} (${i + 1}/${iter})`);

        setLiveQueue(prev => prev.map(item => (item.model === model && item.iteration === (i + 1)) ? { ...item, status: 'running' } : item));

        const runResult = await runSingle({
          model, task: taskName, taskId, prompt: promptText, apiKeys: config.env, sessionId: sessionIdRef.current, iteration: i + 1, totalIterations: iter, currentCount: completedRuns, totalCount: totalRuns,
        }, appendLog, (prog) => {
          setLiveQueue(prev => prev.map(item => (item.model === model && item.iteration === (i + 1)) ? { ...item, progress: prog } : item));
          setProgress(Math.round(((completedRuns - 1) / totalRuns) * 100 + (prog / totalRuns)));
        }, setRunOutputs);

        setLiveQueue(prev => prev.map(item => (item.model === model && item.iteration === (i + 1)) ? { ...item, status: runResult.success ? 'completed' : 'failed', progress: 100 } : item));
        resultBuffer[key].runs.push(runResult);
        await new Promise(r => setTimeout(r, 200));
      }

      const { runs } = resultBuffer[key];
      const successful = runs.filter(r => r.success);
      if (successful.length) {
        const avgTtft = successful.reduce((s, r) => s + r.ttftMs, 0) / successful.length;
        const avgDuration = successful.reduce((s, r) => s + r.durationMs, 0) / successful.length;
        const avgTokens = successful.reduce((s, r) => s + r.tokens, 0) / successful.length;
        const avgTPS = successful.reduce((s, r) => s + r.tokensPerSec, 0) / successful.length;
        setRunResults(prev => [...prev, { model, task: taskName, avgTtft, avgDuration, avgTokens, avgTokensPerSec: avgTPS, successCount: successful.length, totalCount: iter }]);
      } else {
        setRunResults(prev => [...prev, { model, task: taskName, successCount: 0, totalCount: iter }]);
      }
    }

    setProgress(100);
    setStatusText('Completed');
    setIsRunning(false);
    appendLog('\nAll evaluations complete!\n');
    showToast('Benchmark run completed successfully!');
    loadHistory();
  }

  function handleStopBenchmark() {
    abortRef.current = true;
    setIsRunning(false);
    setStatusText('Stopped by user');
    appendLog('\n[Evaluation stopped]\n');
    showToast('Benchmark cancelled.', 'error');
  }

  async function loadHistory() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      const { results = [] } = await res.json();
      setHistory(results);
    } catch (e) { 
    } finally {
      setIsLoading(false);
    }
  }

  const downloadCSVReport = () => {
    const csvRows = ['Date & Time,Model,Task,TTFT (ms),Latency (ms),Tokens/s,Status'];
    history.forEach(row => {
      csvRows.push(`"${new Date(row.created_at || Date.now()).toLocaleString()}","${row.model}","${row.task}",${row.ttft_ms || 0},${row.latency_ms || 0},${row.speed_tps || 0},${row.success !== false ? 'Completed' : 'Failed'}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI-Benchmark-Report-${Date.now()}.csv`;
    link.click();
    showToast('CSV History report downloaded!');
  };

  const dashboardStats = useMemo(() => {
    const uniqueSessions = new Set();
    const uniqueModels = new Set();
    let totalLatency = 0;
    let successfulRuns = 0;
    let todayRunsCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    history.forEach(run => {
      if (run.session_id) uniqueSessions.add(run.session_id);
      if (run.model) uniqueModels.add(run.model);
      if (run.success) {
        totalLatency += (run.latency_ms || 0);
        successfulRuns++;
      }
      if (run.created_at && run.created_at.startsWith(todayStr)) {
        todayRunsCount++;
      }
    });

    return {
      totalSessions: uniqueSessions.size,
      todayRuns: todayRunsCount,
      modelsAvailable: uniqueModels.size,
      avgLatency: successfulRuns > 0 ? (totalLatency / successfulRuns / 1000).toFixed(2) + 's' : '0s',
      totalRuns: history.length
    };
  }, [history]);

  const { leaderboardData, bestModel } = useMemo(() => {
    if (!history.length) return { leaderboardData: [], bestModel: null };

    const modelStats = {};
    history.forEach(run => {
      if (!modelStats[run.model]) {
        modelStats[run.model] = { name: run.model, runs: 0, successes: 0, totalSpeed: 0, totalLatency: 0, totalTtft: 0, totalCost: 0, peakSpeed: 0, minLatency: 9999999 };
      }
      modelStats[run.model].runs++;
      if (run.success) {
        modelStats[run.model].successes++;
        modelStats[run.model].totalSpeed += (run.speed_tps || 0);
        modelStats[run.model].totalLatency += (run.latency_ms || 0);
        modelStats[run.model].totalTtft += (run.ttft_ms || 0);
        modelStats[run.model].totalCost += (run.cost || 0);
        
        if ((run.speed_tps || 0) > modelStats[run.model].peakSpeed) {
          modelStats[run.model].peakSpeed = run.speed_tps;
        }
        if ((run.latency_ms || 9999999) < modelStats[run.model].minLatency) {
          modelStats[run.model].minLatency = run.latency_ms;
        }
      }
    });

    let maxSpeed = 1;
    let minLatency = 9999999;
    
    const aggregated = Object.values(modelStats).map(stat => {
      const successRuns = stat.successes || 1; // prevent div by zero
      const avgSpeed = stat.totalSpeed / successRuns;
      const avgLatency = stat.totalLatency / successRuns;
      
      if (avgSpeed > maxSpeed) maxSpeed = avgSpeed;
      if (avgLatency > 0 && avgLatency < minLatency) minLatency = avgLatency;
      
      return {
        model: stat.name,
        accuracy: ((stat.successes / stat.runs) * 100).toFixed(1) + '%',
        successRate: stat.successes / stat.runs,
        tps: parseFloat(avgSpeed.toFixed(1)),
        latency: (avgLatency / 1000).toFixed(2) + 's',
        latencyMs: avgLatency,
        ttft: (stat.totalTtft / successRuns).toFixed(0) + 'ms',
        cost: stat.totalCost / successRuns,
        runs: stat.runs,
        successes: stat.successes,
        peakSpeed: parseFloat((stat.peakSpeed || 0).toFixed(1)),
        minLatency: stat.minLatency !== 9999999 ? (stat.minLatency / 1000).toFixed(2) + 's' : 'N/A',
        minLatencyMs: stat.minLatency !== 9999999 ? stat.minLatency : 0
      };
    });

    const scored = aggregated.map(stat => {
      const normSpeed = Math.min((stat.tps / maxSpeed) * 100, 100);
      const normLatency = Math.min((minLatency / (stat.latencyMs || 1)) * 100, 100);
      const score = (stat.successRate * 50) + (normSpeed * 0.3) + (normLatency * 0.2);
      return { ...stat, score: parseFloat(score.toFixed(1)) };
    }).sort((a, b) => b.score - a.score);

    const badges = ['🥇', '🥈', '🥉', '4', '5'];
    scored.forEach((s, idx) => {
      s.rank = idx + 1;
      s.badge = badges[idx] || (idx + 1).toString();
    });

    return { leaderboardData: scored, bestModel: scored[0] };
  }, [history]);

  const barChartData = useMemo(() => {
    return leaderboardData.slice(0, 5).map(l => ({
      name: l.model,
      TPS: l.tps,
      Latency: parseFloat(l.latency.replace('s','')),
      Cost: l.cost || 0
    }));
  }, [leaderboardData]);

  const radarChartData = useMemo(() => {
    if (leaderboardData.length === 0) return [];
    const A = leaderboardData[0] || {};
    const B = leaderboardData[1] || {};
    const C = leaderboardData[2] || {};
    
    const maxTPS = Math.max(A.tps || 1, B.tps || 1, C.tps || 1);
    
    return [
      { subject: 'Reliability', A: parseFloat(A.accuracy || 0), B: parseFloat(B.accuracy || 0), C: parseFloat(C.accuracy || 0), fullMark: 100 },
      { subject: 'Speed (TPS)', A: ((A.tps||0)/maxTPS)*100, B: ((B.tps||0)/maxTPS)*100, C: ((C.tps||0)/maxTPS)*100, fullMark: 100 },
      { subject: 'Latency', A: A.latencyMs ? (1000/A.latencyMs)*100 : 0, B: B.latencyMs ? (1000/B.latencyMs)*100 : 0, C: C.latencyMs ? (1000/C.latencyMs)*100 : 0, fullMark: 100 },
      { subject: 'Overall Score', A: A.score || 0, B: B.score || 0, C: C.score || 0, fullMark: 100 },
    ];
  }, [leaderboardData]);

  const uniqueModels = useMemo(() => {
    const models = history.map(h => h.model);
    return ['All', ...Array.from(new Set(models))];
  }, [history]);

  // Filtered History
  const filteredHistory = history.filter(row => {
    const matchesModel = historyModelFilter === 'All' || row.model === historyModelFilter;
    const matchesDate = !historyDateFilter || (row.created_at && new Date(row.created_at).toISOString().split('T')[0] === historyDateFilter);
    return matchesModel && matchesDate;
  });

  // Sync comparison selections with loaded leaderboardData models
  useEffect(() => {
    if (isMounted && leaderboardData.length > 0) {
      const modelAExists = leaderboardData.some(l => l.model === compareModelA);
      const modelBExists = leaderboardData.some(l => l.model === compareModelB);
      
      let nextA = compareModelA;
      let nextB = compareModelB;

      if (!modelAExists) {
        nextA = leaderboardData[0].model;
      }
      if (!modelBExists) {
        nextB = leaderboardData.length > 1 ? leaderboardData[1].model : leaderboardData[0].model;
      }

      // If they are equal but there are multiple models, make B distinct
      if (nextA === nextB && leaderboardData.length > 1) {
        const fallback = leaderboardData.find(l => l.model !== nextA);
        if (fallback) {
          nextB = fallback.model;
        }
      }

      if (nextA !== compareModelA) setCompareModelA(nextA);
      if (nextB !== compareModelB) setCompareModelB(nextB);
    }
  }, [leaderboardData, compareModelA, compareModelB, isMounted]);

  const modelAData = leaderboardData.find(l => l.model === compareModelA) || null;
  const modelBData = leaderboardData.find(l => l.model === compareModelB) || null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ─── Mobile Header Topbar (< md) ────────────────────────── */}
      <header className="md:hidden sticky top-0 backdrop-blur-md px-4 py-3 flex items-center justify-between z-40 shadow-xs" style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <span className="flex w-8 h-8 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
            <Zap className="w-3.5 h-3.5" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>AI Benchmark</span>
            <span className="num block text-[8px] uppercase tracking-[0.22em]" style={{ color: 'var(--muted-foreground)' }}>Analyzer</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold" style={{ background: 'oklch(0.75 0.17 155 / 15%)', color: 'var(--success)', border: '1px solid oklch(0.75 0.17 155 / 20%)' }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 animate-ping rounded-full" style={{ background: 'oklch(0.75 0.17 155 / 70%)' }} />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            </span>
            Live
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl transition"
            style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ─── Mobile Off-Canvas Navigation Drawer (< md) ───────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[80vw] flex flex-col z-50 animate-drawer-in" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
              <div className="flex items-center gap-3">
                <span className="flex w-9 h-9 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
                  <Zap className="w-4 h-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>AI Benchmark</span>
                  <span className="num block text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--muted-foreground)' }}>Analyzer</span>
                </span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg transition" style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.name)}
                    className={`group flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                      ? 'shadow-[inset_0_1px_0_0_oklch(1_0_0/8%)]'
                      : ''
                      }`}
                    style={isActive ? { background: 'var(--sidebar-accent)', color: 'var(--sidebar-accent-foreground)' } : { color: 'var(--muted-foreground)' }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? 'var(--primary-glow)' : 'var(--muted-foreground)' }} />
                    <span className="truncate">{item.name}</span>
                    {isActive && <span className="ml-auto h-4 w-[2px] rounded-full" style={{ background: 'var(--primary-glow)' }} />}
                  </button>
                );
              })}
            </nav>

            <div className="m-3 rounded-xl px-4 py-3" style={{ border: '1px solid var(--sidebar-border)', background: 'oklch(0.26 0.028 275 / 60%)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 animate-ping rounded-full" style={{ background: 'oklch(0.75 0.17 155 / 70%)' }} />
                  <span className="relative w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                </span>
                All systems operational
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Collapsible Left Sidebar (Desktop md+) ──────────── */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 ${isSidebarCollapsed ? 'w-20' : 'w-[248px]'}`} style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}>
        <div className={`flex items-center justify-between px-5 py-6 ${isSidebarCollapsed ? 'flex-col gap-4' : ''}`} style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
              <Zap className="w-4 h-4" />
            </span>
            {!isSidebarCollapsed && (
              <span className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>AI Benchmark</span>
                <span className="num block text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--muted-foreground)' }}>Analyzer</span>
              </span>
            )}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg transition cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.name;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.name)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                  ? 'shadow-[inset_0_1px_0_0_oklch(1_0_0/8%)]'
                  : ''
                  }`}
                style={isActive ? { background: 'var(--sidebar-accent)', color: 'var(--sidebar-accent-foreground)' } : { color: 'var(--muted-foreground)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: isActive ? 'var(--primary-glow)' : 'var(--muted-foreground)' }} />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                {isActive && !isSidebarCollapsed && <span className="ml-auto h-4 w-[2px] rounded-full" style={{ background: 'var(--primary-glow)' }} />}
              </button>
            );
          })}
        </nav>

        {!isSidebarCollapsed && (
          <div className="m-3 rounded-xl px-4 py-3" style={{ border: '1px solid var(--sidebar-border)', background: 'oklch(0.26 0.028 275 / 60%)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 animate-ping rounded-full" style={{ background: 'oklch(0.75 0.17 155 / 70%)' }} />
                <span className="relative w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              </span>
              All systems operational
            </div>
          </div>
        )}
      </aside>

      {/* ─── Main Workspace ───────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden w-full">

        {/* Main Body */}
        <main className="grid-lines relative min-w-0 flex-1">
          {/* Halo gradient overlay at top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ backgroundImage: 'var(--gradient-halo)', opacity: 0.5 }} />
          <div className="relative mx-auto max-w-[1500px] px-5 py-7 lg:px-8 space-y-4">

          {/* Toast Notification Container */}
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-auto z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
              <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold animate-slide-in" style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                <span className="truncate">{t.message}</span>
              </div>
            ))}
          </div>

          {/* API Keys Configuration Modal Removed */}

          {/* Inspected History Row Modal */}
          {inspectedRow && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
              <div className="panel max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 mx-4">
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                    Run Inspection: {inspectedRow.model}
                  </h3>
                  <button onClick={() => setInspectedRow(null)} className="p-1 rounded-lg transition" style={{ color: 'var(--muted-foreground)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <div className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--secondary)' }}>
                    <span>Task Category: <strong style={{ color: 'var(--foreground)' }}>{inspectedRow.task}</strong></span>
                    <span>Latency: <strong style={{ color: 'var(--foreground)' }}>{(inspectedRow.latency_ms / 1000).toFixed(2)}s</strong></span>
                  </div>
                  <div>
                    <span className="font-bold block mb-1" style={{ color: 'var(--foreground)' }}>Generated Output:</span>
                    <div className="max-h-80 overflow-y-auto p-4 rounded-xl text-xs font-normal space-y-1" style={{ background: 'oklch(0.20 0.015 275 / 50%)', border: '1px solid var(--border)' }}>
                      {inspectedRow.response_text ? renderMarkdown(inspectedRow.response_text) : 'Output response generated successfully.'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button onClick={() => setInspectedRow(null)} className="px-4 py-2 text-white font-bold text-xs rounded-xl" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* 1. Page Header */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
                Dashboard <span className="gradient-text">Overview</span>
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Monitor, compare, and analyze AI models in real time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs transition-colors" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span className="num">Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </button>
              <a
                href="/playground"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-transform hover:-translate-y-px"
                style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)', color: 'var(--primary-foreground)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Playground
              </a>
            </div>
          </header>

          {/* 2. Four Dashboard Summary Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array(4).fill(0).map((_, idx) => (
                <div key={idx} className="panel overflow-hidden p-5 animate-pulse">
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-3 bg-zinc-800 rounded-md w-24" />
                      <div className="h-8 bg-zinc-800 rounded-md w-36 mt-3" />
                      <div className="h-3 bg-zinc-800 rounded-md w-20 mt-3" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              [
                { name: 'Total Models', value: dashboardStats.modelsAvailable.toString(), change: '+3 this week', icon: Cpu, tone: 'accent' },
                { name: 'Benchmark Runs', value: dashboardStats.totalRuns.toString(), change: '+12 today', icon: Activity, tone: 'accent' },
                { name: 'Best Performing', value: bestModel ? bestModel.model.split('/').pop() : 'N/A', change: bestModel ? `Score ${bestModel.score} / 100` : '', icon: Trophy, tone: 'primary', small: true },
                { name: 'Avg Response', value: dashboardStats.avgLatency, change: '-2.4s vs last run', icon: Clock, tone: 'accent' },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="panel halo group overflow-hidden p-5">
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="num text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted-foreground)' }}>
                          {card.name}
                        </p>
                        <p className={`num mt-3 truncate font-semibold ${card.small ? 'text-xl' : 'text-[2rem] leading-none'} ${card.tone === 'primary' ? 'gradient-text' : ''}`}>
                          {card.value}
                        </p>
                        <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          <svg className="w-3 h-3" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 17L17 7M7 7h10v10" /></svg>
                          {card.change}
                        </p>
                      </div>
                      <span
                        className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                        style={{ border: '1px solid var(--border)', background: 'oklch(1 0 0 / 5%)', color: card.tone === 'primary' ? 'var(--primary-glow)' : 'var(--accent)' }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </section>




          <div id="analytics-section" className="panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="num flex w-6 h-6 items-center justify-center rounded-lg text-[11px] font-semibold" style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)' }}>1</span>
                <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  Analytics <span className="ml-2 text-xs font-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--muted-foreground)' }}>Normalized across 5 dimensions</span>
                </h2>
              </div>
              <div className="flex gap-1 rounded-xl p-1" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)' }}>
                {[ 'Latency', 'Radar','Tokens/Sec', 'Cost'].map(tab => {
                  const tabId = tab === 'Tokens/Sec' ? 'tokens' : tab.toLowerCase();
                  return (
                    <button 
                      key={tab}
                      className="num rounded-lg px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all"
                      style={activeChartTab === tabId ? { background: 'var(--elevated)', color: 'var(--foreground)', boxShadow: '0 1px 0 0 oklch(1 0 0/10%) inset' } : { color: 'var(--muted-foreground)' }}
                      onClick={() => setActiveChartTab(tabId)}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-80 sm:h-96 w-full flex items-center justify-center mt-2">
              {isMounted && (
                isLoading ? (
                  <div className="w-full h-full flex flex-col justify-between animate-pulse p-4 space-y-4">
                    <div className="flex justify-between items-end h-64 w-full px-2 border-b border-zinc-800">
                      <div className="w-12 h-40 bg-zinc-800 rounded-md" />
                      <div className="w-12 h-56 bg-zinc-800 rounded-md" />
                      <div className="w-12 h-24 bg-zinc-800 rounded-md" />
                      <div className="w-12 h-48 bg-zinc-800 rounded-md" />
                      <div className="w-12 h-36 bg-zinc-800 rounded-md" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground px-2">
                      <div className="w-16 h-3.5 bg-zinc-800 rounded-md" />
                      <div className="w-16 h-3.5 bg-zinc-800 rounded-md" />
                      <div className="w-16 h-3.5 bg-zinc-800 rounded-md" />
                      <div className="w-16 h-3.5 bg-zinc-800 rounded-md" />
                      <div className="w-16 h-3.5 bg-zinc-800 rounded-md" />
                    </div>
                  </div>
                ) : leaderboardData.length > 0 ? (
                  <>
                    {activeChartTab === 'radar' && (
                       <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarChartData}>
                          <PolarGrid stroke="oklch(1 0 0 / 10%)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Top Model" dataKey="A" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.32} strokeWidth={2} />
                          <Radar name="Baseline" dataKey="B" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.14} strokeWidth={2} />
                          <Radar name="Claude 3.5" dataKey="C" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.14} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'latency' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} />
                          <Line type="monotone" dataKey="Latency" stroke="var(--chart-1)" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'tokens' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} barSize={18}>
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} cursor={{ fill: 'oklch(1 0 0 / 4%)' }} />
                          <Bar dataKey="TPS" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'cost' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} barSize={18}>
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} formatter={(value) => `$${value}`} cursor={{ fill: 'oklch(1 0 0 / 4%)' }} />
                          <Bar dataKey="Cost" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'costVsSpeed' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                          <XAxis dataKey="Cost" type="number" name="Cost ($)" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} />
                          <YAxis dataKey="TPS" type="number" name="Speed (TPS)" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                          <ZAxis dataKey="name" name="Model" />
                          <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }} cursor={{ strokeDasharray: '3 3' }} formatter={(val, name) => name === 'Cost ($)' ? `$${val}` : val} />
                          <Scatter name="Models" data={barChartData} fill="var(--chart-1)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                  </>
                ) : (
                  <div className="text-center text-xs py-12" style={{ color: 'var(--muted-foreground)' }}>
                    No data available. Run benchmarks to generate charts.
                  </div>
                )
              )}
            </div>
          </div>

          {/* 5. Live Leaderboard & Comparison Grid Split */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            
            {/* Live Leaderboard (Spans 7/12) */}
            <div className="lg:col-span-7 flex flex-col">
              <div id="leaderboard-section" className="panel flex h-full flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="num flex w-6 h-6 items-center justify-center rounded-lg text-[11px] font-semibold" style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)' }}>2</span>
                  <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    Live Leaderboard <span className="ml-2 text-xs font-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--muted-foreground)' }}>Overall score</span>
                  </h2>
                </div>

                <div className="mt-4 -mx-2 flex-1 overflow-y-auto pr-1" style={{ maxHeight: '420px' }}>
                  <table className="w-full border-separate border-spacing-y-1 px-2">
                    <thead>
                      <tr className="num text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
                        <th className="px-2 py-2 text-left font-normal">#</th>
                        <th className="px-2 py-2 text-left font-normal">Model</th>
                        <th className="px-2 py-2 text-right font-normal">Score</th>
                        <th className="hidden px-2 py-2 text-right font-normal sm:table-cell">TTFT</th>
                        <th className="px-2 py-2 text-right font-normal">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        Array(5).fill(0).map((_, idx) => (
                          <tr key={idx} className="animate-pulse" style={{ background: 'oklch(0.26 0.028 275 / 15%)' }}>
                            <td className="px-3 py-3 rounded-l-xl"><div className="h-3 bg-zinc-800 rounded-md w-6 animate-pulse" /></td>
                            <td className="px-2 py-3"><div className="h-3 bg-zinc-800 rounded-md w-28 sm:w-36 animate-pulse" /></td>
                            <td className="px-2 py-3"><div className="h-4 bg-zinc-800 rounded-md w-12 ml-auto animate-pulse" /></td>
                            <td className="hidden px-2 py-3 sm:table-cell"><div className="h-3 bg-zinc-800 rounded-md w-10 ml-auto animate-pulse" /></td>
                            <td className="px-3 py-3 rounded-r-xl"><div className="h-3 bg-zinc-800 rounded-md w-12 ml-auto animate-pulse" /></td>
                          </tr>
                        ))
                      ) : (
                        leaderboardData.map((row, idx) => (
                          <tr
                            key={idx}
                            className="group transition-colors"
                            style={{ background: 'oklch(0.26 0.028 275 / 30%)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'oklch(0.26 0.028 275 / 30%)'}
                          >
                            <td className="num rounded-l-xl px-3 py-2.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {(idx + 1).toString().padStart(2, '0')}
                            </td>
                            <td className="max-w-[190px] truncate px-2 py-2.5 text-xs" title={row.model}>
                              {row.model.split('/').pop()}
                            </td>
                            <td className="px-2 py-2.5 text-right">
                              <span
                                className="num inline-flex min-w-[46px] justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                                style={parseFloat(row.score) > 90
                                  ? { background: 'oklch(0.63 0.21 292 / 25%)', color: 'var(--primary-glow)' }
                                  : parseFloat(row.score) > 65
                                    ? { background: 'oklch(0.78 0.14 195 / 15%)', color: 'var(--accent)' }
                                    : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                                }
                              >
                                {row.score}
                              </span>
                            </td>
                            <td className="num hidden px-2 py-2.5 text-right text-xs sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>{row.ttft}</td>
                            <td className="num rounded-r-xl px-3 py-2.5 text-right text-xs" style={{ color: 'var(--muted-foreground)' }}>{row.latency}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison (Spans 5/12) */}
            <div className="lg:col-span-5 flex flex-col">
              <div id="compare-section" className="panel p-5 h-full flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="num flex w-6 h-6 items-center justify-center rounded-lg text-[11px] font-semibold" style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)' }}>3</span>
                  <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Compare Models</h2>
                </div>

                {isLoading ? (
                  <div className="mt-4 flex-1 flex flex-col justify-between animate-pulse space-y-4">
                    <div className="flex gap-3 justify-between">
                      <div className="h-8 bg-zinc-800 rounded-xl flex-1 animate-pulse" />
                      <div className="h-8 bg-zinc-800 rounded-xl flex-1 animate-pulse" />
                    </div>
                    <div className="space-y-4 pt-2">
                      {Array(5).fill(0).map((_, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between">
                            <div className="h-3 bg-zinc-800 rounded-md w-8 animate-pulse" />
                            <div className="h-3 bg-zinc-800 rounded-md w-24 animate-pulse" />
                            <div className="h-3 bg-zinc-800 rounded-md w-8 animate-pulse" />
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full w-full animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-center gap-3">
                      <select
                        value={compareModelA}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === compareModelB) {
                            setCompareModelB(compareModelA);
                          }
                          setCompareModelA(val);
                        }}
                        className="flex min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs transition-colors num appearance-none"
                        style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                      >
                        {leaderboardData.length > 0 ? leaderboardData.map(l => (
                          <option key={`a-${l.model}`} value={l.model}>{l.model}</option>
                        )) : <option value={compareModelA}>{compareModelA}</option>}
                      </select>
                      <span className="num text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted-foreground)' }}>vs</span>
                      <select
                        value={compareModelB}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === compareModelA) {
                            setCompareModelA(compareModelB);
                          }
                          setCompareModelB(val);
                        }}
                        className="flex min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs transition-colors num appearance-none"
                        style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                      >
                        {leaderboardData.length > 0 ? leaderboardData.map(l => (
                          <option key={`b-${l.model}`} value={l.model}>{l.model}</option>
                        )) : <option value={compareModelB}>{compareModelB}</option>}
                      </select>
                    </div>

                    {modelAData && modelBData ? (
                      <div className="mt-5 space-y-4">
                        {[
                          { label: 'Overall score', a: modelAData.score, b: modelBData.score, av: parseFloat(modelAData.score), bv: parseFloat(modelBData.score) },
                          { label: 'Accuracy', a: modelAData.accuracy, b: modelBData.accuracy, av: parseFloat(modelAData.accuracy), bv: parseFloat(modelBData.accuracy) },
                          { label: 'Tokens / sec', a: modelAData.tps, b: modelBData.tps, av: parseFloat(modelAData.tps), bv: parseFloat(modelBData.tps) },
                          { label: 'Peak Speed', a: modelAData.peakSpeed ? `${modelAData.peakSpeed} t/s` : 'N/A', b: modelBData.peakSpeed ? `${modelBData.peakSpeed} t/s` : 'N/A', av: parseFloat(modelAData.peakSpeed || 0), bv: parseFloat(modelBData.peakSpeed || 0) },
                          { label: 'Latency', a: modelAData.latency, b: modelBData.latency, av: parseFloat(modelAData.latency), bv: parseFloat(modelBData.latency), lower: true },
                          { label: 'Fastest Response', a: modelAData.minLatency, b: modelBData.minLatency, av: parseFloat(modelAData.minLatency), bv: parseFloat(modelBData.minLatency), lower: true },
                          { label: 'Time to First Token', a: modelAData.ttft, b: modelBData.ttft, av: parseFloat(modelAData.ttft), bv: parseFloat(modelBData.ttft), lower: true },
                          { label: 'Average Cost', a: modelAData.cost ? `$${modelAData.cost.toFixed(5)}` : 'N/A', b: modelBData.cost ? `$${modelBData.cost.toFixed(5)}` : 'N/A', av: parseFloat(modelAData.cost || 0), bv: parseFloat(modelBData.cost || 0), lower: true },
                        ].map(m => {
                          const total = m.av + m.bv || 1;
                          const aPct = m.lower ? (m.bv / total) * 100 : (m.av / total) * 100;
                          return (
                            <div key={m.label}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="num" style={{ color: 'var(--primary-glow)' }}>{m.a}</span>
                                <span style={{ color: 'var(--muted-foreground)' }}>{m.label}</span>
                                <span className="num" style={{ color: 'var(--accent)' }}>{m.b}</span>
                              </div>
                              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--secondary)' }}>
                                <span className="h-full rounded-full" style={{ width: `${aPct}%`, backgroundImage: 'var(--gradient-primary)' }} />
                                <span className="h-full flex-1" style={{ background: 'oklch(0.78 0.14 195 / 40%)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center text-xs py-6" style={{ color: 'var(--muted-foreground)' }}>
                        Not enough historical data to compare these models.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </section>

          {/* 6. Historical Analysis (Full Width) */}
          <div id="history-section" className="panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="num flex w-6 h-6 items-center justify-center rounded-lg text-[11px] font-semibold" style={{ backgroundImage: 'var(--gradient-primary)', color: 'var(--primary-foreground)' }}>4</span>
                <h2 className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  History
                </h2>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadCSVReport} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer" style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}>
                  <Download className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> CSV
                </button>
                <button onClick={() => setIsHistoryFilterOpen(!isHistoryFilterOpen)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer" style={{ backgroundImage: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)', color: 'var(--primary-foreground)' }}>
                  <Sliders className="w-3.5 h-3.5" /> Filter
                </button>
              </div>
            </div>

            {isHistoryFilterOpen && (
              <div className="flex flex-wrap gap-4 p-4 rounded-xl animate-fade-in" style={{ background: 'oklch(0.26 0.028 275 / 20%)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>Model</span>
                  <select
                    value={historyModelFilter}
                    onChange={e => setHistoryModelFilter(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs appearance-none num transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)' }}
                  >
                    {uniqueModels.map(m => (
                      <option key={m} value={m}>{m.split('/').pop()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>Date</span>
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs transition-colors num"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 50%)', color: 'var(--foreground)', colorScheme: 'dark' }}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setHistoryModelFilter('All');
                      setHistoryDateFilter('');
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    style={{ border: '1px solid var(--border)', background: 'oklch(0.26 0.028 275 / 60%)', color: 'var(--foreground)' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 overflow-x-auto overflow-y-auto pr-1" style={{ maxHeight: '350px' }}>
              <table className="w-full min-w-[720px] border-separate border-spacing-y-1">
                <thead>
                  <tr className="num text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted-foreground)' }}>
                    {['Date & Time', 'Model', 'Prompt type', 'Iterations', 'Score', 'Latency', 'Status', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, idx) => (
                      <tr key={idx} className="animate-pulse" style={{ background: 'oklch(0.26 0.028 275 / 15%)' }}>
                        <td className="px-3 py-3.5 rounded-l-xl"><div className="h-3.5 bg-zinc-800 rounded-md w-28 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-3.5 bg-zinc-800 rounded-md w-32 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-3.5 bg-zinc-800 rounded-md w-20 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-3.5 bg-zinc-800 rounded-md w-8 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-3.5 bg-zinc-800 rounded-md w-12 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-3.5 bg-zinc-800 rounded-md w-12 animate-pulse" /></td>
                        <td className="px-3 py-3.5"><div className="h-4 bg-zinc-800 rounded-md w-16 animate-pulse" /></td>
                        <td className="px-3 py-3.5 rounded-r-xl"><div className="h-4 bg-zinc-800 rounded-md w-4 ml-auto animate-pulse" /></td>
                      </tr>
                    ))
                  ) : filteredHistory.length > 0 ? (
                    filteredHistory.map((row, idx) => {
                      const dt = new Date(row.created_at || Date.now());
                      const dateStr = dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                      const timeStr = dt.toTimeString().split(' ')[0];
                      const dateTimeStr = `${dateStr} ${timeStr}`;
                      return (
                        <tr key={idx} className="transition-colors" style={{ background: 'oklch(0.26 0.028 275 / 30%)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'} onMouseLeave={e => e.currentTarget.style.background = 'oklch(0.26 0.028 275 / 30%)'}>
                          <td className="num rounded-l-xl px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{dateTimeStr}</td>
                          <td className="px-3 py-3 text-xs">{row.model.split('/').pop()}</td>
                          <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{row.task}</td>
                          <td className="num px-3 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{row.iterations || 3}</td>
                          <td className="num px-3 py-3 text-xs" style={{ color: 'var(--primary-glow)' }}>{row.score || 95.4}</td>
                          <td className="num px-3 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{(row.latency_ms / 1000).toFixed(2)}s</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px]" style={{ background: 'oklch(0.75 0.17 155 / 15%)', color: 'var(--success)' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                              Completed
                            </span>
                          </td>
                          <td className="rounded-r-xl px-3 py-3">
                            <button className="transition-colors" style={{ color: 'var(--muted-foreground)' }} onClick={() => setInspectedRow(row)}>
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <div className="flex flex-col items-center justify-center min-h-[150px] gap-2">
                          <span>No matching benchmark history found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          </div>{/* end relative mx-auto wrapper */}
        </main>

        <footer className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] font-semibold z-10 mt-auto text-center sm:text-left" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          <span>© {new Date().getFullYear()} AI Benchmark Analyzer Platform · Unified LLM Evaluation</span>
          <span className="num">v2.0 — Instrument Deck</span>
        </footer>
      </div>

    </div>
  );
}

// ─── Utility Functions ────────────────────────────────────────────────────────

async function runSingle({ model, task, taskId, prompt, apiKeys, sessionId, iteration, totalIterations, currentCount, totalCount }, appendLog, setProgress, setRunOutputs) {
  const res = await fetch('/api/run-single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, task, taskId, prompt, apiKeys, sessionId, iteration, totalIterations, currentCount, totalCount })
  });

  if (!res.ok || !res.body) {
    appendLog(`\n[${model}] HTTP error ${res.status}\n`);
    return { success: false, ttftMs: 0, durationMs: 0, tokens: 0, tokensPerSec: 0 };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastResult = null;
  let accumulatedText = '';
  let firstChunkReceived = false;

  setRunOutputs(prev => {
    const next = { ...prev };
    if (!next[taskId]) next[taskId] = { name: task, models: {} };
    next[taskId].models[model] = {
      text: '',
      success: false,
      streaming: true,
      ttftMs: 0,
      durationMs: 0,
      tokens: 0,
      speed: 0,
    };
    return next;
  });

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

        if (msg.type === 'log' && msg.text) {
          appendLog(msg.text);

          const isStatusLine = msg.text.includes(`[${model}]`) || msg.text.startsWith('\n');
          if (!isStatusLine) {
            if (!firstChunkReceived) firstChunkReceived = true;
            accumulatedText += msg.text;
            setRunOutputs(prev => {
              const next = { ...prev };
              if (!next[taskId]) next[taskId] = { name: task, models: {} };
              next[taskId].models[model] = {
                ...(next[taskId].models[model] || {}),
                text: accumulatedText,
                success: false,
                streaming: true,
                ttftMs: 0,
                durationMs: 0,
                tokens: 0,
                speed: 0,
              };
              return next;
            });
          }

        } else if (msg.type === 'progress') {
          setProgress(Math.round(msg.data || 0));

        } else if (msg.type === 'output') {
          if (msg.data) {
            const { taskId: tid, taskName, modelId, ...rest } = msg.data;
            setRunOutputs(prev => {
              const next = { ...prev };
              if (!next[tid]) next[tid] = { name: taskName, models: {} };
              next[tid].models[modelId] = { ...rest, streaming: false };
              return next;
            });
          }

        } else if (msg.type === 'result') {
          lastResult = msg.data;
        }
      } catch (_) { }
    }
  }

  if (lastResult) {
    return {
      success: (lastResult.successCount || 0) > 0,
      ttftMs: lastResult.avgTtft || 0,
      durationMs: lastResult.avgDuration || 0,
      tokens: lastResult.avgTokens || 0,
      tokensPerSec: lastResult.avgTokensPerSec || 0,
    };
  }

  return { success: false, ttftMs: 0, durationMs: 0, tokens: 0, tokensPerSec: 0 };
}
