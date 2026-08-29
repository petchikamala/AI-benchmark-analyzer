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

// POST new benchmark results
export async function POST(request) {
  try {
    const body = await request.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ success: false, error: 'No results provided' }, { status: 400 });
    }

    // 1. Try to save to Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('benchmark_results')
          .insert(results);

        if (error) {
          console.error('Supabase insert error:', error);
        }
      } catch (err) {
        console.error('Supabase save failed:', err);
      }
    }

    // 2. Fall back to appending to local results.json
    try {
      let existingResults = [];
      if (fs.existsSync(resultsFilePath)) {
        const fileContent = fs.readFileSync(resultsFilePath, 'utf8');
        existingResults = JSON.parse(fileContent);
      }
      
      // We push the new results
      // Assuming results payload maps identically or closely to the expected structure
      results.forEach(res => {
        existingResults.push({
          ...res,
          id: res.id || Math.random().toString(36).substring(7),
          created_at: res.created_at || new Date().toISOString()
        });
      });

      fs.writeFileSync(resultsFilePath, JSON.stringify(existingResults, null, 2), 'utf8');
    } catch (err) {
      console.error('Local history save failed:', err);
    }

    return NextResponse.json({ success: true, message: 'Results saved successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
