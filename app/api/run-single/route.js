import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { Ollama } from 'ollama';

// Helper for non-blocking sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const configFilePath = path.join(process.cwd(), 'config.json');

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

    let dbKeys = {};
    if (supabase) {
      try {
        const { data } = await supabase.from('configs').select('*').eq('id', 'active_config').maybeSingle();
        if (data) dbKeys = data.env || {};
      } catch (e) {}
    }
    if (!dbKeys.geminiApiKey && fs.existsSync(configFilePath)) {
      try {
        const fileData = fs.readFileSync(configFilePath, 'utf8');
        const json = JSON.parse(fileData);
        dbKeys = json.env || {};
      } catch (e) {}
    }

    // Resolve API Keys from payload, db/config, or env variables
    const geminiApiKey = apiKeys?.geminiApiKey || dbKeys.geminiApiKey || process.env.GEMINI_API_KEY || "";
    const groqApiKey = apiKeys?.groqApiKey || dbKeys.groqApiKey || process.env.GROQ_API_KEY || "";
    const openRouterApiKey = apiKeys?.openRouterApiKey || dbKeys.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    const huggingfaceApiKey = apiKeys?.huggingfaceApiKey || dbKeys.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY || "";
    const ollamaHost = apiKeys?.ollamaHost || dbKeys.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";
    const ollamaApiKey = apiKeys?.ollamaApiKey || dbKeys.ollamaApiKey || process.env.OLLAMA_API_KEY || "";

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
        let evalDurationNs = 0;
        let outputText = "";
        let success = false;
        let errorMessage = null;

        try {
          // ─── 1. Google Gemini API Provider ─────────────────────────────────────
          if (model.startsWith("gemini-")) {
            if (!geminiApiKey) {
              errorMessage = "Google Gemini API Key is required. Please add your key in the environment variables.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;
              let response;
              let attempts = 0;
              const maxAttempts = 5;

              while (!success && attempts < maxAttempts) {
                attempts++;
                startTime = Date.now(); // Reset start time to measure active API request
                response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (response.status === 429) {
                  const errData = await response.json().catch(() => ({}));
                  const retryDelayStr = errData.error?.details?.find(d => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo")?.retryDelay;
                  let delayMs = 10000; // Default 10s delay
                  if (retryDelayStr) {
                    const match = retryDelayStr.match(/^(\d+(?:\.\d+)?)s/);
                    if (match) {
                      delayMs = parseFloat(match[1]) * 1000 + 1000; // Add 1s buffer
                    }
                  }
                  sendEvent('log', null, `\n⏳ [RATE LIMIT] Rate limited (429). Retrying in ${(delayMs / 1000).toFixed(1)}s... (Attempt ${attempts}/${maxAttempts})\n`);
                  await sleep(delayMs);
                } else if (!response.ok) {
                  const errText = await response.text().catch(() => '');
                  throw new Error(`Gemini API error: ${response.status} ${errText.slice(0, 100)}`);
                } else {
                  success = true;
                }
              }

              if (!success) {
                throw new Error("Gemini API error: Max rate limit retries exceeded.");
              }

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
            }

          // ─── 2. Groq API Provider ──────────────────────────────────────────────
          } else if (model.startsWith("groq/")) {
            if (!groqApiKey) {
              errorMessage = "Groq API Key is required. Please add your key in the environment variables.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const actualModel = model.replace("groq/", "");
              const url = "https://api.groq.com/openai/v1/chat/completions";
              let response;
              let attempts = 0;
              const maxAttempts = 5;

              while (!success && attempts < maxAttempts) {
                attempts++;
                startTime = Date.now();
                response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: actualModel,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    stream_options: { include_usage: true }
                  })
                });

                if (response.status === 429) {
                  const retryAfterHeader = response.headers.get("retry-after");
                  let delayMs = 10000;
                  if (retryAfterHeader) {
                    delayMs = parseInt(retryAfterHeader, 10) * 1000 + 1000;
                  } else {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || "";
                    const match = errMsg.match(/try again in (\d+(?:\.\d+)?)(s|ms)?/i);
                    if (match) {
                      const unit = match[2] || "s";
                      const val = parseFloat(match[1]);
                      delayMs = unit === "ms" ? val : val * 1000 + 1000;
                    }
                  }
                  sendEvent('log', null, `\n⏳ [RATE LIMIT] Rate limited (429). Retrying in ${(delayMs / 1000).toFixed(1)}s... (Attempt ${attempts}/${maxAttempts})\n`);
                  await sleep(delayMs);
                } else if (!response.ok) {
                  const errText = await response.text().catch(() => '');
                  throw new Error(`Groq API error: ${response.status} ${errText.slice(0, 100)}`);
                } else {
                  success = true;
                }
              }

              if (!success) {
                throw new Error("Groq API error: Max rate limit retries exceeded.");
              }

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
                  const cleanLine = line.trim();
                  if (cleanLine.startsWith("data: ")) {
                    const dataStr = cleanLine.slice(6).trim();
                    if (dataStr === "[DONE]") continue;
                    if (dataStr) {
                      try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (firstTokenTime === null && content) firstTokenTime = Date.now();
                        if (content) {
                          outputText += content;
                          sendEvent('log', null, content);
                        }
                        if (parsed.usage) {
                          totalTokens = parsed.usage.completion_tokens || 0;
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
            }

          // ─── 3. OpenRouter API Provider ─────────────────────────────────────────
          } else if (model.startsWith("openrouter/")) {
            if (!openRouterApiKey) {
              errorMessage = "OpenRouter API Key is required. Please add your key in the environment variables.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const actualModel = model.replace("openrouter/", "");
              const headers = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://github.com/google/antigravity',
                'X-Title': 'AI Benchmark Analyzer'
              };

              const url = "https://openrouter.ai/api/v1/chat/completions";
              let response;
              let attempts = 0;
              const maxAttempts = 5;

              while (!success && attempts < maxAttempts) {
                attempts++;
                startTime = Date.now();
                response = await fetch(url, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    model: actualModel,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    stream_options: { include_usage: true }
                  })
                });

                if (response.status === 429) {
                  let delayMs = 10000;
                  const errData = await response.json().catch(() => ({}));
                  const errMsg = errData.error?.message || "";
                  const match = errMsg.match(/try again in (\d+(?:\.\d+)?)(s|ms)?/i);
                  if (match) {
                    const unit = match[2] || "s";
                    const val = parseFloat(match[1]);
                    delayMs = unit === "ms" ? val : val * 1000 + 1000;
                  }
                  sendEvent('log', null, `\n⏳ [RATE LIMIT] Rate limited (429). Retrying in ${(delayMs / 1000).toFixed(1)}s... (Attempt ${attempts}/${maxAttempts})\n`);
                  await sleep(delayMs);
                } else if (!response.ok) {
                  const errText = await response.text().catch(() => '');
                  throw new Error(`OpenRouter API error: ${response.status} ${errText.slice(0, 100)}`);
                } else {
                  success = true;
                }
              }

              if (!success) {
                throw new Error("OpenRouter API error: Max rate limit retries exceeded.");
              }

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
                  const cleanLine = line.trim();
                  if (cleanLine.startsWith("data: ")) {
                    const dataStr = cleanLine.slice(6).trim();
                    if (dataStr === "[DONE]") continue;
                    if (dataStr) {
                      try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (firstTokenTime === null && content) firstTokenTime = Date.now();
                        if (content) {
                          outputText += content;
                          sendEvent('log', null, content);
                        }
                        if (parsed.usage) {
                          totalTokens = parsed.usage.completion_tokens || 0;
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
            }

          // ─── 4. Hugging Face API Provider ─────────────────────────────────────────
          } else if (model.startsWith("huggingface/")) {
            if (!huggingfaceApiKey) {
              errorMessage = "Hugging Face API Key is required. Please add your key in the environment variables.";
              sendEvent('log', null, `\n⚠️ [CONFIG ERROR] ${errorMessage}\n`);
            } else {
              const actualModel = model.replace("huggingface/", "");
              const url = `https://router.huggingface.co/v1/chat/completions`;
              let response;
              let attempts = 0;
              const maxAttempts = 5;

              while (!success && attempts < maxAttempts) {
                attempts++;
                startTime = Date.now();
                response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${huggingfaceApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: actualModel,
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    max_tokens: 1024
                  })
                });

                if (response.status === 429) {
                  let delayMs = 10000;
                  const retryAfter = response.headers.get("x-ratelimit-reset");
                  if (retryAfter) {
                    delayMs = Math.max(1000, parseInt(retryAfter, 10) * 1000 - Date.now() + 1000);
                  }
                  sendEvent('log', null, `\n⏳ [RATE LIMIT] Rate limited (429). Retrying in ${(delayMs / 1000).toFixed(1)}s... (Attempt ${attempts}/${maxAttempts})\n`);
                  await sleep(delayMs);
                } else if (!response.ok) {
                  const errText = await response.text().catch(() => '');
                  throw new Error(`Hugging Face API error: ${response.status} ${errText.slice(0, 100)}`);
                } else {
                  success = true;
                }
              }

              if (!success) {
                throw new Error("Hugging Face API error: Max rate limit retries exceeded.");
              }

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
                  const cleanLine = line.trim();
                  if (cleanLine.startsWith("data: ")) {
                    const dataStr = cleanLine.slice(6).trim();
                    if (dataStr === "[DONE]") continue;
                    if (dataStr) {
                      try {
                        const parsed = JSON.parse(dataStr);
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (firstTokenTime === null && content) firstTokenTime = Date.now();
                        if (content) {
                          outputText += content;
                          sendEvent('log', null, content);
                        }
                        if (parsed.usage) {
                          totalTokens = parsed.usage.completion_tokens || 0;
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
            }

          // ─── 5. Local/Remote Ollama Provider ──────────────────────────────────────────
          } else {
            const actualModel = model.replace(/^ollama\//, "");
            const ollama = new Ollama({
              host: ollamaHost,
              headers: ollamaApiKey ? { Authorization: `Bearer ${ollamaApiKey}` } : undefined
            });

            const responseStream = await ollama.chat({
              model: actualModel,
              messages: [{ role: 'user', content: prompt }],
              stream: true
            });

            for await (const chunk of responseStream) {
              if (firstTokenTime === null && chunk.message?.content) {
                firstTokenTime = Date.now();
              }
              if (chunk.message?.content) {
                outputText += chunk.message.content;
                sendEvent('log', null, chunk.message.content);
              }
              if (chunk.done) {
                totalTokens = chunk.eval_count || 0;
                evalDurationNs = chunk.eval_duration || 0;
              }
            }
            success = true;
          }

        } catch (execErr) {
          console.error("Execution error:", execErr);
          errorMessage = execErr.message || "Failed to reach AI model API.";
          sendEvent('log', null, `\n❌ [NETWORK ERROR] ${errorMessage}\n`);
        }

        const endTime = Date.now();
        const wallClockDurationMs = Math.max(1, endTime - startTime);
        const ttftMs = firstTokenTime ? (firstTokenTime - startTime) : wallClockDurationMs;
        if (!totalTokens) totalTokens = Math.max(1, Math.round(outputText.length / 4));
        const speed = totalTokens / (wallClockDurationMs / 1000);

        sendEvent('output', {
          model,
          prompt,
          text: outputText,
          tokens: totalTokens,
          durationMs: wallClockDurationMs,
          ttftMs,
          speed,
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
