import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { Ollama } from 'ollama';

const configFilePath = path.join(process.cwd(), 'config.json');

// GET dynamically available LLM models based on provided/configured API keys
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKeys } = body;

    let dbKeys = {};
    let configuredModels = [];

    if (supabase) {
      try {
        const { data } = await supabase.from('configs').select('*').eq('id', 'active_config').maybeSingle();
        if (data) {
          dbKeys = data.env || {};
          configuredModels = data.config?.models || [];
        }
      } catch (e) {}
    }
    if (!dbKeys.geminiApiKey && fs.existsSync(configFilePath)) {
      try {
        const fileData = fs.readFileSync(configFilePath, 'utf8');
        const json = JSON.parse(fileData);
        dbKeys = json.env || {};
        if (json.config && Array.isArray(json.config.models)) {
          configuredModels = json.config.models;
        }
      } catch (e) {}
    }

    const geminiKey = apiKeys?.geminiApiKey || dbKeys.geminiApiKey || process.env.GEMINI_API_KEY || "";
    const groqKey = apiKeys?.groqApiKey || dbKeys.groqApiKey || process.env.GROQ_API_KEY || "";
    const openRouterKey = apiKeys?.openRouterApiKey || dbKeys.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    const ollamaHost = apiKeys?.ollamaHost || dbKeys.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";
    const ollamaApiKey = apiKeys?.ollamaApiKey || dbKeys.ollamaApiKey || process.env.OLLAMA_API_KEY || "";

    const defaultModels = [
      "gemini-3.5-flash",
      "groq/llama-3.3-70b-versatile",
      "groq/llama-3.1-8b-instant"
    ];

    let dynamicOpenRouterModels = [];
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/models', { cache: 'no-store' });
      if (orRes.ok) {
        const orData = await orRes.json();
        const freeModels = orData.data.filter(m => 
          m.pricing && 
          (m.pricing.prompt === "0" || parseFloat(m.pricing.prompt) === 0) && 
          (m.pricing.completion === "0" || parseFloat(m.pricing.completion) === 0)
        );
        // Add the top 10 free models dynamically
        dynamicOpenRouterModels = freeModels.slice(0, 10).map(m => `openrouter/${m.id}`);
      }
    } catch (e) {
      console.error('Failed to fetch dynamic openrouter models', e);
      // Fallback
      dynamicOpenRouterModels = [
        "openrouter/google/gemma-2-9b-it:free",
        "openrouter/meta-llama/llama-3.1-8b-instruct:free",
        "openrouter/microsoft/phi-3-mini-128k-instruct:free"
      ];
    }

    const allConfiguredModels = Array.from(new Set([...defaultModels, ...dynamicOpenRouterModels, ...configuredModels]));

    const availableModels = allConfiguredModels.map(modelStr => {
      if (modelStr.startsWith('gemini-')) {
        return {
          id: modelStr,
          name: modelStr,
          provider: 'Google Gemini',
          providerCategory: 'Google Gemini',
          icon: '✨',
          score: 90.0,
          cost: 'Standard',
          hasKey: Boolean(geminiKey),
          keyName: 'Google Gemini Key'
        };
      } else if (modelStr.startsWith('groq/')) {
        return {
          id: modelStr,
          name: modelStr.replace('groq/', ''),
          provider: 'Groq',
          providerCategory: 'Groq API',
          icon: '♾️',
          score: 88.0,
          cost: 'Standard',
          hasKey: Boolean(groqKey),
          keyName: 'Groq API Key'
        };
      } else if (modelStr.startsWith('openrouter/')) {
        return {
          id: modelStr,
          name: modelStr.replace('openrouter/', ''),
          provider: 'OpenRouter',
          providerCategory: 'OpenRouter API',
          icon: '💎',
          score: 85.0,
          cost: 'Standard',
          hasKey: Boolean(openRouterKey),
          keyName: 'OpenRouter API Key'
        };
      } else {
        return {
          id: modelStr,
          name: modelStr.replace(/^ollama\//, ''),
          provider: 'Ollama',
          providerCategory: 'Ollama / Custom Cloud',
          icon: '🦙',
          score: 80.0,
          cost: 'Free/Local',
          hasKey: Boolean(ollamaApiKey),
          keyName: 'Ollama API Key'
        };
      }
    });

    return NextResponse.json({
      success: true,
      models: availableModels
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
