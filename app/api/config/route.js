import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'config.json');

const defaultModels = [
  "gemini-3.5-flash",
  "groq/llama-3.3-70b-versatile",
  "openrouter/google/gemma-4-31b-it:free",
  "openrouter/openrouter/free"
];

const defaultTasks = [
  {
    id: "speed-test",
    name: "Short Speed Test",
    prompt: "Explain quantum computing in exactly one sentence."
  },
  {
    id: "coding-test",
    name: "JavaScript Coding Test",
    prompt: "Write a JavaScript function to reverse a singly linked list. Output only the code block."
  }
];

const defaultConfig = {
  env: {
    ollamaApiKey: process.env.OLLAMA_API_KEY || "",
    ollamaHost: process.env.OLLAMA_HOST || "https://ollama.com",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    groqApiKey: process.env.GROQ_API_KEY || "",
    openRouterApiKey: process.env.OPENROUTER_API_KEY || ""
  },
  config: {
    models: defaultModels,
    tasks: defaultTasks,
    iterations: 2
  }
};

// GET active config
export async function GET() {
  // 1. Try to read from Supabase DB
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('configs')
        .select('*')
        .eq('id', 'active_config')
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          env: data.env,
          config: {
            models: data.models,
            tasks: data.tasks || defaultTasks,
            iterations: data.iterations
          }
        });
      }
    } catch (err) {
      console.error('Supabase config load failed, falling back to local:', err);
    }
  }

  // 2. Fall back to local file config.json
  try {
    if (fs.existsSync(configFilePath)) {
      const fileData = fs.readFileSync(configFilePath, 'utf8');
      const json = JSON.parse(fileData);
      return NextResponse.json(json);
    }
  } catch (err) {
    console.error('Local config load failed:', err);
  }

  // 3. Fall back to in-memory defaults
  return NextResponse.json(defaultConfig);
}

// POST update config
export async function POST(request) {
  try {
    const body = await request.json();
    const { env, config } = body;

    const payload = {
      env: {
        ollamaApiKey: env?.ollamaApiKey || "",
        ollamaHost: env?.ollamaHost || "https://ollama.com",
        geminiApiKey: env?.geminiApiKey || "",
        groqApiKey: env?.groqApiKey || "",
        openRouterApiKey: env?.openRouterApiKey || ""
      },
      config: {
        models: config?.models || defaultModels,
        tasks: config?.tasks || defaultTasks,
        iterations: Number(config?.iterations) || 2
      }
    };

    // 1. Attempt to write to Supabase if connected
    if (supabase) {
      try {
        const { error } = await supabase
          .from('configs')
          .upsert({
            id: 'active_config',
            models: payload.config.models,
            tasks: payload.config.tasks,
            iterations: payload.config.iterations,
            env: payload.env,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Supabase config upsert error:', error);
        }
      } catch (err) {
        console.error('Supabase config upsert failed:', err);
      }
    }

    // 2. Always write to local config.json file as fallback/history
    try {
      fs.writeFileSync(configFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('Local config save failed:', err);
    }

    return NextResponse.json({ success: true, message: 'Configuration saved successfully', data: payload });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
