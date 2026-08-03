# 🎮 Playground Page — Data Flow Chart

---

## Complete Data & State Flow (`app/playground/page.js`)

```mermaid
flowchart TD
    subgraph Init["1. Initialization & Config"]
        Start(["Page Mount (useEffect)"])
        Start --> F1["GET /api/config\n→ selectedModelIds"]
        Start --> F2["POST /api/models\n→ availableModels"]
    end

    subgraph Input["2. User Input State"]
        U1["User modifies\nPrompt Text"] --> State1[("State:\npromptText")]
        U2["User changes\nModel Selection"] --> State2[("State:\nselectedModelIds")]
    end

    Init --> Input

    subgraph Execution["3. Concurrent Execution (handleRunBenchmark)"]
        Run(["▶️ Click Run"])
        Run --> C1["Set isGenerating = true\nInit AbortControllers"]
        
        C1 --> Loop["For each model in selectedModelIds\n(Concurrent Promise.allSettled)"]
        
        Loop --> API["POST /api/run-single\n{model, task, prompt}"]
    end

    State1 --> Run
    State2 --> Run

    subgraph Streaming["4. SSE Stream Processing"]
        API --> Stream{"Read chunks\n(TextDecoder)"}
        
        Stream -- "data: {type: 'log'}" --> L1["Update Live Text\n& Estimate Tokens"]
        Stream -- "data: {type: 'output'}" --> L2["Finalize Metrics\n(Latency, TTFT, Score, Cost)"]
        
        L1 --> State3[("State:\nmodelOutputs[modelId]\n{text, streaming: true}")]
        L2 --> State4[("State:\nmodelOutputs[modelId]\n{text, metrics, streaming: false}")]
    end

    subgraph Aggregation["5. History & Summary Statistics"]
        State4 --> Wait{"All models\ncompleted?"}
        
        Wait -- Yes --> H1["Build Run Record\n(Timestamp, Models, Results)"]
        H1 --> State5[("State:\nrunHistory")]
        
        State5 --> Memo["useMemo: dynamicSummaryStats\n(Calculates averages, totals, Best Model)"]
    end

    subgraph UIRendering["6. UI & Data Visualization"]
        State3 -.-> UI1["Model Output Cards\n(Typing effect, live metrics)"]
        State4 -.-> UI1
        
        Memo -.-> UI2["Performance Summary KPI Cards\n(Best Model, Avg Latency)"]
        Memo -.-> UI3["Recharts Data (performanceChartData)\n• Scatter Chart (Latency vs Speed)\n• Bar Chart (Speed)"]
        State5 -.-> UI4["Comparison Data Table"]
    end
    
    Aggregation --> UIRendering
```

---

### 🔑 Key Concepts in the Playground Data Flow:
1. **Concurrency**: Unlike the dashboard (which uses a sequential FIFO queue), the Playground uses `Promise.allSettled` to fetch all selected models *simultaneously* to demonstrate real-time visual racing.
2. **Event-Driven State**: The UI reacts instantly to `modelOutputs` state updates triggered by SSE `type: 'log'` chunks, causing the typing effect.
3. **Derived State**: Charts and leaderboard tables are fully driven by a `useMemo` hook (`dynamicSummaryStats`) that reacts to `runHistory` updates, preventing unnecessary re-renders during live streaming.
4. **AbortControllers**: Each running model has a mapped `AbortController` allowing the user to selectively halt individual models or stop all generations instantly.
