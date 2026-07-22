import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const resultsFilePath = path.join(process.cwd(), 'results.json');

// GET historical benchmark results
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  // 1. Try Supabase first
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
    } catch (err) {
      console.error('Supabase history load failed, falling back to local:', err);
    }
  }

  // 2. Fall back to local results.json
  try {
    if (fs.existsSync(resultsFilePath)) {
      const fileContent = fs.readFileSync(resultsFilePath, 'utf8');
      const results = JSON.parse(fileContent);
      if (Array.isArray(results)) {
        return NextResponse.json({
          source: 'local',
          results: results.slice(-limit).reverse()
        });
      }
    }
  } catch (err) {
    console.error('Local history load failed:', err);
  }

  // 3. Return empty array if nothing found
  return NextResponse.json({ source: 'none', results: [] });
}
