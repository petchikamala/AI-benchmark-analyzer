# Algorithms and Core Logic inside AI Benchmark Analyzer

The AI Benchmark Analyzer employs several computational strategies and data processing algorithms to measure, parse, and visualize the performance of various Large Language Models (LLMs) in real time.

Below is an overview of the primary algorithms used in the codebase:

## 1. Streaming Server-Sent Events (SSE) Parsing Algorithm
To provide real-time typing indicators and accurately measure the Time to First Byte (TTFB), the backend uses a byte-stream parsing algorithm:
- **Initialization**: A connection is opened via `fetch`, and a `TextDecoder` and `reader` are attached to the `response.body`.
- **Chunk Processing**: As raw bytes arrive over the network, they are decoded into strings. The algorithm buffers incomplete chunks until a newline `\n` character is detected, ensuring JSON objects are fully formed before parsing.
- **Data Extraction**: It splits the buffer into lines, trims whitespace, and strips the `data: ` prefix to isolate the JSON string.
- **Completion Check**: It safely ignores the standard `[DONE]` termination flag and parses the delta chunks to stream directly to the UI.

## 2. Latency and Time to First Byte (TTFB) Tracking
The system meticulously tracks timestamps to benchmark API responsiveness:
- **`startTime`**: Recorded immediately before the `fetch` request is dispatched.
- **`firstTokenTime`**: Captured the exact millisecond the *first* parsed chunk containing non-empty `content` is received. 
- **`endTime`**: Recorded when the stream closes or the final chunk is processed.
- **Calculations**:
  - `TTFB = firstTokenTime - startTime` (Measures network latency + API cold start).
  - `Total Elapsed = (endTime - startTime) / 1000` (Total time to generate the response in seconds).

## 3. Tokens Per Second (Throughput) Algorithm
To measure the generation speed (throughput) of the models:
- **Token Counting**: Rather than estimating tokens using a heuristic, the code strictly relies on the exact token counts provided by the model APIs. It sends `stream_options: { include_usage: true }` in the payload, forcing the API to append a final chunk containing the exact `usage.completion_tokens`.
- **Throughput Calculation**: In the React frontend (inside the `performanceChartData` `useMemo` hook), the speed is calculated as:
  ```javascript
  const speed = latencySec > 0 ? Math.round(tokens / latencySec) : 0;
  ```

## 4. Exponential Backoff & Rate Limit Handling
APIs like Groq have strict rate limits (e.g., HTTP 429). The system implements an adaptive retry algorithm:
- **Maximum Retries**: Bounded to 5 attempts (`maxAttempts`).
- **Dynamic Delay Calculation**: 
  - First, it checks the standard HTTP `retry-after` header.
  - If missing, it uses a **Regex Parser** (`/try again in (\d+(?:\.\d+)?)(s|ms)?/i`) to extract the precise timeout requested by the API from the error message.
- **Jitter Buffer**: It adds an arbitrary +1000ms to the required delay to account for network drift and prevent instant re-banning.

## 5. Aggregation and Scoring Logic
As the user runs multiple benchmarks, the frontend aggregates the data to produce summary statistics:
- **Accumulation**: It iterates through `runHistory`, calculating total tokens generated, cumulative cost, and total latency across all successful runs.
- **Averaging**: It calculates the `avgLatency` and `avgScore` dynamically.
- **Best Model Identification**: It uses a linear scan `(O(n))` over the benchmark results, constantly updating `topScore` and `bestModelObj` to highlight the most capable model dynamically in the UI header.
