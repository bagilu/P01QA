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
    const { game_id, user_id } = await req.json();
    const gameId = Number(game_id);
    const userId = String(user_id || '').trim();
    if (!gameId || !userId) return errorResponse('缺少結束競賽所需資料。');

    const supabase = getAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from('TblP01GameSession')
      .select('GameID, HostUserID')
      .eq('GameID', gameId)
      .single();
    if (sessionError) throw sessionError;
    if (!session) return errorResponse('找不到競賽資料。', 404);
    if (session.HostUserID !== userId) return errorResponse('只有主持者可以結束競賽。', 403);

    const { data: updated, error: updateError } = await supabase
      .from('TblP01GameSession')
      .update({ Status: 'ended', EndedAt: new Date().toISOString() })
      .eq('GameID', gameId)
      .select()
      .single();
    if (updateError) throw updateError;

    return jsonResponse({ ok: true, session: updated });
  } catch (err) {
    console.error(err);
    return errorResponse(err?.message || '結束競賽失敗。', 500);
  }
});
