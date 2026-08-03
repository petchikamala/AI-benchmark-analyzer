# AI Benchmark Analyzer — Workflow Diagram

> A complete end-to-end visual of how the system works, from configuration to results.

---

## 🗺️ High-Level System Architecture

```mermaid
flowchart TD
    User(["👤 User (Browser)"])
    
    subgraph Frontend["🖥️ Next.js Frontend (app/page.js)"]
        direction TB
        UI_Config["⚙️ Configuration\n(API Keys, Models, Iterations)"]
        UI_Run["▶️ Run Benchmark\n(Category + Difficulty)"]
        UI_Live["📡 Live Runs\n(Queue + Progress)"]
        UI_Leader["🏆 Leaderboard"]
        UI_Compare["⚖️ Compare Models"]
        UI_History["📜 Historical Analysis"]
        UI_Analytics["📊 Analytics Charts"]
        UI_Playground["🎮 Playground Page"]
    end

    subgraph API["🔌 Next.js API Routes (app/api/)"]
        R_Config["/api/config\nGET · POST"]
        R_Models["/api/models\nGET"]
        R_RunSingle["/api/run-single\nPOST (SSE Stream)"]
        R_History["/api/history\nGET"]
    end

    subgraph Providers["☁️ AI Model Providers"]
        P_Gemini["Google Gemini\n(gemini-2.5-flash, etc.)"]
        P_Groq["Groq API\n(llama-3.3-70b, etc.)"]
        P_OpenRouter["OpenRouter\n(Free Models)"]
        P_Ollama["Ollama\n(Local LLM)"]
    end

    subgraph Storage["🗄️ Storage"]
        DB_Supabase[("Supabase\nPostgres DB")]
        File_Config[("config.json\nLocal File")]
        File_Results[("results.json\nLocal File")]
    end

    User --> Frontend
    Frontend --> API
    R_RunSingle --> Providers
    API --> Storage
    Storage --> API
```

---

## 🔄 Core Benchmark Execution Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend (page.js)
    participant API as /api/run-single
    participant LLM as AI Provider
    participant DB as Supabase / results.json

    User->>UI: 1. Select Models + Task + Iterations
    User->>UI: 2. Click "Start Evaluation"
    
    UI->>UI: Generate Session ID
    UI->>UI: Build Live Queue (model × iterations)
    
    loop For each selected model
        loop For each iteration
            UI->>API: POST /api/run-single\n{model, task, prompt, apiKeys, sessionId}
            API->>LLM: Send prompt to AI provider
            LLM-->>API: Stream token chunks (SSE)
            API-->>UI: SSE: {type: "log", text: "..."}
            API-->>UI: SSE: {type: "progress", data: 60}
            API-->>UI: SSE: {type: "output", data: {...metrics}}
            API-->>UI: SSE: {type: "result", data: {avgTtft, avgDuration...}}
            API->>DB: Save result to Supabase
        end
        UI->>UI: Aggregate avg metrics per model
        UI->>UI: Update runResults state
    end

    UI->>UI: setProgress(100) → "Completed"
    UI->>API: GET /api/history → refresh history table
    UI->>User: Show Toast "Benchmark run completed!"
```

---

## 🧭 Navigation & Page Flow

```mermaid
flowchart LR
    Start(["🌐 User Opens App"])
    Start --> Load

    Load["App Init\n• Fetch /api/config\n• Load API Keys\n• Load History"]

    Load --> Overview

    subgraph MainPage["Main Dashboard (/)"]
        Overview["🏠 Overview\nHero Banner + KPI Cards"]
        RunBench["▶️ Run Benchmark\nConfig Section"]
        LiveRuns["📡 Live Runs\nQueue Status"]
        Leaderboard["🏆 Leaderboard\nRanking Table"]
        Compare["⚖️ Compare Models\nSide-by-Side"]
        History["📜 History\nFiltered Table"]
        Analytics["📊 Analytics\nRadar/Bar/Area Charts"]
        PromptLib["📚 Prompt Library\n(links to History)"]
    end

    Overview --> RunBench --> LiveRuns --> Leaderboard
    Leaderboard --> Compare --> History --> Analytics
    Analytics --> PromptLib

    Playground["🎮 /playground\nFull Playground Page"]
    MainPage -- "Click Playground" --> Playground
```

---

## ⚙️ Configuration & Setup Flow

```mermaid
flowchart TD
    A(["User Opens Settings"])
    A --> B["Enter API Keys\n• Gemini API Key\n• Groq API Key\n• OpenRouter API Key\n• Ollama Host URL"]
    B --> C["POST /api/config\n(save to config.json)"]
    C --> D["Select Models\n(grouped by provider)"]
    D --> E["Set Iterations\n(default: 3)"]
    E --> F["Choose Prompt Category\n(Coding / Reasoning / Math / Creative / Custom)"]
    F --> G["Choose Difficulty\n(Easy / Medium / Hard)"]
    G --> H(["Ready to Benchmark ✅"])
```

---

## 📊 Data & Metrics Pipeline

```mermaid
flowchart LR
    subgraph Input
        Prompt["📝 Prompt Text"]
        Model["🤖 Model ID"]
        APIKey["🔑 API Key"]
    end

    subgraph Processing["/api/run-single Processing"]
        direction TB
        T1["Start Timer ⏱️"]
        T2["Call AI Provider API\n(stream response)"]
        T3["Measure TTFT\n(Time to First Token)"]
        T4["Count Tokens"]
        T5["End Timer → Duration"]
        T6["Calc Tokens/sec"]
        T1 --> T2 --> T3 --> T4 --> T5 --> T6
    end

    subgraph Output["Metrics Collected"]
        M1["⚡ TTFT (ms)"]
        M2["⏱️ Total Latency (ms)"]
        M3["🔢 Token Count"]
        M4["📈 Tokens / sec"]
        M5["✅ Success / ❌ Failure"]
        M6["💬 Response Text"]
    end

    subgraph Aggregation["Per-Model Aggregation"]
        Avg["Average across\nN iterations"]
    end

    Input --> Processing --> Output --> Aggregation
    Aggregation --> DB[("Supabase DB\n+ results.json")]
    Aggregation --> UI["UI: Leaderboard\nCharts, History"]
```

---

## 🤖 AI Provider Routing Logic

```mermaid
flowchart TD
    Model["Model Name String"]
    
    Model --> Check1{"starts with\n'gemini-' ?"}
    Check1 -- Yes --> Gemini["Google Gemini API\n(Gemini Flash / Pro)"]
    Check1 -- No --> Check2{"starts with\n'groq/' ?"}
    Check2 -- Yes --> Groq["Groq LPU API\n(LLaMA 3.x)"]
    Check2 -- No --> Check3{"starts with\n'openrouter/' ?"}
    Check3 -- Yes --> OpenRouter["OpenRouter API\n(Free/Paid models)"]
    Check3 -- No --> Ollama["Ollama\n(Local LLM at localhost:11434)"]
```

---

## 📈 Analytics & Visualization Flow

```mermaid
flowchart LR
    Results[("Benchmark\nResults Data")]
    
    Results --> Radar["🕸️ Radar Chart\n(recharts)\nAccuracy, Speed,\nReasoning, Cost..."]
    Results --> Line["📉 Line Chart\n(recharts)\nLatency over models"]
    Results --> Bar["📊 Bar Chart\n(recharts)\nTokens Per Second"]
    Results --> Area["📈 Area Chart\n(recharts)\nAccuracy trend"]
    
    Results --> Leader["🏆 Leaderboard Table\nRanked by Score"]
    Results --> Compare["⚖️ Side-by-Side\nModel Comparison"]
    Results --> Export["📥 Export\nCSV / PDF\n(html2canvas + jspdf)"]
```

---

## 🗄️ Storage & Persistence

```mermaid
flowchart TD
    subgraph Write["Write Operations"]
        W1["POST /api/config → config.json"]
        W2["Run complete → Supabase INSERT"]
        W3["Export → Download CSV/PDF"]
    end

    subgraph Read["Read Operations"]
        R1["GET /api/config → config.json\n(on app load)"]
        R2["GET /api/history → Supabase\n(after each run)"]
        R3["GET /api/models → model list"]
    end

    subgraph Store["Storage Backends"]
        S1[("📄 config.json\n(local file)")]
        S2[("🗄️ Supabase\nPostgres")]
        S3[("📄 results.json\n(local cache)")]
    end

    W1 --> S1
    W2 --> S2
    R1 --> S1
    R2 --> S2
    R3 --> S3
```
