import { NextResponse } from 'next/server';
import path from 'path';

// Helper for non-blocking sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// POST single benchmark run handler (Strict Real API execution only)
export async function POST(request) {
  try {
    const body = await request.json();
    const { model, task, prompt, apiKeys, iteration, totalIterations } = body;

    if (!model || !prompt) {
      return NextResponse.json({ success: false, error: 'Missing model or prompt parameter' }, { status: 400 });
    }

    const activeIteration = iteration || 1;
    const activeTotalIterations = totalIterations || 1;

    // Resolve API Keys from payload or env variables
    const geminiApiKey = apiKeys?.geminiApiKey || process.env.GEMINI_API_KEY || "";
    const groqApiKey = apiKeys?.groqApiKey || process.env.GROQ_API_KEY || "";
    const openRouterApiKey = apiKeys?.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    const ollamaHost = apiKeys?.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";

    // Set up SSE headers for progressive line streaming
    const encoder = new TextEncoder();
    const customReadableStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type, data = null, text = '') => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data, text })}\n\n`));
          } catch (e) {
            console.error('SSE streaming write error:', e);
          }
        };

        const prefix = `[${model}]`;
        sendEvent('log', null, `${prefix} Connecting to model endpoint...\n`);

        let startTime = Date.now();
        let firstTokenTime = null;
        let totalTokens = 0;
        let outputText = "";
        let success = false;
        let errorMessage = null;

        try {
          // ─── 1. Google Gemini API Provider ─────────────────────────────────────
          if (model.startsWith("gemini-")) {
            if (!geminiApiKey) {
              errorMessage = "Google Gemini API Key is required. Please add your key in the API Keys modal.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;
              let response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
              });

              if (!response.ok) {
                const errText = await response.text().catch(() => '');
                errorMessage = `Gemini API returned status ${response.status}: ${errText.slice(0, 100)}`;
                sendEvent('log', null, `\n❌ [API ERROR] ${errorMessage}\n`);
              } else {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop();

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const dataStr = line.slice(6).trim();
                      if (dataStr) {
                        try {
                          const parsed = JSON.parse(dataStr);
                          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                          if (firstTokenTime === null && text) firstTokenTime = Date.now();
                          if (text) {
                            outputText += text;
                            sendEvent('log', null, text);
                          }
                          if (parsed.usageMetadata) totalTokens = parsed.usageMetadata.candidatesTokenCount || 0;
                        } catch (e) {}
                      }
                    }
                  }
                }
                success = true;
              }
            }

          // ─── 2. Groq API Provider ──────────────────────────────────────────────
          } else if (model.startsWith("groq/")) {
            if (!groqApiKey) {
              errorMessage = "Groq API Key is required. Please add your key in the API Keys modal.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const actualModel = model.replace("groq/", "");
              const url = "https://api.groq.com/openai/v1/chat/completions";
              let response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${groqApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: actualModel,
                  messages: [{ role: 'user', content: prompt }],
                  stream: true
                })
              });

              if (!response.ok) {
                const errText = await response.text().catch(() => '');
                errorMessage = `Groq API returned status ${response.status}: ${errText.slice(0, 100)}`;
                sendEvent('log', null, `\n❌ [API ERROR] ${errorMessage}\n`);
              } else {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop();

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const dataStr = line.slice(6).trim();
                      if (dataStr === "[DONE]") break;
                      if (dataStr) {
                        try {
                          const parsed = JSON.parse(dataStr);
                          const content = parsed.choices?.[0]?.delta?.content || "";
                          if (firstTokenTime === null && content) firstTokenTime = Date.now();
                          if (content) {
                            outputText += content;
                            sendEvent('log', null, content);
                          }
                        } catch (e) {}
                      }
                    }
                  }
                }
                success = true;
              }
            }

          // ─── 3. OpenRouter API Provider ─────────────────────────────────────────
          } else if (model.startsWith("openrouter/")) {
            const actualModel = model.replace("openrouter/", "");
            const headers = { 'Content-Type': 'application/json' };
            if (openRouterApiKey) {
              headers['Authorization'] = `Bearer ${openRouterApiKey}`;
            }

            const url = "https://openrouter.ai/api/v1/chat/completions";
            let response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model: actualModel,
                messages: [{ role: 'user', content: prompt }],
                stream: true
              })
            });

            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              errorMessage = `OpenRouter API returned status ${response.status}: ${errText.slice(0, 100)}`;
              sendEvent('log', null, `\n❌ [API ERROR] ${errorMessage}\n`);
            } else {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === "[DONE]") break;
                    if (dataStr) {
                      try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (firstTokenTime === null && content) firstTokenTime = Date.now();
                        if (content) {
                          outputText += content;
                          sendEvent('log', null, content);
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
              success = true;
            }

          // ─── 4. Local Ollama Provider ──────────────────────────────────────────
          } else if (model.startsWith("ollama/")) {
            const actualModel = model.replace("ollama/", "");
            const url = `${ollamaHost}/api/generate`;
            let response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: actualModel,
                prompt,
                stream: true
              })
            });

            if (!response.ok) {
              errorMessage = `Local Ollama instance returned status ${response.status}. Ensure Ollama service is running.`;
              sendEvent('log', null, `\n❌ [OLLAMA ERROR] ${errorMessage}\n`);
            } else {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                  if (line.trim()) {
                    try {
                      const parsed = JSON.parse(line.trim());
                      const text = parsed.response || "";
                      if (firstTokenTime === null && text) firstTokenTime = Date.now();
                      if (text) {
                        outputText += text;
                        sendEvent('log', null, text);
                      }
                    } catch (e) {}
                  }
                }
              }
              success = true;
            }
          } else {
            errorMessage = `Unsupported model provider: ${model}`;
            sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
          }

        } catch (execErr) {
          console.error("Execution error:", execErr);
          errorMessage = execErr.message || "Failed to reach AI model API.";
          sendEvent('log', null, `\n❌ [NETWORK ERROR] ${errorMessage}\n`);
        }

        const endTime = Date.now();
        const wallClockDurationMs = Math.max(1, endTime - startTime);
        if (!totalTokens) totalTokens = Math.max(1, Math.round(outputText.length / 4));

        sendEvent('output', {
          model,
          prompt,
          text: outputText,
          tokens: totalTokens,
          durationMs: wallClockDurationMs,
          success,
          error: errorMessage
        });

        controller.close();
      }
    });

    return new NextResponse(customReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
