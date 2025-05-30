// app/api/scores/route.js
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score')
    .order('score', { ascending: false })
    .limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(request) {
  const body = await request.json();
  const { player_name, score } = body;

  const { error } = await supabase
    .from('scores')
    .insert([{ player_name, score }]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Score saved' }), { status: 200 });
}
