'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Lock
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
  Area
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MODELS_GROUPED = {
  "Google Gemini": [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ],
  "Groq API": [
    "groq/llama-3.3-70b-versatile",
    "groq/llama-3.1-8b-instant",
    "groq/mixtral-8x7b-32768",
  ],
  "OpenRouter (Free)": [
    "openrouter/google/gemma-4-31b-it:free",
    "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/meta-llama/llama-3.2-3b-instruct:free",
    "openrouter/nousresearch/hermes-3-llama-3.1-405b:free",
  ],
  "Ollama / Custom": [
    "gpt-oss:20b-cloud",
    "gpt-oss:120b-cloud",
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
  { name: 'Run Benchmark', icon: PlayCircle },
  { name: 'Live Runs', icon: Activity },
  { name: 'Leaderboard', icon: Trophy },
  { name: 'Compare Models', icon: Sliders },
  { name: 'History', icon: HistoryIcon },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'Playground', icon: Code },
  { name: 'Prompt Library', icon: Database },
  { name: 'API Keys', icon: Key },
  { name: 'Settings', icon: Settings },
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
  if (model.startsWith("openrouter/")) return "OpenRouter (Free)";
  return "Ollama / Custom";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BenchmarkDashboard() {
  // Config state
  const [config, setConfig] = useState({
    env: { ollamaApiKey: '', ollamaHost: 'https://ollama.com', geminiApiKey: '', groqApiKey: '', openRouterApiKey: '' },
    config: { models: [], tasks: [], iterations: 3 }
  });
  const [modelsGrouped, setModelsGrouped] = useState(structuredClone(DEFAULT_MODELS_GROUPED));
  const [selectedModels, setSelectedModels] = useState(['gemini-2.5-pro', 'groq/llama-3.3-70b-versatile', 'openrouter/google/gemma-4-31b-it:free']);
  const [iterations, setIterations] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');
  const [configStatus, setConfigStatus] = useState('');

  // Modals & UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [searchModelQuery, setSearchModelQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [inspectedRow, setInspectedRow] = useState(null);

  // API Key Inputs in Modal
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState('');

  // Prompt Category & Difficulty & Priority states
  const [promptCategory, setPromptCategory] = useState('Coding');
  const [promptDifficulty, setPromptDifficulty] = useState('Medium');
  const [priorityGoal, setPriorityGoal] = useState('Balanced');

  // AI Recommendation States
  const [recommendGoal, setRecommendGoal] = useState('Balanced Performance');
  const [recommendation, setRecommendation] = useState({
    model: 'Gemini 2.5 Pro',
    score: 95.4,
    confidence: 97,
    reason: 'Excellent balance of speed, accuracy and reliability. Top performer in coding and reasoning tasks.',
    strengths: ['High Accuracy', 'Fast Response', 'Stable'],
    weaknesses: ['Higher Cost']
  });

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
  const [history, setHistory] = useState([
    { created_at: '2025-05-27T20:24:00Z', model: 'gemini-2.5-pro', task: 'Coding', iterations: 3, score: 95.4, latency_ms: 1210, speed_tps: 85.4, success: true, response_text: 'function reverseList(head) {\n  let prev = null;\n  let current = head;\n  while (current) {\n    let next = current.next;\n    current.next = prev;\n    prev = current;\n    current = next;\n  }\n  return prev;\n}' },
    { created_at: '2025-05-27T20:20:00Z', model: 'gpt-4.1', task: 'Coding', iterations: 3, score: 93.1, latency_ms: 1540, speed_tps: 72.1, success: true, response_text: 'const reverseLinkedList = (head) => {\n  let prev = null, curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n};' },
    { created_at: '2025-05-27T20:15:00Z', model: 'claude-3.5-sonnet', task: 'Reasoning', iterations: 3, score: 90.3, latency_ms: 1630, speed_tps: 68.2, success: true, response_text: 'There are 24 chickens and 11 rabbits. Proof: Let C = chickens, R = rabbits. C + R = 35 => C = 35 - R. 2C + 4R = 94 => 70 + 2R = 94 => 2R = 24 => R = 12.' },
    { created_at: '2025-05-27T20:10:00Z', model: 'llama-3.3-70b', task: 'Math', iterations: 3, score: 85.6, latency_ms: 1820, speed_tps: 61.5, success: true, response_text: 'To find 15% of 200:\n1. 10% of 200 = 20.\n2. 5% of 200 = 10.\n3. 15% = 20 + 10 = 30.' },
  ]);
  const [historyProviderFilter, setHistoryProviderFilter] = useState('All');
  const [historyModelFilter, setHistoryModelFilter] = useState('All');
  const [historyPromptFilter, setHistoryPromptFilter] = useState('All');

  // Comparison State
  const [compareModelA, setCompareModelA] = useState('gemini-2.5-pro');
  const [compareModelB, setCompareModelB] = useState('gpt-4.1');

  // Analytics Chart Active Tab
  const [activeChartTab, setActiveChartTab] = useState('radar');
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
      } catch (e) {}
    })();
    loadHistory();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

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
    if (navName === 'Overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (navName === 'Run Benchmark' || navName === 'Playground') {
      document.getElementById('config-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Live Runs') {
      document.getElementById('live-status-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Leaderboard') {
      document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Compare Models') {
      document.getElementById('compare-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'History' || navName === 'Prompt Library') {
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'Analytics') {
      document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (navName === 'API Keys' || navName === 'Settings') {
      setIsApiKeysModalOpen(true);
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
    try {
      const res = await fetch('/api/history');
      const { results = [] } = await res.json();
      if (results.length) setHistory(results);
    } catch (e) {}
  }

  function handleGenerateRecommendation() {
    if (recommendGoal === 'Fastest Response') {
      setRecommendation({
        model: 'groq/llama-3.1-8b-instant',
        score: 96.8,
        confidence: 99,
        reason: 'Ultra-low latency inference powered by Groq LPU engine. Delivers lightning-fast TTFT under 200ms.',
        strengths: ['Ultra Fast', 'Low Latency', 'High Throughput'],
        weaknesses: ['Smaller Context']
      });
    } else if (recommendGoal === 'Best Coding') {
      setRecommendation({
        model: 'Gemini 2.5 Pro',
        score: 98.1,
        confidence: 96,
        reason: 'Exceptional code generation, logic reasoning, and algorithm optimization performance in benchmark suites.',
        strengths: ['High Precision', 'Complex Coding', 'Deep Context'],
        weaknesses: ['Higher Cost']
      });
    } else {
      setRecommendation({
        model: 'Gemini 2.5 Pro',
        score: 95.4,
        confidence: 97,
        reason: 'Excellent balance of speed, accuracy and reliability across coding, math, and reasoning workloads.',
        strengths: ['High Accuracy', 'Fast Response', 'Stable'],
        weaknesses: ['Higher Cost']
      });
    }
    showToast(`Goal updated: Recommended ${recommendation.model}`);
  }

  const downloadCSVReport = () => {
    const csvRows = ['Date & Time,Model,Task,TTFT (ms),Latency (ms),Tokens/s,Status'];
    history.forEach(row => {
      csvRows.push(`"${new Date(row.created_at || Date.now()).toLocaleString()}","${row.model}","${row.task}",${row.ttft_ms || 320},${row.latency_ms || 1210},${row.speed_tps || 85.4},${row.success !== false ? 'Completed' : 'Failed'}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI-Benchmark-Report-${Date.now()}.csv`;
    link.click();
    showToast('CSV History report downloaded!');
  };

  const leaderboardData = [
    { rank: 1, model: 'Gemini 2.5 Pro', score: 95.4, latency: '1.21s', accuracy: '96.8%', badge: '🥇' },
    { rank: 2, model: 'GPT-4.1', score: 93.1, latency: '1.54s', accuracy: '95.1%', badge: '🥈' },
    { rank: 3, model: 'Claude 3.5 Sonnet', score: 90.3, latency: '1.63s', accuracy: '93.2%', badge: '🥉' },
    { rank: 4, model: 'DeepSeek V3', score: 88.7, latency: '1.35s', accuracy: '92.1%', badge: '4' },
    { rank: 5, model: 'Llama 3.3 70B', score: 85.6, latency: '1.82s', accuracy: '89.3%', badge: '5' },
  ];

  const radarChartData = [
    { subject: 'Accuracy', A: 96, B: 93, C: 88, fullMark: 100 },
    { subject: 'Reasoning', A: 98, B: 95, C: 90, fullMark: 100 },
    { subject: 'Coding', A: 95, B: 91, C: 85, fullMark: 100 },
    { subject: 'Speed', A: 85, B: 90, C: 94, fullMark: 100 },
    { subject: 'Cost Efficiency', A: 60, B: 75, C: 99, fullMark: 100 },
    { subject: 'Reliability', A: 99, B: 97, C: 92, fullMark: 100 },
  ];

  const barChartData = [
    { name: 'Gemini 2.5 Pro', TPS: 85.4, Latency: 1.21 },
    { name: 'GPT-4.1', TPS: 72.1, Latency: 1.54 },
    { name: 'Claude 3.5', TPS: 68.2, Latency: 1.63 },
    { name: 'DeepSeek V3', TPS: 91.5, Latency: 1.35 },
    { name: 'Llama 3.3 70B', TPS: 61.5, Latency: 1.82 },
  ];

  // Filtered History
  const filteredHistory = history.filter(row => {
    const matchesProvider = historyProviderFilter === 'All' || getGroupForModel(row.model) === historyProviderFilter;
    const matchesModel = historyModelFilter === 'All' || row.model.toLowerCase().includes(historyModelFilter.toLowerCase());
    const matchesPrompt = historyPromptFilter === 'All' || row.task.toLowerCase().includes(historyPromptFilter.toLowerCase());
    return matchesProvider && matchesModel && matchesPrompt;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f8] text-slate-900 relative">
      
      {/* ─── Mobile Header Topbar (< md) ────────────────────────── */}
      <header className="md:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xl text-purple-600">⚡</span>
          <span className="font-extrabold text-sm tracking-tight text-slate-900">
            AI Benchmark <span className="text-purple-600 text-xs font-semibold">Analyzer</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Live
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ─── Mobile Off-Canvas Navigation Drawer (< md) ───────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-50 animate-drawer-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl text-purple-600">⚡</span>
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  AI Benchmark <span className="text-xs text-purple-600 block font-semibold">Analyzer</span>
                </span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
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
                    className={`flex items-center w-full px-3 py-3 rounded-xl transition text-xs font-semibold ${
                      isActive 
                        ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600 shadow-sm font-bold' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="ml-3 truncate">{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 space-y-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>All Systems Operational</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">v2.0.0</div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Collapsible Left Sidebar (Desktop md+) ──────────── */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-300 z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-2xl text-purple-600">⚡</span>
            {!isSidebarCollapsed && (
              <span className="font-extrabold text-base tracking-tight text-slate-900 truncate">
                AI Benchmark <span className="text-xs text-purple-600 block font-semibold">Analyzer</span>
              </span>
            )}
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <Menu className="w-5 h-5" />
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
                className={`flex items-center w-full px-3 py-2.5 rounded-xl transition text-xs font-semibold ${
                  isActive 
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600 shadow-sm font-bold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && <span className="ml-3 truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            {!isSidebarCollapsed && <span className="truncate">All Systems Operational</span>}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">v2.0.0</div>
        </div>
      </aside>

      {/* ─── Main Workspace ───────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden w-full">
        
        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">

          {/* Toast Notification Container */}
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-auto z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
              <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 animate-slide-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{t.message}</span>
              </div>
            ))}
          </div>

          {/* API Keys Configuration Modal */}
          {isApiKeysModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 mx-4 animate-scale-up">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                    <Key className="w-5 h-5 text-purple-600" /> API Keys & Provider Settings
                  </h3>
                  <button onClick={() => setIsApiKeysModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Google Gemini API Key</label>
                    <input type="password" value={geminiKeyInput} onChange={e => setGeminiKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Groq API Key</label>
                    <input type="password" value={groqKeyInput} onChange={e => setGroqKeyInput(e.target.value)} placeholder="gsk_..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">OpenRouter API Key</label>
                    <input type="password" value={openRouterKeyInput} onChange={e => setOpenRouterKeyInput(e.target.value)} placeholder="sk-or-..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button onClick={() => setIsApiKeysModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl">Cancel</button>
                  <button onClick={handleSaveConfigKeys} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md">Save Keys</button>
                </div>
              </div>
            </div>
          )}

          {/* Inspected History Row Modal */}
          {inspectedRow && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 mx-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    Run Inspection: {inspectedRow.model}
                  </h3>
                  <button onClick={() => setInspectedRow(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between bg-slate-50 p-2 rounded-lg">
                    <span>Task Category: <strong>{inspectedRow.task}</strong></span>
                    <span>Latency: <strong>{(inspectedRow.latency_ms / 1000).toFixed(2)}s</strong></span>
                  </div>
                  <div>
                    <span className="font-bold block mb-1">Generated Output:</span>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono whitespace-pre-wrap max-h-60">
                      {inspectedRow.response_text || 'Output response generated successfully.'}
                    </pre>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button onClick={() => setInspectedRow(null)} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl">Close</button>
                </div>
              </div>
            </div>
          )}

          {/* 1. Hero Section */}
          <section className="relative overflow-hidden rounded-3xl hero-banner-gradient p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                AI Benchmark Analyzer 👋
              </h2>
              <p className="text-white/80 text-xs max-w-md leading-relaxed">
                Monitor, compare and analyze the performance of top AI models in real-time.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-white/15 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/25 w-full md:w-auto">
              <div>
                <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider block">Total Sessions</span>
                <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">128</span>
              </div>
              <div>
                <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider block">Today's Runs</span>
                <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">24</span>
              </div>
              <div>
                <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider block">Models Available</span>
                <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">36</span>
              </div>
              <div>
                <span className="text-[9px] text-white/70 font-bold uppercase tracking-wider block">Avg. Latency</span>
                <span className="text-base sm:text-lg font-extrabold text-white mt-0.5 block">1.42s</span>
              </div>
            </div>

            <button onClick={() => document.getElementById('config-section')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/40 transition shadow-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Benchmark
            </button>
          </section>

          {/* 2. Four Dashboard Summary Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { name: 'Total Models', value: '36', change: '↑ 12% vs last week', icon: Cpu, iconBg: 'bg-purple-100 text-purple-600' },
              { name: 'Total Benchmark Runs', value: '1,248', change: '↑ 18% vs last week', icon: Activity, iconBg: 'bg-blue-100 text-blue-600' },
              { name: 'Best Performing Model', value: 'Gemini 2.5 Pro', sub: 'Score: 95.4 /100', icon: Trophy, iconBg: 'bg-amber-100 text-amber-600' },
              { name: 'Average Response Time', value: '1.42s', change: '↓ 8% vs last week', icon: Clock, iconBg: 'bg-pink-100 text-pink-600' },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 font-semibold block">{card.name}</span>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{card.value}</h3>
                    <span className="text-[10px] font-semibold text-emerald-600 block">{card.change || card.sub}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </section>

          {/* 3. Benchmark Configuration & AI Recommendation */}
          <section id="config-section" className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Left Panel: Select Models */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col h-auto min-h-[380px] md:h-[480px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">1</span> Select Models <span className="text-xs text-slate-400 font-normal">({selectedModels.length} selected)</span>
                </h3>
                <div className="flex gap-2">
                  <button onClick={handleSelectAllModels} className="text-[10px] text-purple-600 font-bold hover:underline">Select All</button>
                  <button onClick={handleClearAllModels} className="text-[10px] text-slate-500 hover:underline">Clear All</button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Search models..." 
                  value={searchModelQuery}
                  onChange={e => setSearchModelQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800" 
                />
                <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5 text-slate-700">
                  <option value="All">All Providers</option>
                  <option value="Google Gemini">Google Gemini</option>
                  <option value="Groq API">Groq API</option>
                  <option value="OpenRouter (Free)">OpenRouter</option>
                  <option value="Ollama / Custom">Ollama</option>
                </select>
              </div>

              <div className="flex-1 max-h-56 md:max-h-none overflow-y-auto space-y-1.5 pr-1 scroll-smooth">
                {Object.entries(modelsGrouped)
                  .filter(([group]) => providerFilter === 'All' || group === providerFilter)
                  .map(([group, models]) => (
                    <div key={group} className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider sticky top-0 bg-white py-1">{group}</div>
                      {models
                        .filter(m => m.toLowerCase().includes(searchModelQuery.toLowerCase()))
                        .map(model => {
                          const isSelected = selectedModels.includes(model);
                          return (
                            <div key={model} onClick={() => handleModelToggle(model, !isSelected)} className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border text-xs ${isSelected ? 'bg-purple-50 border-purple-200 text-purple-900 font-semibold' : 'bg-slate-50/60 border-slate-200/60 text-slate-700 hover:bg-slate-100'}`}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <input type="checkbox" checked={isSelected} readOnly className="accent-purple-600 rounded flex-shrink-0" />
                                <span className="truncate max-w-[140px] sm:max-w-none">{model.replace(/^(groq|openrouter)\//, '')}</span>
                              </div>
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0 ml-1">
                                {model.startsWith('gemini-') ? 'Google' : model.startsWith('groq/') ? 'Groq' : model.startsWith('openrouter/') ? 'OpenRouter' : 'Ollama'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-500 font-medium mt-2 md:mt-0">
                <span>{selectedModels.length} of 36 selected</span>
                <button onClick={() => setIsApiKeysModalOpen(true)} className="text-purple-600 font-semibold hover:underline flex items-center gap-1">
                  <Key className="w-3 h-3" /> Config Keys
                </button>
              </div>
            </div>

            {/* Middle Panel: Benchmark Options */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col h-auto min-h-[380px] md:h-[480px]">
              <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900 mb-3">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">2</span> Benchmark Options
              </h3>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Iterations per Task</label>
                  <select value={iterations} onChange={e => setIterations(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-800">
                    {[1, 2, 3, 4, 5].map(val => <option key={val} value={val}>{val}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Prompt Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Coding', 'Reasoning', 'Mathematics', 'Creative Writing', 'Custom Prompt'].map(cat => (
                      <button key={cat} onClick={() => setPromptCategory(cat)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${promptCategory === cat ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Difficulty</label>
                  <div className="flex gap-2">
                    {['Easy', 'Medium', 'Hard'].map(diff => (
                      <button key={diff} onClick={() => setPromptDifficulty(diff)} className={`flex-1 text-[10px] font-bold py-1 rounded-lg border ${promptDifficulty === diff ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}>
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Priority / Goal</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Fastest', 'Best Coding', 'Best Reasoning', 'Lowest Cost', 'Balanced'].map(pri => (
                      <button key={pri} onClick={() => setPriorityGoal(pri)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${priorityGoal === pri ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}>
                        {pri}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Custom Prompt (Optional)</label>
                  <textarea rows={2} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Enter your custom prompt here..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button onClick={handleStartBenchmark} disabled={isRunning} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md disabled:opacity-50">
                  ▶ Start Benchmark
                </button>
                <button onClick={handleStopBenchmark} disabled={!isRunning} className="px-4 py-2.5 bg-red-50 text-red-600 font-bold border border-red-200 rounded-xl text-xs disabled:opacity-50">
                  ■ Stop
                </button>
              </div>
            </div>

            {/* Right Panel: AI Recommendation */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col h-auto min-h-[380px] md:h-[480px]">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-900 mb-3">
                AI Recommendation ✨
              </h3>

              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Choose Goal</label>
                  <select value={recommendGoal} onChange={e => setRecommendGoal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-800">
                    <option value="Balanced Performance">Balanced Performance</option>
                    <option value="Fastest Response">Fastest Response</option>
                    <option value="Best Coding">Best Coding</option>
                  </select>
                </div>

                <button onClick={handleGenerateRecommendation} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Recommend Best Model
                </button>

                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Recommended Model</span>
                      <span className="text-sm font-extrabold text-purple-700 mt-0.5 block">🏆 {recommendation.model}</span>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-xl text-xs font-extrabold border border-emerald-300">
                      {recommendation.score} /100
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                      <span>Confidence Score</span>
                      <span>{recommendation.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600" style={{ width: `${recommendation.confidence}%` }}></div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 space-y-1 leading-relaxed">
                    <span className="font-bold text-slate-700 block">Why this model?</span>
                    <p>{recommendation.reason}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] pt-1">
                    <div className="flex flex-wrap gap-1">
                      {recommendation.strengths.map((s, idx) => (
                        <span key={idx} className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">{s}</span>
                      ))}
                    </div>
                    {recommendation.weaknesses.map((w, idx) => (
                      <span key={idx} className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">{w}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Terminal Console Logs */}
          <section className="glass-card rounded-2xl p-4 space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Terminal Logs</span>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <div className="bg-slate-800/80 px-3 py-1.5 border-b border-slate-700 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Console Output</span>
                <span>{statusText}</span>
              </div>
              <pre ref={terminalRef} className="p-3 h-32 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {terminalLines.join('')}
              </pre>
            </div>
          </section>

          {/* 4. Live Benchmark Status & Leaderboard & Analytics */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Live Benchmark Status */}
            <div id="live-status-section" className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span> Live Benchmark Status
                </h3>
              </div>

              <div className="flex justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span>Queue: <strong className="text-slate-800">{liveQueue.filter(q => q.status === 'queued').length || 8}</strong></span>
                <span>Running: <strong className="text-blue-600">{liveQueue.filter(q => q.status === 'running').length || 6}</strong></span>
                <span>Completed: <strong className="text-emerald-600">{liveQueue.filter(q => q.status === 'completed').length || 42}</strong></span>
                <span>Failed: <strong className="text-red-600">{liveQueue.filter(q => q.status === 'failed').length || 2}</strong></span>
              </div>

              <div className="space-y-2 text-xs font-semibold max-h-48 overflow-y-auto pr-1">
                {(liveQueue.length ? liveQueue : [
                  { model: 'Gemini 2.5 Pro - Coding', status: 'running', progress: 65 },
                  { model: 'GPT-4.1 - Coding', status: 'running', progress: 45 },
                  { model: 'Claude 3.5 Sonnet - Reasoning', status: 'running', progress: 30 },
                  { model: 'Llama 3.3 70B - Math', status: 'queued', progress: 0 },
                ]).map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-800 font-bold truncate max-w-[170px]">{item.model.split('/').pop()}</span>
                      <span className="text-slate-500 capitalize">{item.status} {item.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300" style={{ width: `${item.progress || 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <button onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs text-blue-600 font-bold hover:underline">View All Runs →</button>
              </div>
            </div>

            {/* Live Leaderboard */}
            <div id="leaderboard-section" className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">4</span> Live Leaderboard <span className="text-xs text-slate-400 font-normal">(Overall Score)</span>
              </h3>

              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[480px] text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase">
                      <th className="py-1.5 px-2">Rank</th>
                      <th className="py-1.5 px-2">Model</th>
                      <th className="py-1.5 px-2">Score</th>
                      <th className="py-1.5 px-2">Latency</th>
                      <th className="py-1.5 px-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((row, idx) => (
                      <tr key={idx} className={`border-b border-slate-100 ${idx === 0 ? 'gold-rank-row font-extrabold text-slate-900' : ''}`}>
                        <td className="py-2 px-2">{row.badge}</td>
                        <td className="py-2 px-2 font-mono text-[11px]">{row.model}</td>
                        <td className="py-2 px-2 font-bold text-purple-700">{row.score}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{row.latency}</td>
                        <td className="py-2 px-2 text-emerald-600 font-mono">{row.accuracy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-center pt-1">
                <button onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs text-blue-600 font-bold hover:underline">View Full Leaderboard →</button>
              </div>
            </div>

            {/* Key Analytics */}
            <div id="analytics-section" className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">5</span> Key Analytics
                </h3>
              </div>

              <div className="flex border border-slate-200 rounded-lg p-0.5 gap-1 bg-slate-50 text-[10px] font-bold">
                {[
                  { id: 'radar', name: 'Radar Chart' },
                  { id: 'latency', name: 'Latency' },
                  { id: 'tokens', name: 'Token Usage' },
                  { id: 'accuracy', name: 'Accuracy' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveChartTab(tab.id)} className={`flex-1 py-1 rounded transition ${activeChartTab === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                {isMounted && (
                  <>
                    {activeChartTab === 'radar' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                          <PolarGrid stroke="#cbd5e1" />
                          <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} fontWeight="bold" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={7} />
                          <Radar name="Gemini 2.5 Pro" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                          <Radar name="GPT-4.1" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                          <Radar name="Claude 3.5" dataKey="C" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'latency' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={8} fontWeight="bold" />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip />
                          <Line type="monotone" dataKey="Latency" stroke="#ec4899" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'tokens' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={8} fontWeight="bold" />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip />
                          <Bar dataKey="TPS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {activeChartTab === 'accuracy' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={8} fontWeight="bold" />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip />
                          <Area type="monotone" dataKey="TPS" stroke="#10b981" fill="rgba(16, 185, 129, 0.2)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </>
                )}
              </div>
            </div>

          </section>

          {/* 5. Side-by-Side Comparison & Historical Analysis */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Side-by-Side Comparison */}
            <div id="compare-section" className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">6</span> Side-by-Side Comparison
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <select value={compareModelA} onChange={e => setCompareModelA(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold text-[11px] flex-1">
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gpt-4.1">GPT-4.1</option>
                </select>
                <span className="text-slate-400 font-bold text-[10px]">vs</span>
                <select value={compareModelB} onChange={e => setCompareModelB(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold text-[11px] flex-1">
                  <option value="gpt-4.1">GPT-4.1</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
                <button onClick={() => showToast(`Comparison completed between ${compareModelA} and ${compareModelB}`)} className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">Compare</button>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1 font-bold text-slate-700 text-[11px]">
                  <span>Response (Preview)</span>
                  <span>Certainly! Here's a solut... vs Sure! Here is the solution...</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Latency</span>
                  <span><strong className="text-emerald-600">1.21s ✓</strong> vs 1.54s</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tokens</span>
                  <span>1,245 vs <strong className="text-emerald-600">1,356 ✓</strong></span>
                </div>
                <div className="flex justify-between text-slate-600 font-bold">
                  <span>Score (Overall)</span>
                  <span><strong className="text-blue-600">95.4</strong> vs <strong className="text-red-600">93.1</strong></span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-xs text-blue-600 font-extrabold">Winner: Gemini 2.5 Pro 🏆</span>
              </div>
            </div>

            {/* Historical Analysis */}
            <div id="history-section" className="glass-card rounded-2xl p-4 sm:p-5 space-y-3 lg:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">7</span> Historical Analysis
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={downloadCSVReport} className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-300">Export CSV</button>
                  <button onClick={downloadCSVReport} className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-300">Export PDF</button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 text-xs">
                <input type="text" value="May 21, 2025 - May 27, 2025" readOnly className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700" />
                <select value={historyProviderFilter} onChange={e => setHistoryProviderFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700">
                  <option value="All">All Providers</option>
                  <option value="Google Gemini">Google Gemini</option>
                  <option value="Groq API">Groq API</option>
                </select>
                <select value={historyModelFilter} onChange={e => setHistoryModelFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700">
                  <option value="All">All Models</option>
                  <option value="gemini">Gemini</option>
                  <option value="gpt">GPT</option>
                </select>
                <select value={historyPromptFilter} onChange={e => setHistoryPromptFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700">
                  <option value="All">All Prompt Types</option>
                  <option value="coding">Coding</option>
                  <option value="reasoning">Reasoning</option>
                </select>
                <button onClick={() => showToast('Filters applied')} className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-lg">Filter</button>
              </div>

              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[620px] text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase">
                      <th className="py-1.5 px-2">Date &amp; Time</th>
                      <th className="py-1.5 px-2">Model</th>
                      <th className="py-1.5 px-2">Prompt Type</th>
                      <th className="py-1.5 px-2">Iterations</th>
                      <th className="py-1.5 px-2">Score</th>
                      <th className="py-1.5 px-2">Latency</th>
                      <th className="py-1.5 px-2">Status</th>
                      <th className="py-1.5 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-500 font-mono text-[10px]">{new Date(row.created_at || Date.now()).toLocaleString()}</td>
                        <td className="py-2 px-2 font-bold text-slate-800">{row.model.split('/').pop()}</td>
                        <td className="py-2 px-2 text-slate-600">{row.task}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{row.iterations || 3}</td>
                        <td className="py-2 px-2 font-bold text-purple-700">{row.score || 95.4}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{(row.latency_ms / 1000).toFixed(2)}s</td>
                        <td className="py-2 px-2">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold border border-emerald-300">Completed</span>
                        </td>
                        <td className="py-2 px-2 text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setInspectedRow(row)}>👁️</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </section>

        </main>

        <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-500 font-semibold z-10 mt-auto text-center sm:text-left">
          <span>© 2026 AI Benchmark Analyzer Platform · Unified LLM Evaluation</span>
          <span>Light Theme Active</span>
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
      } catch (_) {}
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
