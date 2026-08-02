import { NextResponse } from 'next/server';

// GET dynamically available LLM models based on provided/configured API keys
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKeys } = body;

    const geminiKey = apiKeys?.geminiApiKey || process.env.GEMINI_API_KEY || "";
    const groqKey = apiKeys?.groqApiKey || process.env.GROQ_API_KEY || "";
    const openRouterKey = apiKeys?.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    const ollamaHost = apiKeys?.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";

    const availableModels = [];

    // 1. Google Gemini Models
    availableModels.push({
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google Gemini',
      providerCategory: 'Google Gemini',
      icon: '✨',
      score: 95.4,
      cost: '$0.002',
      hasKey: Boolean(geminiKey),
      keyName: 'Google Gemini Key'
    });
    availableModels.push({
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'Google Gemini',
      providerCategory: 'Google Gemini',
      icon: '⚡',
      score: 92.1,
      cost: '$0.0005',
      hasKey: Boolean(geminiKey),
      keyName: 'Google Gemini Key'
    });

    // 2. Groq API Models
    availableModels.push({
      id: 'groq/llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B',
      provider: 'Groq',
      providerCategory: 'Groq API',
      icon: '♾️',
      score: 89.7,
      cost: '$0.001',
      hasKey: Boolean(groqKey),
      keyName: 'Groq API Key'
    });
    availableModels.push({
      id: 'groq/mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'Groq',
      providerCategory: 'Groq API',
      icon: '🌀',
      score: 87.2,
      cost: '$0.002',
      hasKey: Boolean(groqKey),
      keyName: 'Groq API Key'
    });

    // 3. OpenRouter API Models
    availableModels.push({
      id: 'openrouter/google/gemma-4-31b-it:free',
      name: 'Gemma 4 31B (Free)',
      provider: 'OpenRouter',
      providerCategory: 'OpenRouter',
      icon: '💎',
      score: 88.5,
      cost: 'Free',
      hasKey: Boolean(openRouterKey || true), // Free model accessible
      keyName: 'OpenRouter Key'
    });
    availableModels.push({
      id: 'openrouter/openrouter/free',
      name: 'OpenRouter Free Auto',
      provider: 'OpenRouter',
      providerCategory: 'OpenRouter',
      icon: '🚀',
      score: 86.0,
      cost: 'Free',
      hasKey: Boolean(openRouterKey || true),
      keyName: 'OpenRouter Key'
    });

    // 4. Try querying local Ollama instance if available
    try {
      const ollamaRes = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        if (data.models && Array.isArray(data.models)) {
          data.models.forEach(m => {
            availableModels.push({
              id: `ollama/${m.name}`,
              name: `Ollama - ${m.name}`,
              provider: 'Local Ollama',
              providerCategory: 'Ollama Local',
              icon: '🦙',
              score: 85.0,
              cost: 'Local / Free',
              hasKey: true,
              keyName: 'Local Ollama'
            });
          });
        }
      }
    } catch (_) {
      // Local Ollama not active
    }

    return NextResponse.json({ success: true, models: availableModels });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
