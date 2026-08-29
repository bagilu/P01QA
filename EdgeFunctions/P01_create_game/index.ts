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

function randomSixDigits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { user_id, selected_qcats } = await req.json();
    const userId = String(user_id || '').trim();
    const selectedQcats = Array.isArray(selected_qcats)
      ? selected_qcats.map((x) => String(x).trim()).filter(Boolean)
      : [];

    if (!userId) return errorResponse('請先輸入暱稱。');
    if (selectedQcats.length === 0) return errorResponse('請至少勾選一個第二層題目類別。');

    const supabase = getAdminClient();
    let gameCode = '';
    for (let i = 0; i < 20; i++) {
      const code = randomSixDigits();
      const { data, error } = await supabase
        .from('TblP01GameSession')
        .select('GameID')
        .eq('GameCode', code)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) {
        gameCode = code;
        break;
      }
    }
    if (!gameCode) return errorResponse('無法產生不重複的 6 位數競賽代號。', 500);

    const qcatText = selectedQcats.join('、');
    const { data: inserted, error: sessionError } = await supabase
      .from('TblP01GameSession')
      .insert([{
        GameCode: gameCode,
        HostUserID: userId,
        QCat: qcatText,
        SelectedQCats: JSON.stringify(selectedQcats),
        CurrentQuestionNo: 0,
        CurrentQID: null,
        StartedAt: null,
        Status: 'waiting',
      }])
      .select()
      .single();
    if (sessionError) throw sessionError;

    const { error: playerError } = await supabase
      .from('TblP01GamePlayer')
      .insert([{
        GameID: inserted.GameID,
        UserID: userId,
        CorrectCount: 0,
        AnsweredCount: 0,
        TotalScore: 0,
      }]);
    if (playerError) throw playerError;

    return jsonResponse({ ok: true, session: inserted });
  } catch (err) {
    console.error(err);
    return errorResponse(err?.message || '建立競賽失敗。', 500);
  }
});
