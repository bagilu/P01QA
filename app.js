(function () {
  const config = window.APP_CONFIG || {};
  const invalidConfig = !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY ||
    String(config.SUPABASE_URL).includes('YOUR-PROJECT.supabase.co') ||
    String(config.SUPABASE_ANON_KEY).includes('YOUR-ANON-KEY');

  if (invalidConfig) {
    console.error('config.js 尚未填入正確的 SUPABASE_URL 或 SUPABASE_ANON_KEY');
    document.addEventListener('DOMContentLoaded', () => {
      const createMsg = document.getElementById('createMsg');
      const joinMsg = document.getElementById('joinMsg');
      const msg = 'config.js 尚未填入正確的 Supabase 連線資料。請把您原本可用的 SUPABASE_URL 與 SUPABASE_ANON_KEY 貼回 config.js。';
      if (createMsg) createMsg.textContent = msg;
      if (joinMsg) joinMsg.textContent = msg;
    });
    return;
  }

  const supabaseClient = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  const STORAGE_KEYS = {
    gameId: 'P01_GAME_ID',
    gameCode: 'P01_GAME_CODE',
    userId: 'P01_USER_ID',
    qcat: 'P01_QCAT',
    selectedQcats: 'P01_SELECTED_QCATS',
    host: 'P01_IS_HOST',
    seenQidsPrefix: 'P01_SEEN_QIDS_'
  };

  const QUESTION_SECONDS = 30;
  const POLL_MS = 1500;

  function $(id) {
    return document.getElementById(id);
  }

  function nowDbTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function parseDbTimestamp(value) {
    if (!value) return null;
    if (/([zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
      return new Date(value).getTime();
    }
    return new Date(String(value).replace(' ', 'T')).getTime();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getSeenKey(gameId) {
    return STORAGE_KEYS.seenQidsPrefix + gameId;
  }

  function getSeenQids(gameId) {
    try {
      return JSON.parse(localStorage.getItem(getSeenKey(gameId)) || '[]');
    } catch {
      return [];
    }
  }

  function addSeenQid(gameId, qid) {
    if (!gameId || !qid) return;
    const list = getSeenQids(gameId);
    if (!list.includes(qid)) {
      list.push(qid);
      localStorage.setItem(getSeenKey(gameId), JSON.stringify(list));
    }
  }

  function parseSelectedQcats(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return String(raw).split('|').map(x => x.trim()).filter(Boolean);
  }

  function getSelectedQcatsFromUI() {
    return Array.from(document.querySelectorAll('.subcategory-checkbox:checked'))
      .map(el => el.value.trim())
      .filter(Boolean);
  }

  async function loadCategoryBoard() {
    const board = $('categoryBoard');
    if (!board) return;

    try {
      const { data, error } = await supabaseClient
        .from('TblP01Question')
        .select('QCatMain, QCat')
        .order('QCatMain', { ascending: true })
        .order('QCat', { ascending: true });

      if (error) throw error;

      const grouped = new Map();
      (data || []).forEach(item => {
        const main = (item.QCatMain || '未分類').trim() || '未分類';
        const sub = (item.QCat || '').trim();
        if (!sub) return;
        if (!grouped.has(main)) grouped.set(main, new Map());
        const subMap = grouped.get(main);
        subMap.set(sub, (subMap.get(sub) || 0) + 1);
      });

      if (grouped.size === 0) {
        board.innerHTML = '<div class="small-muted">目前沒有可用類別。</div>';
        return;
      }

      board.innerHTML = '';
      [...grouped.entries()].forEach(([main, subs], mainIdx) => {
        const wrap = document.createElement('div');
        wrap.className = 'category-main-card';

        const subsHtml = [...subs.entries()].map(([sub, count], idx) => `
          <label class="form-check category-check">
            <input class="form-check-input subcategory-checkbox" type="checkbox" value="${escapeHtml(sub)}" id="cat_${mainIdx}_${idx}">
            <span class="form-check-label">${escapeHtml(sub)} (${count})</span>
          </label>
        `).join('');

        wrap.innerHTML = `
          <div class="category-main-title">${escapeHtml(main)}</div>
          <div class="category-sub-grid">${subsHtml}</div>
        `;
        board.appendChild(wrap);
      });
    } catch (err) {
      console.error(err);
      board.innerHTML = '<div class="small-muted">載入失敗</div>';
      const msg = $('createMsg');
      if (msg) msg.textContent = '讀取題目類別失敗：' + (err.message || '未知錯誤');
    }
  }

  function randomSixDigits() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function generateUniqueGameCode() {
    for (let i = 0; i < 20; i++) {
      const code = randomSixDigits();
      const { data, error } = await supabaseClient
        .from('TblP01GameSession')
        .select('GameID')
        .eq('GameCode', code)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return code;
    }
    throw new Error('無法產生不重複的 6 位數競賽代號，請再試一次。');
  }

  async function getRandomQuestionByQCats(qcats, excludedQids = []) {
    if (!Array.isArray(qcats) || qcats.length === 0) {
      throw new Error('尚未選擇題目小類別。');
    }

    let query = supabaseClient
      .from('TblP01Question')
      .select('QID, Q, CA, WA1, WA2, WA3, QCat')
      .in('QCat', qcats);

    if (excludedQids.length > 0) {
      query = query.not('QID', 'in', `(${excludedQids.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('已經沒有可出的新題目了。');
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];
  }

  async function createGame() {
    const createMsg = $('createMsg');
    createMsg.textContent = '';

    const userId = $('createUserId').value.trim();
    const selectedQcats = getSelectedQcatsFromUI();

    if (!userId) {
      createMsg.textContent = '請先輸入暱稱。';
      return;
    }
    if (selectedQcats.length === 0) {
      createMsg.textContent = '請至少勾選一個第二層題目類別。';
      return;
    }

    try {
      const gameCode = await generateUniqueGameCode();
      const qcatText = selectedQcats.join('、');

      const { data: inserted, error: sessionError } = await supabaseClient
        .from('TblP01GameSession')
        .insert([{
          GameCode: gameCode,
          HostUserID: userId,
          QCat: qcatText,
          SelectedQCats: JSON.stringify(selectedQcats),
          CurrentQuestionNo: 0,
          CurrentQID: null,
          StartedAt: null,
          Status: 'waiting'
        }])
        .select();

      if (sessionError) throw sessionError;
      const session = inserted[0];

      const { error: playerError } = await supabaseClient
        .from('TblP01GamePlayer')
        .insert([{
          GameID: session.GameID,
          UserID: userId,
          CorrectCount: 0,
          AnsweredCount: 0
        }]);

      if (playerError) throw playerError;

      localStorage.setItem(STORAGE_KEYS.gameId, String(session.GameID));
      localStorage.setItem(STORAGE_KEYS.gameCode, session.GameCode);
      localStorage.setItem(STORAGE_KEYS.userId, userId);
      localStorage.setItem(STORAGE_KEYS.qcat, qcatText);
      localStorage.setItem(STORAGE_KEYS.selectedQcats, JSON.stringify(selectedQcats));
      localStorage.setItem(STORAGE_KEYS.host, 'true');
      localStorage.setItem(getSeenKey(session.GameID), JSON.stringify([]));

      window.location.href = 'game.html';
    } catch (err) {
      console.error(err);
      createMsg.textContent = '建立競賽失敗：' + (err.message || '未知錯誤');
    }
  }

  async function joinGame() {
    const joinMsg = $('joinMsg');
    joinMsg.textContent = '';

    const userId = $('joinUserId').value.trim();
    const raw = $('joinCode').value;
    const gameCode = (raw || '').replace(/\s/g, '');

    if (!userId) {
      joinMsg.textContent = '請先輸入暱稱。';
      return;
    }
    if (!gameCode || gameCode.length !== 6) {
      joinMsg.textContent = '請輸入 6 位數競賽代號。';
      return;
    }

    try {
      const { data: sessions, error: sessionError } = await supabaseClient
        .from('TblP01GameSession')
        .select('*')
        .eq('GameCode', gameCode)
        .limit(1);

      if (sessionError) throw sessionError;
      if (!sessions || sessions.length === 0) {
        throw new Error('找不到此競賽代號。');
      }

      const session = sessions[0];
      if (session.Status === 'ended') {
        throw new Error('此競賽已結束，無法加入。');
      }

      const { error: playerError } = await supabaseClient
        .from('TblP01GamePlayer')
        .upsert([{
          GameID: session.GameID,
          UserID: userId,
          CorrectCount: 0,
          AnsweredCount: 0
        }], { onConflict: 'GameID,UserID' });

      if (playerError) throw playerError;

      localStorage.setItem(STORAGE_KEYS.gameId, String(session.GameID));
      localStorage.setItem(STORAGE_KEYS.gameCode, session.GameCode);
      localStorage.setItem(STORAGE_KEYS.userId, userId);
      localStorage.setItem(STORAGE_KEYS.qcat, session.QCat || '');
      localStorage.setItem(STORAGE_KEYS.selectedQcats, session.SelectedQCats || '[]');
      localStorage.setItem(STORAGE_KEYS.host, session.HostUserID === userId ? 'true' : 'false');

      window.location.href = 'game.html';
    } catch (err) {
      console.error(err);
      joinMsg.textContent = '加入競賽失敗：' + (err.message || '未知錯誤');
    }
  }

  async function initIndexPage() {
    await loadCategoryBoard();
    $('createGameBtn')?.addEventListener('click', createGame);
    $('joinGameBtn')?.addEventListener('click', joinGame);
  }

  async function initGamePage() {
    const gameId = localStorage.getItem(STORAGE_KEYS.gameId);
    const gameCode = localStorage.getItem(STORAGE_KEYS.gameCode);
    const userId = localStorage.getItem(STORAGE_KEYS.userId);
    const qcat = localStorage.getItem(STORAGE_KEYS.qcat);
    const isHost = localStorage.getItem(STORAGE_KEYS.host) === 'true';
    const selectedQcats = parseSelectedQcats(localStorage.getItem(STORAGE_KEYS.selectedQcats));

    if (!gameId || !gameCode || !userId) {
      window.location.href = 'index.html';
      return;
    }

    $('gameCode').textContent = gameCode;
    $('currentUser').textContent = userId;
    $('currentQCat').textContent = qcat || '未指定';

    if (isHost) {
      $('hostTools').style.display = 'block';
      $('nonHostTools').style.display = 'none';
      $('waitingHostTools').style.display = 'block';
      $('waitingNonHostText').style.display = 'none';
    }

    const state = {
      gameId: Number(gameId),
      gameCode,
      userId,
      qcat,
      selectedQcats,
      isHost,
      session: null,
      question: null,
      answers: [],
      submittedQids: new Set(),
      phase: 'waiting',
      isSubmitting: false,
      currentAnswerStats: null,
      pollInterval: null
    };

    $('nextBtn').addEventListener('click', () => manualNextQuestion(state));
    $('endBtn').addEventListener('click', () => endGame(state));
    $('startBtn').addEventListener('click', () => startFirstQuestion(state));

    await refreshSession(state, true);
    state.pollInterval = setInterval(() => refreshSession(state, false), POLL_MS);
  }

  function applySessionSelectionsToState(state, session) {
    state.selectedQcats = parseSelectedQcats(session.SelectedQCats);
    state.qcat = session.QCat || state.selectedQcats.join('、');
    $('currentQCat').textContent = state.qcat || '未指定';
  }

  async function refreshSession(state, forceReloadQuestion) {
    try {
      const { data: sessions, error } = await supabaseClient
        .from('TblP01GameSession')
        .select('*')
        .eq('GameID', state.gameId)
        .limit(1);

      if (error) throw error;
      if (!sessions || sessions.length === 0) {
        throw new Error('找不到競賽資料。');
      }

      const session = sessions[0];
      const previousQid = state.session?.CurrentQID;
      state.session = session;
      applySessionSelectionsToState(state, session);

      $('questionNo').textContent = session.CurrentQuestionNo || 0;
      const playerCount = await refreshPlayerCount(state);
      $('waitingPlayerText').textContent = `目前加入人數：${playerCount} 人`;

      if (session.Status === 'ended') {
        showEndedState(state);
        await renderRanking(state);
        return;
      }

      if (session.Status === 'waiting' || !session.CurrentQID) {
        showWaitingState(state);
        return;
      }

      showPlayingState();

      if (forceReloadQuestion || !state.question || state.question.QID !== session.CurrentQID || previousQid !== session.CurrentQID) {
        await loadCurrentQuestion(state, session.CurrentQID);
      }

      await handleQuestionAndResultPhase(state);
    } catch (err) {
      console.error(err);
      if ($('actionMsg')) $('actionMsg').textContent = '同步競賽失敗：' + (err.message || '未知錯誤');
    }
  }

  function showWaitingState(state) {
    state.phase = 'waiting';
    $('waitingPanel').style.display = 'block';
    $('playLayout').style.display = 'none';
    updateTimer(QUESTION_SECONDS);
    if (state.isHost) {
      $('startBtn').disabled = false;
    }
  }

  function showPlayingState() {
    $('waitingPanel').style.display = 'none';
    $('playLayout').style.display = 'flex';
  }

  function showEndedState(state) {
    state.phase = 'ended';
    $('waitingPanel').style.display = 'none';
    $('playLayout').style.display = 'flex';
    updateTimer(0);
    $('actionMsg').textContent = '主持者已結束本場競賽。';
    $('nextBtn').disabled = true;
    setAnswerOptionsDisabled(true);
  }

  async function refreshPlayerCount(state) {
    const { count, error } = await supabaseClient
      .from('TblP01GamePlayer')
      .select('*', { count: 'exact', head: true })
      .eq('GameID', state.gameId);

    if (!error) {
      $('playerCount').textContent = count ?? 0;
      return count ?? 0;
    }
    return 0;
  }

  async function loadCurrentQuestion(state, qid) {
    if (!qid) return;

    const { data: questions, error } = await supabaseClient
      .from('TblP01Question')
      .select('QID, Q, CA, WA1, WA2, WA3')
      .eq('QID', qid)
      .limit(1);

    if (error) throw error;
    if (!questions || questions.length === 0) {
      throw new Error('找不到目前題目。');
    }

    state.question = questions[0];
    addSeenQid(state.gameId, qid);
    state.phase = 'question';
    state.currentAnswerStats = null;
    state.isSubmitting = false;

    $('questionText').textContent = state.question.Q;
    $('actionMsg').textContent = '';
    $('correctArea').textContent = '';
    $('distributionArea').innerHTML = '尚未結算。';
    $('nextBtn').disabled = true;

    state.answers = shuffle([
      state.question.CA,
      state.question.WA1,
      state.question.WA2,
      state.question.WA3
    ]);

    const answerArea = $('answerArea');
    answerArea.innerHTML = '';

    state.answers.forEach((answer, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'answer-option';
      option.dataset.value = answer;
      option.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(answer)}`;
      option.addEventListener('click', () => chooseAndSubmitAnswer(state, answer));
      answerArea.appendChild(option);
    });

    const { data: attempts } = await supabaseClient
      .from('TblP01Attempt')
      .select('QID')
      .eq('GameID', state.gameId)
      .eq('UserID', state.userId)
      .eq('QID', state.question.QID)
      .limit(1);

    const alreadySubmitted = !!(attempts && attempts.length > 0);
    if (alreadySubmitted) {
      state.submittedQids.add(state.question.QID);
      setAnswerOptionsDisabled(true);
      $('actionMsg').textContent = '您已送出本題答案，請等待本題結束。';
    } else {
      setAnswerOptionsDisabled(false);
    }
  }

  function updateTimer(seconds) {
    $('timer').textContent = seconds;
  }

  function setAnswerOptionsDisabled(disabled) {
    document.querySelectorAll('.answer-option').forEach(el => {
      el.disabled = !!disabled;
      el.classList.toggle('disabled', !!disabled);
    });
  }

  function markSelectedAnswer(selectedValue) {
    document.querySelectorAll('.answer-option').forEach(el => {
      el.classList.remove('selected');
      if (el.dataset.value === selectedValue) {
        el.classList.add('selected');
      }
    });
  }

  async function getCurrentQuestionStats(state) {
    const [playersResult, attemptsResult] = await Promise.all([
      supabaseClient
        .from('TblP01GamePlayer')
        .select('UserID')
        .eq('GameID', state.gameId),
      supabaseClient
        .from('TblP01Attempt')
        .select('UserID, QID')
        .eq('GameID', state.gameId)
        .eq('QID', state.question.QID)
    ]);

    const players = playersResult.error ? [] : (playersResult.data || []);
    const attempts = attemptsResult.error ? [] : (attemptsResult.data || []);

    return {
      playerCount: players.length,
      answeredCount: attempts.length
    };
  }

  async function chooseAndSubmitAnswer(state, selectedValue) {
    $('actionMsg').textContent = '';

    if (!state.question || !state.session || state.isSubmitting || state.phase !== 'question') return;

    const start = parseDbTimestamp(state.session.StartedAt);
    const elapsed = Math.floor((Date.now() - start) / 1000);
    if (elapsed >= QUESTION_SECONDS) {
      $('actionMsg').textContent = '本題時間已到，無法再送出。';
      setAnswerOptionsDisabled(true);
      return;
    }

    if (state.submittedQids.has(state.question.QID)) {
      $('actionMsg').textContent = '您已送出本題答案，請等待本題結束。';
      setAnswerOptionsDisabled(true);
      return;
    }

    state.isSubmitting = true;
    markSelectedAnswer(selectedValue);

    const isCorrect = selectedValue === state.question.CA;
    const responseTime = elapsed;

    try {
      const { data: existing } = await supabaseClient
        .from('TblP01Attempt')
        .select('AttemptID')
        .eq('GameID', state.gameId)
        .eq('UserID', state.userId)
        .eq('QID', state.question.QID)
        .limit(1);

      if (existing && existing.length > 0) {
        state.submittedQids.add(state.question.QID);
        $('actionMsg').textContent = '您已送出本題答案，請等待本題結束。';
        setAnswerOptionsDisabled(true);
        return;
      }

      const { error: insertError } = await supabaseClient
        .from('TblP01Attempt')
        .insert([{
          QID: state.question.QID,
          UserID: state.userId,
          Selected: selectedValue,
          IsCorrect: isCorrect,
          QCat: state.qcat,
          ResponseTime: responseTime,
          GameID: state.gameId,
          GameCode: state.gameCode
        }]);

      if (insertError) throw insertError;

      const { data: players, error: playerError } = await supabaseClient
        .from('TblP01GamePlayer')
        .select('PlayerID, CorrectCount, AnsweredCount')
        .eq('GameID', state.gameId)
        .eq('UserID', state.userId)
        .limit(1);

      if (playerError) throw playerError;
      if (players && players.length > 0) {
        const player = players[0];
        const { error: updateError } = await supabaseClient
          .from('TblP01GamePlayer')
          .update({
            CorrectCount: (player.CorrectCount || 0) + (isCorrect ? 1 : 0),
            AnsweredCount: (player.AnsweredCount || 0) + 1
          })
          .eq('PlayerID', player.PlayerID);

        if (updateError) throw updateError;
      }

      state.submittedQids.add(state.question.QID);
      setAnswerOptionsDisabled(true);
      $('actionMsg').textContent = '已送出答案，請等待本題結束。';

      await handleQuestionAndResultPhase(state);
    } catch (err) {
      console.error(err);
      $('actionMsg').textContent = '送出答案失敗：' + (err.message || '未知錯誤');
      setAnswerOptionsDisabled(false);
    } finally {
      state.isSubmitting = false;
    }
  }

  async function handleQuestionAndResultPhase(state) {
    if (!state.session || !state.question || state.phase === 'ended' || state.phase === 'waiting') return;

    const start = parseDbTimestamp(state.session.StartedAt);
    if (!start) return;

    const elapsed = Math.floor((Date.now() - start) / 1000);
    const remaining = Math.max(0, QUESTION_SECONDS - elapsed);
    const stats = await getCurrentQuestionStats(state);
    state.currentAnswerStats = stats;
    const allAnswered = stats.playerCount > 0 && stats.answeredCount >= stats.playerCount;
    const timeUp = remaining <= 0;

    if (!allAnswered && !timeUp) {
      state.phase = 'question';
      updateTimer(remaining);
      if (state.submittedQids.has(state.question.QID)) {
        setAnswerOptionsDisabled(true);
      }
      if (state.isHost) {
        $('nextBtn').disabled = true;
      }
      return;
    }

    state.phase = 'result';
    updateTimer(0);
    setAnswerOptionsDisabled(true);

    if (state.isHost) {
      $('nextBtn').disabled = false;
    }

    await renderDistribution(state, stats);
    await renderRanking(state);

    if (state.isHost) {
      $('actionMsg').textContent = allAnswered
        ? '全體已作答完成，主持者現在可以按「下一題」。'
        : '本題時間結束，主持者現在可以按「下一題」。';
    } else {
      $('actionMsg').textContent = allAnswered
        ? '全體已作答完成，請等待主持者切換下一題。'
        : '本題時間結束，請等待主持者切換下一題。';
    }
  }

  async function renderDistribution(state, stats = null) {
    const { data: attempts, error } = await supabaseClient
      .from('TblP01Attempt')
      .select('Selected')
      .eq('GameID', state.gameId)
      .eq('QID', state.question.QID);

    if (error) throw error;

    const counts = {};
    state.answers.forEach(answer => { counts[answer] = 0; });
    (attempts || []).forEach(item => {
      counts[item.Selected] = (counts[item.Selected] || 0) + 1;
    });

    const html = state.answers.map((answer, idx) => {
      const label = String.fromCharCode(65 + idx);
      const marker = answer === state.question.CA ? '（正確答案）' : '';
      return `<div class="mb-2"><strong>${label}.</strong> ${escapeHtml(answer)} — ${counts[answer] || 0} 人 ${marker}</div>`;
    }).join('');

    $('distributionArea').innerHTML = html;
    $('correctArea').textContent = '正確答案：' + state.question.CA + (stats ? ` ｜ 已作答 ${stats.answeredCount}/${stats.playerCount} 人` : '');
  }

  async function renderRanking(state) {
    const { data: players, error } = await supabaseClient
      .from('TblP01GamePlayer')
      .select('UserID, CorrectCount, AnsweredCount')
      .eq('GameID', state.gameId);

    if (error) throw error;

    const basePlayers = (players || []).map(player => ({
      UserID: player.UserID,
      CorrectCount: player.CorrectCount || 0,
      AnsweredCount: player.AnsweredCount || 0,
      Score: (player.AnsweredCount || 0) > 0 ? (player.CorrectCount || 0) / player.AnsweredCount : 0
    }));

    const rateRanked = [...basePlayers]
      .sort((a, b) => {
        if (b.Score !== a.Score) return b.Score - a.Score;
        if (b.CorrectCount !== a.CorrectCount) return b.CorrectCount - a.CorrectCount;
        if (b.AnsweredCount !== a.AnsweredCount) return b.AnsweredCount - a.AnsweredCount;
        return a.UserID.localeCompare(b.UserID);
      })
      .slice(0, 5);

    const countRanked = [...basePlayers]
      .sort((a, b) => {
        if (b.CorrectCount !== a.CorrectCount) return b.CorrectCount - a.CorrectCount;
        if (b.Score !== a.Score) return b.Score - a.Score;
        if (b.AnsweredCount !== a.AnsweredCount) return b.AnsweredCount - a.AnsweredCount;
        return a.UserID.localeCompare(b.UserID);
      })
      .slice(0, 5);

    if (rateRanked.length === 0) {
      $('rankArea').innerHTML = '尚無資料。';
      return;
    }

    const renderRows = (ranked, valueType) => ranked.map((player, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(player.UserID)}</td>
        <td>${valueType === 'rate' ? `${(player.Score * 100).toFixed(1)}%` : player.CorrectCount}</td>
        <td>${player.CorrectCount}/${player.AnsweredCount}</td>
      </tr>
    `).join('');

    $('rankArea').innerHTML = `
      <div class="mb-3 fw-bold">排名一：答對率</div>
      <div class="table-responsive mb-4">
        <table class="table table-sm rank-table align-middle mb-0">
          <thead>
            <tr>
              <th>名次</th>
              <th>暱稱</th>
              <th>答對率</th>
              <th>答對/作答</th>
            </tr>
          </thead>
          <tbody>${renderRows(rateRanked, 'rate')}</tbody>
        </table>
      </div>

      <div class="mb-3 fw-bold">排名二：答對數</div>
      <div class="table-responsive">
        <table class="table table-sm rank-table align-middle mb-0">
          <thead>
            <tr>
              <th>名次</th>
              <th>暱稱</th>
              <th>答對數</th>
              <th>答對/作答</th>
            </tr>
          </thead>
          <tbody>${renderRows(countRanked, 'count')}</tbody>
        </table>
      </div>
    `;
  }

  async function startFirstQuestion(state) {
    if (!state.isHost) return;
    $('startBtn').disabled = true;
    try {
      const firstQuestion = await getRandomQuestionByQCats(state.selectedQcats, getSeenQids(state.gameId));
      addSeenQid(state.gameId, firstQuestion.QID);

      const { error } = await supabaseClient
        .from('TblP01GameSession')
        .update({
          CurrentQuestionNo: 1,
          CurrentQID: firstQuestion.QID,
          StartedAt: nowDbTimestamp(),
          Status: 'playing'
        })
        .eq('GameID', state.gameId);

      if (error) throw error;
      await refreshSession(state, true);
    } catch (err) {
      console.error(err);
      $('startBtn').disabled = false;
      alert('開始第一題失敗：' + (err.message || '未知錯誤'));
    }
  }

  async function manualNextQuestion(state) {
    $('nextBtn').disabled = true;
    await autoAdvanceQuestion(state);
  }

  async function autoAdvanceQuestion(state) {
    try {
      const excludedQids = getSeenQids(state.gameId);
      const nextQuestion = await getRandomQuestionByQCats(state.selectedQcats, excludedQids);
      addSeenQid(state.gameId, nextQuestion.QID);

      const { error } = await supabaseClient
        .from('TblP01GameSession')
        .update({
          CurrentQuestionNo: (state.session.CurrentQuestionNo || 0) + 1,
          CurrentQID: nextQuestion.QID,
          StartedAt: nowDbTimestamp(),
          Status: 'playing'
        })
        .eq('GameID', state.gameId);

      if (error) throw error;
      await refreshSession(state, true);
    } catch (err) {
      console.error(err);
      $('actionMsg').textContent = '切換下一題失敗：' + (err.message || '未知錯誤');
    }
  }

  async function endGame(state) {
    if (!confirm('確定要結束這場競賽嗎？')) return;

    try {
      const { error } = await supabaseClient
        .from('TblP01GameSession')
        .update({
          Status: 'ended',
          EndedAt: nowDbTimestamp()
        })
        .eq('GameID', state.gameId);

      if (error) throw error;
      await refreshSession(state, false);
    } catch (err) {
      console.error(err);
      $('actionMsg').textContent = '結束競賽失敗：' + (err.message || '未知錯誤');
    }
  }

  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    initIndexPage();
  } else if (window.location.pathname.endsWith('game.html')) {
    initGamePage();
  }
})();
