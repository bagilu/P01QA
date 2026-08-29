import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. 請確認 Supabase Edge Function Secrets 已有 SUPABASE_SERVICE_ROLE_KEY。');
  }

  // v16 修正：Dashboard 手動貼上版也明確使用 service_role key 作為 apikey 與 Authorization。
  // 避免 Function 雖然存在 service_role 變數，但 PostgREST 寫入時仍被視為 anon 而遭 RLS 阻擋。
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { user_id, game_code } = await req.json();
    const userId = String(user_id || '').trim();
    const gameCode = String(game_code || '').replace(/\s/g, '');

    if (!userId) return errorResponse('請先輸入暱稱。');
    if (!gameCode || gameCode.length !== 6) return errorResponse('請輸入 6 位數競賽代號。');

    const supabase = getAdminClient();
    const { data: sessions, error: sessionError } = await supabase
      .from('TblP01GameSession')
      .select('*')
      .eq('GameCode', gameCode)
      .limit(1);
    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return errorResponse('找不到此競賽代號。', 404);

    const session = sessions[0];
    if (session.Status === 'ended') return errorResponse('此競賽已結束，無法加入。');

    const { data: existingPlayers, error: existingPlayerError } = await supabase
      .from('TblP01GamePlayer')
      .select('PlayerID')
      .eq('GameID', session.GameID)
      .eq('UserID', userId)
      .limit(1);
    if (existingPlayerError) throw existingPlayerError;

    if (!existingPlayers || existingPlayers.length === 0) {
      const { error: playerError } = await supabase
        .from('TblP01GamePlayer')
        .insert([{
          GameID: session.GameID,
          UserID: userId,
          CorrectCount: 0,
          AnsweredCount: 0,
          TotalScore: 0,
        }]);
      if (playerError) throw playerError;
    }

    return jsonResponse({ ok: true, session });
  } catch (err) {
    console.error(err);
    return errorResponse(err?.message || '加入競賽失敗。', 500);
  }
});
