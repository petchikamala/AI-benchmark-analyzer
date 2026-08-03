# 🗺️ AI Benchmark Analyzer — Complete Project Workflow Diagram

---

## 1. Full System Architecture

```mermaid
flowchart TD
    subgraph Browser["🌐 Browser (Client-Side)"]
        direction TB
        P1["📄 / — Dashboard Page\napp/page.js"]
        P2["🎮 /playground — Playground Page\napp/playground/page.js"]
    end

    subgraph NextJS["⚙️ Next.js 16 Server (App Router)"]
        direction TB
        L["app/layout.js\n(Root HTML Shell)"]
        subgraph API["API Routes — app/api/"]
            A1["/api/config\nGET · POST"]
            A2["/api/models\nPOST"]
            A3["/api/run-single\nPOST → SSE Stream"]
            A4["/api/history\nGET"]
        end
    end

    subgraph Providers["☁️ External AI Providers"]
        PR1["✨ Google Gemini\ngenerativelanguage.googleapis.com"]
        PR2["♾️ Groq API\napi.groq.com"]
        PR3["💎 OpenRouter\nopenrouter.ai"]
        PR4["🦙 Ollama\nlocalhost:11434"]
    end

    subgraph Storage["🗄️ Storage Layer"]
        S1[("☁️ Supabase\nPostgres Cloud DB\n• configs table\n• benchmark_results table")]
        S2[("📄 config.json\nLocal File")]
        S3[("📄 results.json\nLocal File")]
        S4[("💾 In-Memory\nDefault State")]
    end

    Browser <-->|"fetch() + SSE"| NextJS
    NextJS <-->|"HTTPS REST"| Providers
    NextJS <-->|"Read / Write"| Storage
```

---

## 2. App Startup & Initialization

```mermaid
flowchart TD
    Start(["👤 User opens\nhttp://localhost:3000"])
    Start --> Layout["app/layout.js\nRenders HTML shell + globals.css"]
    Layout --> Page["app/page.js\nBenchmarkDashboard() mounts"]

    Page --> UE["useEffect on Mount"]

    UE --> C1["GET /api/config"]
    C1 --> C2{"Supabase\navailable?"}
    C2 -- Yes --> C3["Query configs table\nid = 'active_config'"]
    C3 -- Found --> C4["✅ Load from Supabase"]
    C3 -- Not found --> C5["Read config.json\n(local file)"]
    C2 -- No --> C5
    C5 -- Found --> C6["✅ Load from file"]
    C5 -- Not found --> C7["✅ Use in-memory defaults"]

    C4 --> Apply["Apply to state:\n• selectedModels\n• iterations\n• API Keys"]
    C6 --> Apply
    C7 --> Apply

    Apply --> H["GET /api/history\nloadHistory()"]
    H --> H2{"Supabase\navailable?"}
    H2 -- Yes --> H3["SELECT * FROM benchmark_results\nORDER BY created_at DESC LIMIT 200"]
    H2 -- No --> H4["Read results.json\n(local file)"]
    H3 --> H5["✅ Populate History Table"]
    H4 --> H5

    H5 --> Ready(["🟢 Dashboard Ready\nAll sections visible"])
```

---

## 3. Navigation & Page Routing

```mermaid
flowchart LR
    User(["👤 User"])

    User --> Nav["Sidebar Navigation\n9 Nav Items"]

    Nav --> N1["🏠 Overview\n→ scrollTo top"]
    Nav --> N2["▶️ Run Benchmark\n→ #config-section"]
    Nav --> N3["📡 Live Runs\n→ #live-status-section"]
    Nav --> N4["🏆 Leaderboard\n→ #leaderboard-section"]
    Nav --> N5["⚖️ Compare Models\n→ #compare-section"]
    Nav --> N6["📜 History\n→ #history-section"]
    Nav --> N7["📊 Analytics\n→ #analytics-section"]
    Nav --> N8["📚 Prompt Library\n→ #history-section"]
    Nav --> N9["🎮 Playground\n→ /playground route"]

    N9 --> PG["app/playground/page.js\nFull Playground UI"]

    PG --> PGBack["← Back to Dashboard\nLink /"]
```

---

## 4. Configuration & API Key Setup

```mermaid
flowchart TD
    User(["👤 User\nenters API Keys"])

    User --> Form["Settings Form\n• Gemini API Key\n• Groq API Key\n• OpenRouter API Key\n• Ollama Host URL\n• Iterations (default 3)"]

    Form --> Post["POST /api/config\n{env, config}"]

    Post --> SB{"Supabase\nconnected?"}
    SB -- Yes --> SBW["Supabase UPSERT\nconfigs table\nid = 'active_config'"]
    SB -- No  --> Skip["Skip Supabase write"]

    SBW --> FileW["Write config.json\n(always written as backup)"]
    Skip --> FileW

    FileW --> OK["✅ 200 OK\n{success: true}"]
    OK --> Toast["🔔 Toast: 'API Keys saved!'"]
    Toast --> Ready(["Config Saved\nReady to Benchmark"])
```

---

## 5. Complete Benchmark Execution Pipeline

```mermaid
flowchart TD
    A(["▶️ User clicks\nStart Evaluation"])
    A --> V{"Models\nselected?"}
    V -- No --> Err["❌ Toast Error\n'Select at least one model'"]
    V -- Yes --> B

    B["Generate Session ID\nInitialize state:\n• progress = 0\n• runResults = []\n• terminalLines = []"]

    B --> Q["Build FIFO Queue\nM models × I iterations\nAll items status: queued"]

    Q --> Loop["🔁 FIFO Loop\nfor each model in order"]

    Loop --> LoopI["🔁 for each iteration i"]

    LoopI --> SetR["Update queue item\nstatus: running"]
    SetR --> RS["Call runSingle()\n(client-side fetch)"]

    RS --> API["POST /api/run-single\n{model, prompt, apiKeys,\nsessionId, iteration}"]

    API --> Provider["⚡ Route to\nAI Provider"]

    Provider --> Stream["SSE Stream\nopen"]

    Stream --> SSE1["→ SSE: type=log\n(token chunks)"]
    Stream --> SSE2["→ SSE: type=progress\n(% complete)"]
    Stream --> SSE3["→ SSE: type=output\n(structured metrics)"]
    Stream --> SSE4["→ SSE: type=result\n(final aggregated data)"]

    SSE1 --> Terminal["Update Terminal\nappendLog()"]
    SSE2 --> ProgBar["Update Progress Bar"]
    SSE3 --> LiveOut["Update Live Output\nrunOutputs state"]
    SSE4 --> LastResult["Store lastResult\n{ttftMs, durationMs,\ntokens, tokensPerSec}"]

    LastResult --> Done{"Iteration\ncomplete?"}
    Done -- Yes --> Mark["Update queue item\nstatus: completed ✅\nor failed ❌"]

    Mark --> More{"More\niterations?"}
    More -- Yes --> LoopI
    More -- No --> Agg["Aggregate model metrics\navgTTFT, avgDuration\navgTPS, successCount"]

    Agg --> More2{"More\nmodels?"}
    More2 -- Yes --> Loop
    More2 -- No --> Finish

    Finish["setProgress(100)\nsetStatusText('Completed')"]
    Finish --> Toast2["🔔 Toast: 'Benchmark Complete!'"]
    Finish --> Reload["GET /api/history\nRefresh history table"]
    Reload --> Done2(["✅ Dashboard Updated\nLeaderboard · Charts · History"])
```

---

## 6. AI Provider Routing & Retry Logic

```mermaid
flowchart TD
    Req(["Incoming request\n{model, prompt, apiKeys}"])

    Req --> T1["Record t_start = Date.now()"]
    T1 --> Check{"Model prefix?"}

    Check -- "gemini-" --> G["Google Gemini\ngenerativelanguage.googleapis.com\n/v1beta/models/{model}:streamGenerateContent"]
    Check -- "groq/" --> GR["Groq API\napi.groq.com\n/openai/v1/chat/completions"]
    Check -- "openrouter/" --> OR["OpenRouter\nopenrouter.ai\n/api/v1/chat/completions"]
    Check -- "default" --> OL["Ollama\nollamaHost:11434\n(Local/Custom Cloud)"]

    G --> Retry["Retry Loop\nmaxAttempts = 5"]
    GR --> Retry
    OR --> Retry

    Retry --> Call["fetch() → stream=true"]
    Call --> RC{"Response\nStatus?"}
    RC -- "200 OK" --> Stream["✅ Begin SSE\ntoken streaming"]
    RC -- "429 Rate Limit" --> Delay["Parse retry-after header\nor regex: /try again in (\\d+)(s|ms)/\n+ 1000ms jitter buffer"]
    Delay --> Retry
    RC -- "4xx/5xx" --> FailErr["❌ Throw Error"]

    OL --> OChat["ollama.chat()\nstream: true"]
    OChat --> OStream["✅ Async for-await\nchunk iteration"]

    Stream --> Metrics["Collect:\n• firstTokenTime (TTFT)\n• totalTokens\n• outputText"]
    OStream --> Metrics

    Metrics --> End["Record t_end = Date.now()\nCalculate:\n• TTFT = t_first − t_start\n• Latency = t_end − t_start\n• TPS = tokens / (latency/1000)"]

    End --> SaveDB["Save to Supabase\nbenchmark_results table"]
    SaveDB --> Resp["Send SSE: output + result events\nClose stream"]
```

---

## 7. Real-Time SSE Stream Data Flow

```mermaid
sequenceDiagram
    participant UI as Browser (page.js)
    participant API as /api/run-single
    participant LLM as AI Provider

    UI->>API: POST {model, prompt, apiKeys}
    API->>LLM: fetch() with stream:true
    
    loop Token Streaming
        LLM-->>API: chunk (delta text)
        API-->>UI: data: {"type":"log","text":"Hello"}
        UI->>UI: appendLog(text) → Terminal
        Note over UI: firstTokenTime captured → TTFT
    end

    API-->>UI: data: {"type":"progress","data":60}
    UI->>UI: setProgress() → Progress Bar

    LLM-->>API: [DONE] / stream close
    API->>API: Calculate TTFT, Latency, TPS

    API-->>UI: data: {"type":"output","data":{text,ttftMs,durationMs,speed}}
    UI->>UI: setRunOutputs() → Live Output Panel

    API-->>UI: data: {"type":"result","data":{avgTtft,avgDuration,avgTPS}}
    UI->>UI: lastResult stored → runResults aggregated

    API-->>UI: Stream closed
    UI->>UI: Update liveQueue status → completed ✅
```

---

## 8. Playground Page Flow

```mermaid
flowchart TD
    PG(["🎮 User opens /playground"])

    PG --> Init["useEffect:\nPOST /api/models → load available models"]

    Init --> Models["Populate model dropdown\n(Gemini + Groq + OpenRouter + Ollama)"]

    Models --> Select["User selects\n1 or more models"]

    Select --> Prompt["User types prompt\nor picks from Presets\n(14 beginner JS presets)"]

    Prompt --> Run["▶️ Click Run\nfor each selected model"]

    Run --> Loop["Parallel fetch() per model\nPOST /api/run-single"]

    Loop --> SSE["SSE Stream\ntoken-by-token"]

    SSE --> Cards["Live Output Cards\n(one per model)\n• Streaming indicator\n• Response text\n• TTFT · Latency · TPS"]

    Cards --> Done{"All models\ncomplete?"}
    Done -- No --> SSE
    Done -- Yes --> Results["Performance Summary Panel\n• Scatter Chart (Latency vs TPS)\n• Bar Chart (Token comparison)\n• Best Model highlighted"]

    Results --> Actions["User Actions:\n📋 Copy output\n⬇️ Download response\n📤 Share results\n🔁 Re-run"]

    Actions --> PGEnd(["Playground session complete"])
```

---

## 9. Data Persistence — 3-Tier Fallback Strategy

```mermaid
flowchart TD
    Op(["Read or Write\nOperation"])

    Op --> T1{"Tier 1\nSupabase available?"}

    T1 -- Yes → Write --> SBW["Supabase UPSERT\n• configs table (config)\n• benchmark_results table (run data)"]
    T1 -- Yes → Read  --> SBR["Supabase SELECT\n• configs\n• benchmark_results ORDER BY created_at DESC"]
    SBW --> OK1["✅ Success"]
    SBR --> OK1

    T1 -- No / Error --> T2{"Tier 2\nLocal file exists?"}

    T2 -- Yes → Write --> FW["fs.writeFileSync()\n• config.json\n• results.json"]
    T2 -- Yes → Read  --> FR["fs.readFileSync()\n→ JSON.parse()"]
    FW --> OK2["✅ Success"]
    FR --> OK2

    T2 -- No / Error --> T3["Tier 3\nIn-Memory Defaults\n• defaultConfig object\n• empty results array []"]

    T3 --> OK3["✅ App still works\n(no persistence)"]

    style OK1 fill:#d1fae5,stroke:#10b981
    style OK2 fill:#dbeafe,stroke:#3b82f6
    style OK3 fill:#fef3c7,stroke:#f59e0b
```

---

## 10. Analytics, Charts & Export Flow

```mermaid
flowchart LR
    Data[("Benchmark Results\n(runResults + history)")]

    Data --> Tab{"Analytics\nTab Selected"}

    Tab -- "Radar" --> R["🕸️ RadarChart\n(recharts)\nAccuracy · Reasoning\nCoding · Speed\nCost · Reliability"]

    Tab -- "Latency" --> L["📉 LineChart\n(recharts)\nLatency per model"]

    Tab -- "Token Usage" --> B["📊 BarChart\n(recharts)\nTokens Per Second"]

    Tab -- "Accuracy" --> A["📈 AreaChart\n(recharts)\nAccuracy trend"]

    Data --> LD["🏆 Leaderboard Table\nSorted by Score DESC\nRank 1 → N"]

    Data --> CMP["⚖️ Side-by-Side Compare\nModel A vs Model B\nLatency · Tokens · Score · Winner"]

    Data --> EXP{"Export"}
    EXP -- CSV --> ECSV["Build CSV rows\nBlob URL download\nAI-Benchmark-Report-{ts}.csv"]
    EXP -- PDF --> EPDF["html2canvas screenshot\n+ jsPDF generate\nAI-Benchmark-Report-{ts}.pdf"]

    LD --> Scan["O(n) Linear Scan\nFind best score → Hero Banner"]
```

---

## 11. Core Algorithms Integration Map

```mermaid
flowchart TD
    User(["👤 User"])

    User --> A3

    subgraph A3["Algorithm 3 — Heuristic Model Selection\napp/page.js handleGenerateRecommendation()"]
        Goal["Select Goal\n(Fastest / Best Coding / Balanced)"]
        Rec["Rule-based → Recommend Model"]
    end

    A3 --> A1

    subgraph A1["Algorithm 1 — FIFO Queue\napp/page.js handleStartBenchmark()"]
        QB["Build ordered array\nM × I items"]
        QP["Process First-In First-Out"]
    end

    A1 --> A2

    subgraph A2["Algorithm 2 — Latency Calculation\napp/api/run-single/route.js"]
        T["t_start · t_first · t_end"]
        Calc["TTFT · Total Latency · TPS"]
    end

    A2 --> A4

    subgraph A4["Algorithm 4 — Scoring & Ranking\napp/page.js runResults aggregation"]
        Avg["Average metrics\nacross K iterations"]
        Sort["Sort models by Score DESC"]
        Rank["Assign Rank #1 → #N"]
    end

    A4 --> Out

    subgraph Out["📊 Outputs"]
        LB["Leaderboard Table"]
        CH["Analytics Charts"]
        REC["AI Recommendation Card"]
        HIS["History Table"]
    end

    Out --> User
```

---

## 12. Complete One-Page System Summary

```mermaid
flowchart TD
    U(["👤 User"])

    U --> |"Opens app"| INIT["🔄 App Init\nLoad config + history"]
    INIT --> |"3-tier fallback"| CFG["⚙️ Config Loaded\n(Supabase → JSON → Memory)"]

    CFG --> |"Configure"| SETUP["🔑 API Keys + Model Selection\nIterations + Prompt Type"]
    SETUP --> |"Click Start"| QUEUE["📋 FIFO Queue Built\nN = M × I tasks"]

    QUEUE --> |"Dequeue FIFO"| RUN["▶️ Run Single\nPOST /api/run-single"]
    RUN --> |"Prefix routing"| PROV["☁️ AI Provider\nGemini / Groq / OpenRouter / Ollama"]

    PROV --> |"SSE stream"| METRICS["📏 Latency Algorithm\nTTFT · Duration · TPS"]
    METRICS --> |"Save"| DB["🗄️ Supabase\n+ results.json"]

    DB --> |"Aggregate"| SCORE["🏆 Scoring & Ranking\nAverage → Sort → Rank"]
    SCORE --> |"Display"| DASH["📊 Dashboard\nLeaderboard · Charts · History"]

    DASH --> |"AI goal"| HEUR["🤖 Heuristic Selection\nRecommend best model"]
    HEUR --> U

    U --> |"Explore"| PLAY["🎮 Playground\n/playground"]
    PLAY --> |"Multi-model"| RUN
```
