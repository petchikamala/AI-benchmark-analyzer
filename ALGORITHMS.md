# Algorithms Documentation - AI Benchmark Analyzer

This document details all algorithms, mathematical formulations, processing pipelines, and heuristic decision logic implemented in the **AI Benchmark Analyzer** platform.

---

## Table of Contents
1. [Real-Time Metrics & Latency Calculation Algorithm](#1-real-time-metrics--latency-calculation-algorithm)
2. [Multi-Provider Stream Routing Algorithm](#2-multi-provider-stream-routing-algorithm)
3. [Iterative Batch Execution Queue Algorithm](#3-iterative-batch-execution-queue-algorithm)
4. [Graceful Simulation Fallback Algorithm](#4-graceful-simulation-fallback-algorithm)
5. [Multi-Tier Data Persistence Algorithm](#5-multi-tier-data-persistence-algorithm)
6. [AI Recommendation & Model Selection Heuristic](#6-ai-recommendation--model-selection-heuristic)
7. [Client-Side SSE Stream Parser & State Buffer Algorithm](#7-client-side-sse-stream-parser--state-buffer-algorithm)

---

## 1. Real-Time Metrics & Latency Calculation Algorithm

**File Location:** [`app/api/run-single/route.js`](file:///d:/PROJECT/ai-benchmark/app/api/run-single/route.js#L49-L264)

### Purpose
To measure execution performance of Large Language Models (LLMs) during streaming responses with millisecond precision.

### Mathematical Formulations & Steps

1. **Start Benchmark Clock ($t_{\text{start}}$)**:
   Recorded in Unix epoch milliseconds prior to initiating HTTP fetch request:
   $$t_{\text{start}} = \text{Date.now()}$$

2. **Time to First Token ($\text{TTFT}$)**:
   Timestamp recorded when the first non-empty text token chunk is received from the server-sent event (SSE) stream:
   $$t_{\text{first}} = \text{Date.now()}$$
   $$\text{TTFT (ms)} = t_{\text{first}} - t_{\text{start}}$$

3. **Wall Clock Latency / Total Duration ($D$)**:
   Total duration elapsed from stream initiation to stream closure ($t_{\text{end}}$):
   $$D = \max(1, t_{\text{end}} - t_{\text{start}})$$

4. **Generation Duration ($T_{\text{gen}}$)**:
   Pure token generation time excluding initial connection setup and time to first token:
   $$T_{\text{gen}} = \max\left(0.05, \frac{D - \text{TTFT}}{1000}\right) \quad [\text{seconds}]$$

5. **Token Count ($N_{\text{tokens}}$) & Throughput Speed ($\text{TPS}$)**:
   If the API does not provide explicit usage metadata (`parsed.usageMetadata`), token count is estimated via character length ($\approx 4$ characters per token):
   $$N_{\text{tokens}} = \max\left(15, \left\lfloor \frac{\text{length}(S_{\text{output}})}{4} \right\rfloor\right)$$
   $$\text{TPS (Tokens/sec)} = \frac{N_{\text{tokens}}}{T_{\text{gen}}}$$

---

## 2. Multi-Provider Stream Routing Algorithm

**File Location:** [`app/api/run-single/route.js`](file:///d:/PROJECT/ai-benchmark/app/api/run-single/route.js#L86-L251)

### Purpose
Dispatches prompts to the appropriate model provider (Google Gemini, Groq, OpenRouter, or Ollama) using prefix pattern matching and transforms incoming vendor stream formats into a unified SSE frame format.

### Flowchart Logic
```
                  [ Incoming Request (model, prompt) ]
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
     Model Prefix Check                      Check Provider Key
               │                                       │
     ├─ "gemini-" ──────► Google API Stream  ──────────┼── Missing Key? ──► Simulation Fallback
     ├─ "groq/" ────────► Groq Chat Completion ────────┤
     ├─ "openrouter/" ──► OpenRouter Stream API ───────┤
     └─ default ────────► Ollama / Local Fallback ─────┘
```

---

## 3. Iterative Batch Execution Queue Algorithm

**File Location:** [`app/page.js`](file:///d:/PROJECT/ai-benchmark/app/page.js#L324-L428)

### Purpose
Executes $I$ iterations across $M$ selected models, calculating live completion percentages and statistical averages across successful iterations.

### Queue Formulation
Total scheduled benchmark tasks $N_{\text{total}}$:
$$N_{\text{total}} = M \times I$$

### Live Progress Calculation
As iteration $i$ of model $m$ progresses with internal stream progress $P_{\text{stream}} \in [0, 100]$:
$$\text{Overall Progress \%} = \min\left(100, \left\lfloor \frac{C_{\text{completed}}}{N_{\text{total}}} \times 100 + \frac{P_{\text{stream}}}{N_{\text{total}}} \right\rfloor\right)$$

### Iteration Statistics Aggregation
For $K \le I$ successful model runs:
$$\bar{X}_{\text{TTFT}} = \frac{1}{K} \sum_{k=1}^{K} \text{TTFT}_k, \quad \bar{X}_{\text{Duration}} = \frac{1}{K} \sum_{k=1}^{K} D_k, \quad \bar{X}_{\text{TPS}} = \frac{1}{K} \sum_{k=1}^{K} \text{TPS}_k$$

---

## 4. Graceful Simulation Fallback Algorithm

**File Location:** [`app/api/run-single/route.js`](file:///d:/PROJECT/ai-benchmark/app/api/run-single/route.js#L57-L83)

### Purpose
Provides offline mock execution when API keys are missing or provider endpoints return non-200 responses.

### Chunking & Jitter Algorithm
1. Category lookup extracts response template according to prompt category (Coding, Reasoning, Mathematics, Creative).
2. Substring segmentation into 8-character chunks:
   $$C = \{ s[8i : 8i+8] \mid 0 \le i < \lceil \text{len}(s)/8 \rceil \}$$
3. Asynchronous non-blocking jitter loop:
   $$\text{Delay}_{\text{chunk}} = 30\text{ms} + \text{Random}(0, 30\text{ms})$$

---

## 5. Multi-Tier Data Persistence Algorithm

**File Locations:** 
- [`app/api/config/route.js`](file:///d:/PROJECT/ai-benchmark/app/api/config/route.js#L44-L82)
- [`app/api/run-single/route.js`](file:///d:/PROJECT/ai-benchmark/app/api/run-single/route.js#L295-L328)

### Strategy Architecture
```
    ┌──────────────────────────────────────────────────┐
    │ Tier 1: Supabase Cloud Database (PostgreSQL)    │
    └─────────────────────────┬────────────────────────┘
                              │ (On connection error / missing client)
                              ▼
    ┌──────────────────────────────────────────────────┐
    │ Tier 2: Local JSON Backup Storage                │
    │ (config.json / results.json)                     │
    └─────────────────────────┬────────────────────────┘
                              │ (On file system error)
                              ▼
    ┌──────────────────────────────────────────────────┐
    │ Tier 3: In-Memory Default State Fallback         │
    └──────────────────────────────────────────────────┘
```

---

## 6. AI Recommendation & Model Selection Heuristic

**File Location:** [`app/page.js`](file:///d:/PROJECT/ai-benchmark/app/page.js#L446-L476)

### Decision Logic Matrix

| Goal Selected | Recommended Model | Priority Weighted Factors | Key Strength |
| :--- | :--- | :--- | :--- |
| **Fastest Response** | `groq/llama-3.1-8b-instant` | Minimized TTFT, Maximum TPS | Sub-200ms latency, high throughput |
| **Best Coding** | `gemini-2.5-pro` | Reasoning score, Context window, Accuracy | Code syntax precision & algorithmic logic |
| **Balanced Performance** | `gemini-2.5-pro` | Harmonic mean of Speed, Accuracy, Reliability | Optimal tradeoff across workloads |

---

## 7. Client-Side SSE Stream Parser & State Buffer Algorithm

**File Location:** [`app/page.js`](file:///d:/PROJECT/ai-benchmark/app/page.js#L1281-L1384)

### Buffer Parsing Algorithm
1. Reads raw byte chunks via `ReadableStreamDefaultReader` and decodes text buffer.
2. Splits buffer by newline delimiter `\n` and pops incomplete trailing frame.
3. For each line matching `data: { JSON }`:
   - `msg.type === 'log'` $\rightarrow$ Appends raw chunk to terminal state buffer.
   - `msg.type === 'progress'` $\rightarrow$ Updates live progress bar state.
   - `msg.type === 'output'` $\rightarrow$ Saves structured output text and execution stats to state dictionary.
   - `msg.type === 'result'` $\rightarrow$ Stores final aggregated metrics summary.
