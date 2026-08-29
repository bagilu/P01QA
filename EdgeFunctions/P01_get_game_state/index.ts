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
    const { game_id, game_code, user_id } = await req.json();
    const gameId = Number(game_id);
    const gameCode = String(game_code || '').trim();
    const userId = String(user_id || '').trim();

    if (!gameId && !gameCode) return errorResponse('缺少 GameID 或 GameCode。');

    const supabase = getAdminClient();

    let sessionQuery = supabase
      .from('TblP01GameSession')
      .select('*')
      .limit(1);

    if (gameId) sessionQuery = sessionQuery.eq('GameID', gameId);
    if (gameCode) sessionQuery = sessionQuery.eq('GameCode', gameCode);

    const { data: sessions, error: sessionError } = await sessionQuery;
    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return errorResponse('找不到競賽資料。', 404);

    const session = sessions[0];

    // 防呆：主持人理論上在建立競賽時已寫入 TblP01GamePlayer。
    // 若舊資料或異常流程漏寫，這裡自動補上，避免主持人不能作答或人數不正確。
    if (userId && session.HostUserID === userId) {
      const { data: existingHost, error: hostCheckError } = await supabase
        .from('TblP01GamePlayer')
        .select('GameID, UserID')
        .eq('GameID', session.GameID)
        .eq('UserID', userId)
        .limit(1);
      if (hostCheckError) throw hostCheckError;
      if (!existingHost || existingHost.length === 0) {
        const { error: hostInsertError } = await supabase
          .from('TblP01GamePlayer')
          .insert([{
            GameID: session.GameID,
            UserID: userId,
            CorrectCount: 0,
            AnsweredCount: 0,
            TotalScore: 0,
          }]);
        if (hostInsertError) throw hostInsertError;
      }
    }

    const [{ data: players, error: playersError }, { data: attempts, error: attemptsError }] = await Promise.all([
      supabase
        .from('TblP01GamePlayer')
        .select('UserID, CorrectCount, AnsweredCount, TotalScore')
        .eq('GameID', session.GameID)
        .order('UserID', { ascending: true }),
      supabase
        .from('TblP01Attempt')
        .select('QID, UserID, Selected, IsCorrect, Score, ResponseTime')
        .eq('GameID', session.GameID),
    ]);

    if (playersError) throw playersError;
    if (attemptsError) throw attemptsError;

    return jsonResponse({
      ok: true,
      session,
      players: players || [],
      player_count: (players || []).length,
      attempts: attempts || [],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(err?.message || '讀取競賽狀態失敗。', 500);
  }
});
