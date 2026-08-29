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

const QUESTION_SECONDS = 30;

function parseTime(value: string | null) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { game_id, game_code, user_id, qid, selected } = await req.json();
    const gameId = Number(game_id);
    const gameCode = String(game_code || '').trim();
    const userId = String(user_id || '').trim();
    const qidNumber = Number(qid);
    const selectedValue = String(selected || '').trim();

    if (!gameId || !userId || !qidNumber || !selectedValue) return errorResponse('缺少送出答案所需資料。');

    const supabase = getAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from('TblP01GameSession')
      .select('GameID, GameCode, QCat, CurrentQID, StartedAt, Status')
      .eq('GameID', gameId)
      .single();
    if (sessionError) throw sessionError;
    if (!session) return errorResponse('找不到競賽資料。', 404);
    if (session.Status !== 'playing') return errorResponse('目前不是作答狀態。');
    if (Number(session.CurrentQID) !== qidNumber) return errorResponse('目前題目已切換，無法送出舊題答案。');
    if (gameCode && session.GameCode !== gameCode) return errorResponse('競賽代號不一致。');

    const startMs = parseTime(session.StartedAt);
    if (!startMs) return errorResponse('本題尚未開始。');
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    if (elapsed >= QUESTION_SECONDS) return errorResponse('本題時間已到，無法再送出。');

    const { data: existing, error: existingError } = await supabase
      .from('TblP01Attempt')
      .select('AttemptID, IsCorrect, Score')
      .eq('GameID', gameId)
      .eq('UserID', userId)
      .eq('QID', qidNumber)
      .limit(1);
    if (existingError) throw existingError;
    if (existing && existing.length > 0) {
      return jsonResponse({ ok: true, already_submitted: true, is_correct: existing[0].IsCorrect, score: existing[0].Score || 0 });
    }

    const { data: player, error: playerError } = await supabase
      .from('TblP01GamePlayer')
      .select('PlayerID, CorrectCount, AnsweredCount, TotalScore')
      .eq('GameID', gameId)
      .eq('UserID', userId)
      .limit(1)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!player) return errorResponse('尚未加入此競賽，無法作答。', 403);

    const { data: question, error: questionError } = await supabase
      .from('TblP01Question')
      .select('QID, CA')
      .eq('QID', qidNumber)
      .single();
    if (questionError) throw questionError;
    if (!question) return errorResponse('找不到題目。', 404);

    const isCorrect = selectedValue === question.CA;
    const responseTime = Math.max(0, elapsed);
    const score = isCorrect ? Math.max(0, QUESTION_SECONDS - responseTime) : 0;

    const { error: insertError } = await supabase
      .from('TblP01Attempt')
      .insert([{
        QID: qidNumber,
        UserID: userId,
        Selected: selectedValue,
        IsCorrect: isCorrect,
        QCat: session.QCat || '',
        ResponseTime: responseTime,
        Score: score,
        GameID: gameId,
        GameCode: session.GameCode,
      }]);

    if (insertError) {
      if (String(insertError.message || '').includes('duplicate') || String(insertError.code || '') === '23505') {
        return jsonResponse({ ok: true, already_submitted: true, is_correct: false, score: 0 });
      }
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from('TblP01GamePlayer')
      .update({
        CorrectCount: (player.CorrectCount || 0) + (isCorrect ? 1 : 0),
        AnsweredCount: (player.AnsweredCount || 0) + 1,
        TotalScore: (player.TotalScore || 0) + score,
      })
      .eq('PlayerID', player.PlayerID);
    if (updateError) throw updateError;

    return jsonResponse({ ok: true, already_submitted: false, is_correct: isCorrect, response_time: responseTime, score });
  } catch (err) {
    console.error(err);
    return errorResponse(err?.message || '送出答案失敗。', 500);
  }
});
