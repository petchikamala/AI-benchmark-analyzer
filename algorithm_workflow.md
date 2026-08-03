# Algorithm Workflow Diagrams — AI Benchmark Analyzer

---

## Algorithm 1 — FIFO Queue (Batch Execution Queue)

```mermaid
flowchart TD
    A(["User Clicks\n▶ Start Evaluation"])
    A --> B["Read selected models M\nand iterations I"]
    B --> C["Calculate Total Tasks\nN = M × I"]
    C --> D["Build FIFO Queue Array\n(push in order: model × iteration)"]

    D --> E1["Queue Item 1\nModel A · Iteration 1 · status: queued"]
    D --> E2["Queue Item 2\nModel A · Iteration 2 · status: queued"]
    D --> E3["Queue Item 3\nModel B · Iteration 1 · status: queued"]
    D --> E4["Queue Item N\nModel M · Iteration I · status: queued"]

    E1 --> F["FIFO Loop Starts\n(First-In = First-Out)"]
    E2 --> F
    E3 --> F
    E4 --> F

    F --> G["Dequeue Next Item\n→ status: running"]
    G --> H["POST /api/run-single\n(SSE stream begins)"]
    H --> I{"Run\nSuccessful?"}
    I -- Yes --> J["status: completed ✅\nprogress: 100%"]
    I -- No  --> K["status: failed ❌\nprogress: 100%"]
    J --> L{"More items\nin queue?"}
    K --> L
    L -- Yes --> G
    L -- No  --> M(["Queue Empty\n→ Benchmark Complete 🏁"])
```

---

## Algorithm 2 — Latency Calculation

```mermaid
flowchart TD
    A(["POST /api/run-single\nreceived"])
    A --> B["Record startTime\nt_start = Date.now()"]
    B --> C["Send Prompt to AI Provider\n(Gemini / Groq / OpenRouter / Ollama)"]
    C --> D["Open SSE Stream\n(token chunks arrive)"]

    D --> E{"First non-empty\nchunk received?"}
    E -- No  --> D
    E -- Yes --> F["Record firstTokenTime\nt_first = Date.now()"]

    F --> G["Continue reading stream\n(accumulate all tokens)"]
    G --> H{"Stream\nclosed?"}
    H -- No  --> G
    H -- Yes --> I["Record endTime\nt_end = Date.now()"]

    I --> J["Calculate Metrics"]

    J --> K["TTFT = t_first − t_start\n(Time to First Token in ms)"]
    J --> L["Total Latency = max(1, t_end − t_start)\n(Wall Clock Duration in ms)"]
    J --> M["T_gen = (Latency − TTFT) / 1000\n(Pure generation time in seconds)"]
    J --> N["TPS = Tokens / T_gen\n(Tokens Per Second)"]

    K --> O["Send output event\n{ttftMs, durationMs, speed, tokens}"]
    L --> O
    M --> O
    N --> O

    O --> P(["Metrics sent to\nFrontend via SSE ✅"])
```

---

## Algorithm 3 — Heuristic-Based Model Selection

```mermaid
flowchart TD
    A(["User selects\nPriority Goal"])

    A --> B{"Goal =\n'Fastest Response'?"}
    B -- Yes --> C["Recommend:\ngroq/llama-3.1-8b-instant\nScore: 96.8 | Confidence: 99%\n\nReason: Ultra-low TTFT < 200ms\nGroq LPU hardware advantage"]

    B -- No --> D{"Goal =\n'Best Coding'?"}
    D -- Yes --> E["Recommend:\nGemini 2.5 Pro\nScore: 98.1 | Confidence: 96%\n\nReason: Best code generation,\nlogic reasoning, deep context"]

    D -- No --> F{"Goal =\n'Balanced\nPerformance'?"}
    F -- Yes --> G["Recommend:\nGemini 2.5 Pro\nScore: 95.4 | Confidence: 97%\n\nReason: Optimal tradeoff across\nspeed, accuracy, reliability"]

    C --> H["Display Recommendation Card\n{model, score, confidence,\nstrengths, weaknesses}"]
    E --> H
    G --> H

    H --> I(["User sees Best\nModel for their Goal ✅"])

    style C fill:#dbeafe,stroke:#3b82f6
    style E fill:#ede9fe,stroke:#8b5cf6
    style G fill:#d1fae5,stroke:#10b981
```

---

## Algorithm 4 — Scoring & Ranking

```mermaid
flowchart TD
    A(["Benchmark Run\nCompletes for all Models"])

    A --> B["Collect per-run metrics\nfor each model"]

    B --> C["Filter successful runs only\n(success === true)"]

    C --> D["Aggregate metrics\nacross K successful iterations"]

    D --> D1["avgTTFT = Σ(TTFT_k) / K"]
    D --> D2["avgDuration = Σ(Duration_k) / K"]
    D --> D3["avgTPS = Σ(TPS_k) / K"]
    D --> D4["successRate = K / I × 100%"]

    D1 --> E["Compute Composite Score\nfor each model"]
    D2 --> E
    D3 --> E
    D4 --> E

    E --> F["Score factors:\n• Accuracy / Success Rate\n• Response Latency (lower = better)\n• Throughput TPS (higher = better)\n• Reasoning Quality"]

    F --> G["Sort models by Score\n(Descending — highest first)"]

    G --> H["Assign Rank\n#1 → #N"]

    H --> I1["🥇 Rank 1 · Gemini 2.5 Pro · 95.4"]
    H --> I2["🥈 Rank 2 · GPT-4.1 · 93.1"]
    H --> I3["🥉 Rank 3 · Claude 3.5 · 90.3"]
    H --> I4["Rank 4..N · other models"]

    I1 --> J["Render Leaderboard Table"]
    I2 --> J
    I3 --> J
    I4 --> J

    J --> K["Linear Scan O(n)\nto find Best Model"]
    K --> L["Update Hero Banner\n'Best Performing: Gemini 2.5 Pro'"]

    J --> M(["Display in UI:\n✅ Leaderboard\n✅ Analytics Charts\n✅ Compare Section"])

    style I1 fill:#fef3c7,stroke:#f59e0b
    style I2 fill:#e2e8f0,stroke:#94a3b8
    style I3 fill:#fed7aa,stroke:#f97316
```

---

## Combined — End-to-End Algorithm Flow

```mermaid
flowchart LR
    User(["👤 User"])

    subgraph ALG3["Algorithm 3\nHeuristic Model Selection"]
        HS["Select Goal\n→ Get Recommendation"]
    end

    subgraph ALG1["Algorithm 1\nFIFO Queue"]
        Q1["Build ordered queue\nM models × I iterations"]
        Q2["Process FIFO\none by one"]
    end

    subgraph ALG2["Algorithm 2\nLatency Calculation"]
        LC1["t_start = Date.now()"]
        LC2["→ AI Provider API"]
        LC3["t_first = first token"]
        LC4["t_end = stream close"]
        LC5["TTFT · Latency · TPS"]
    end

    subgraph ALG4["Algorithm 4\nScoring & Ranking"]
        SR1["Aggregate avg metrics"]
        SR2["Compute Score"]
        SR3["Sort & Rank models"]
        SR4["Leaderboard Table"]
    end

    User --> ALG3
    ALG3 --> ALG1
    ALG1 --> ALG2
    ALG2 --> ALG4
    ALG4 --> User
```
