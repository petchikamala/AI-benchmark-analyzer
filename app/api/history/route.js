import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET historical benchmark results
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return NextResponse.json({ source: 'supabase', results: data });
      }
      if (error) {
        console.error('Supabase query error:', error);
      }
    } catch (err) {
      console.error('Supabase history load failed:', err);
    }
  }

  // Return empty array if Supabase is offline or fails
  return NextResponse.json({ source: 'none', results: [] });
}

// POST new benchmark results
export async function POST(request) {
  try {
    const body = await request.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ success: false, error: 'No results provided' }, { status: 400 });
    }

    if (supabase) {
      try {
        const supabasePayload = results.map(r => ({
          model: r.model,
          task: r.task,
          prompt: r.prompt,
          ttft_ms: r.ttft_ms,
          latency_ms: r.latency_ms,
          tokens: r.tokens,
          speed_tps: r.speed_tps,
          cost: r.cost,
          success: r.success,
          response_text: r.response_text,
          error_message: r.error_message,
          session_id: r.session_id || 'default-session'
        }));

        const { error } = await supabase
          .from('benchmark_results')
          .insert(supabasePayload);

        if (error) {
          console.error('Supabase insert error:', error);
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'Results saved to Supabase successfully' });
      } catch (err) {
        console.error('Supabase save failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Supabase client not initialized' }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
