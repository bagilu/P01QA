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
    seenQidsPrefix: 'P01_SEEN_QIDS_',
    lastNickname: 'P01_LAST_NICKNAME'
  };

  const QUESTION_SECONDS = 30;
  const POLL_MS = 1500;

  function $(id) {
    return document.getElementById(id);
  }

  async function callFunction(name, body) {
    const { data, error } = await supabaseClient.functions.invoke(name, { body });
    if (error) throw error;
    if (!data || data.ok === false) throw new Error(data?.error || `${name} 執行失敗`);
    return data;
  }

  function parseDbTimestamp(value) {
    if (!value) return null;
    let text = String(value).trim().replace(' ', 'T');
    // Supabase 若欄位是 timestamp without time zone，可能回傳沒有 Z / +00:00 的字串。
    // 這類 StartedAt 由 Edge Function 寫入 ISO UTC 時間，前端必須以 UTC 解讀，否則台灣時區會被誤判為已過 8 小時，導致題目一出現就結束。
    if (!/([zZ]|[+-]\d{2}:\d{2})$/.test(text)) {
      text += 'Z';
    }
    const ms = new Date(text).getTime();
    return Number.isFinite(ms) ? ms : null;
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


  function getJoinUrl(gameCode) {
    const base = window.location.href.replace(/game\.html.*$/i, 'index.html').replace(/index\.html.*$/i, 'index.html');
    const url = new URL(base, window.location.href);
    url.searchParams.set('code', gameCode || '');
    return url.toString();
  }

  function renderQrCode(elementId, url, size = 128) {
    const el = $(elementId);
    if (!el || !url) return;
    el.innerHTML = '';
    if (window.QRCode) {
      new window.QRCode(el, {
        text: url,
        width: size,
        height: size,
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      el.innerHTML = '<div class="small-muted">QRCode 載入中。若未顯示，請使用下方加入連結。</div>';
    }
  }

  function setupShareQr(gameCode) {
    if (!gameCode) return;
    const url = getJoinUrl(gameCode);
    renderQrCode('shareQrHeader', url, 86);
    renderQrCode('shareQrWaiting', url, 142);
    ['shareLinkHeader', 'shareLinkWaiting'].forEach(id => {
      const link = $(id);
      if (link) link.href = url;
    });
  }

  function getCodeFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = (params.get('code') || params.get('gameCode') || '').replace(/\D/g, '').slice(0, 6);
      return code.length === 6 ? code : '';
    } catch {
      return '';
    }
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
      const detail = err?.message || err?.details || err?.hint || '未知錯誤';
      board.innerHTML = `<div class="alert alert-danger py-2 mb-0"><strong>題庫載入失敗</strong><br><span class="small">${escapeHtml(detail)}</span></div>`;
      const msg = $('createMsg');
      if (msg) msg.textContent = '讀取題目類別失敗：' + detail;
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
      const result = await callFunction('P01_create_game', {
        user_id: userId,
        selected_qcats: selectedQcats
      });
      const session = result.session;
      const qcatText = selectedQcats.join('、');

      localStorage.setItem(STORAGE_KEYS.gameId, String(session.GameID));
      localStorage.setItem(STORAGE_KEYS.gameCode, session.GameCode);
      localStorage.setItem(STORAGE_KEYS.userId, userId);
      localStorage.setItem(STORAGE_KEYS.lastNickname, userId);
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
      const result = await callFunction('P01_join_game', {
        user_id: userId,
        game_code: gameCode
      });
      const session = result.session;

      localStorage.setItem(STORAGE_KEYS.gameId, String(session.GameID));
      localStorage.setItem(STORAGE_KEYS.gameCode, session.GameCode);
      localStorage.setItem(STORAGE_KEYS.userId, userId);
      localStorage.setItem(STORAGE_KEYS.lastNickname, userId);
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
    const lastNickname = localStorage.getItem(STORAGE_KEYS.lastNickname) || localStorage.getItem(STORAGE_KEYS.userId) || '';
    if (lastNickname) {
      if ($('createUserId')) $('createUserId').value = lastNickname;
      if ($('joinUserId')) $('joinUserId').value = lastNickname;
    }

    const codeFromUrl = getCodeFromUrl();
    if (codeFromUrl && $('joinCode')) {
      $('joinCode').value = codeFromUrl;
      document.body.classList.add('scan-join-mode');
      const createDetails = $('createPanelDetails');
      if (createDetails) createDetails.open = false;
      const createCol = $('createPanelCol');
      const joinCol = $('joinPanelCol');
      if (createCol) {
        createCol.style.display = 'none';
        createCol.className = 'col-lg-4 order-lg-2';
      }
      if (joinCol) joinCol.className = 'col-lg-7 mx-auto order-lg-1';
      const codeGroup = $('joinCodeGroup');
      if (codeGroup) codeGroup.style.display = 'none';
      const scanBox = $('scanJoinBox');
      if (scanBox) scanBox.style.display = 'block';
      renderQrCode('scanJoinQr', getJoinUrl(codeFromUrl), 132);
      const hint = $('joinHint');
      if (hint) {
        hint.style.display = 'block';
        hint.innerHTML = `已從 QR Code 帶入競賽代號：<strong>${escapeHtml(codeFromUrl)}</strong>。請輸入暱稱後按「加入競賽」。`;
      }
      setTimeout(() => $('joinUserId')?.focus(), 150);
    }

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
    setupShareQr(gameCode);
    $('currentUser').textContent = userId;
    $('currentQCat').textContent = qcat || '未指定';

    if (isHost) {
      if ($('hostTools')) $('hostTools').style.display = 'block';
      if ($('nonHostTools')) $('nonHostTools').style.display = 'none';
      if ($('endBtn')) $('endBtn').style.display = 'inline-block';
      if ($('waitingHostTools')) $('waitingHostTools').style.display = 'block';
      if ($('waitingNonHostText')) $('waitingNonHostText').style.display = 'none';
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
      players: [],
      attempts: [],
      playerCount: 0,
      pollInterval: null
    };

    $('nextBtn').addEventListener('click', () => manualNextQuestion(state));
    $('endBtn')?.addEventListener('click', () => endGame(state));
    $('startBtn').addEventListener('click', () => startFirstQuestion(state));

    await refreshSession(state, true);
    state.pollInterval = setInterval(() => refreshSession(state, false), POLL_MS);
  }

  function applySessionSelectionsToState(state, session) {
    state.selectedQcats = parseSelectedQcats(session.SelectedQCats);
    state.qcat = session.QCat || state.selectedQcats.join('、');
    $('currentQCat').textContent = state.qcat || '未指定';
  }

  async function getGameState(state) {
    const result = await callFunction('P01_get_game_state', {
      game_id: state.gameId,
      game_code: state.gameCode,
      user_id: state.userId
    });

    state.players = result.players || [];
    state.attempts = result.attempts || [];
    state.playerCount = typeof result.player_count === 'number' ? result.player_count : state.players.length;

    if ($('playerCount')) $('playerCount').textContent = state.playerCount;
    if ($('waitingPlayerText')) $('waitingPlayerText').textContent = `目前加入人數：${state.playerCount} 人`;

    return result.session;
  }

  async function refreshSession(state, forceReloadQuestion) {
    try {
      const session = await getGameState(state);
      if (!session || !session.GameID) {
        throw new Error('找不到競賽資料。');
      }

      const previousQid = state.session?.CurrentQID;
      state.session = session;
      applySessionSelectionsToState(state, session);

      $('questionNo').textContent = session.CurrentQuestionNo || 0;

      if (session.Status === 'ended') {
        showEndedState(state);
        await renderRanking(state);
        return;
      }

      if (session.Status === 'waiting' || !session.CurrentQID) {
        showWaitingState(state);
        return;
      }

      showPlayingState(state);

      if (forceReloadQuestion || !state.question || state.question.QID !== session.CurrentQID || previousQid !== session.CurrentQID) {
        await loadCurrentQuestion(state, session.CurrentQID);
      }

      await getGameState(state);
      await handleQuestionAndResultPhase(state);
    } catch (err) {
      console.error(err);
      if ($('actionMsg')) $('actionMsg').textContent = '同步競賽失敗：' + (err.message || '未知錯誤');
    }
  }

  function showWaitingState(state) {
    state.phase = 'waiting';
    setResultOnlyMode(false);
    if ($('lobbyScreen')) $('lobbyScreen').style.display = 'block';
    if ($('quizScreen')) $('quizScreen').style.display = 'none';
    if ($('waitingPanel')) $('waitingPanel').style.display = 'block';
    if ($('playLayout')) $('playLayout').style.display = 'none';
    document.body.classList.remove('playing-compact-mode');
    updateTimer(QUESTION_SECONDS);
    if (state.isHost && $('startBtn')) {
      $('startBtn').disabled = false;
    }
  }

  function showPlayingState(state) {
    if ($('lobbyScreen')) $('lobbyScreen').style.display = 'none';
    if ($('quizScreen')) $('quizScreen').style.display = 'block';
    if ($('waitingPanel')) $('waitingPanel').style.display = 'none';
    if ($('playLayout')) $('playLayout').style.display = 'flex';
    document.body.classList.add('playing-compact-mode');
  }

  function setResultOnlyMode(enabled) {
    const questionColumn = $('questionColumn');
    const rankColumn = $('rankColumn');
    const resultPanel = $('resultPanel');
    if (questionColumn) questionColumn.style.display = enabled ? 'none' : '';
    if (resultPanel) resultPanel.style.display = enabled ? 'none' : '';
    if (rankColumn) {
      rankColumn.classList.toggle('col-lg-4', !enabled);
      rankColumn.classList.toggle('col-lg-12', !!enabled);
    }
  }

  function showEndedState(state) {
    state.phase = 'ended';
    setResultOnlyMode(true);
    if ($('lobbyScreen')) $('lobbyScreen').style.display = 'none';
    if ($('quizScreen')) $('quizScreen').style.display = 'block';
    if ($('waitingPanel')) $('waitingPanel').style.display = 'none';
    if ($('playLayout')) $('playLayout').style.display = 'flex';
    document.body.classList.add('playing-compact-mode');

    updateTimer(0);
    if ($('actionMsg')) $('actionMsg').textContent = '主持者已結束本場競賽。';
    if ($('nextBtn')) $('nextBtn').disabled = true;
    setAnswerOptionsDisabled(true);
  }

  async function refreshPlayerCount(state) {
    // v20: 參加人數改由 P01_get_game_state 回傳，避免主持人端被 RLS / PostgREST select 狀態影響。
    const count = state.playerCount || (state.players || []).length || 0;
    if ($('playerCount')) $('playerCount').textContent = count;
    if ($('waitingPlayerText')) $('waitingPlayerText').textContent = `目前加入人數：${count} 人`;
    return count;
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

    renderQuestionObject(state, questions[0]);

    // v20: 主持人也是玩家，也要檢查自己是否已作答。
    // 作答紀錄改由 P01_get_game_state 回傳，避免主持人端直接讀 TblP01Attempt 時受 RLS 狀態影響。
    const alreadySubmitted = (state.attempts || []).some(item =>
      String(item.UserID) === String(state.userId) && Number(item.QID) === Number(state.question.QID)
    );
    if (alreadySubmitted) {
      state.submittedQids.add(state.question.QID);
      setAnswerOptionsDisabled(true);
      $('actionMsg').textContent = '您已送出本題答案，請等待本題結束。';
    }
  }



  function renderQuestionObject(state, question) {
    state.question = question;
    addSeenQid(state.gameId, question.QID);
    setResultOnlyMode(false);
    if ($('resultStatus')) $('resultStatus').textContent = '';
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

    // v19: 主持人也是玩家。主持人開始出題後，也必須在自己的畫面作答。
    setAnswerOptionsDisabled(false);
    $('actionMsg').textContent = state.isHost
      ? '主持人也需要作答。本題結束後會顯示三種排行榜。'
      : '請選擇答案。';
  }

  function updateTimer(seconds) {
    if ($('timer')) $('timer').textContent = seconds;
    const bar = $('timerBar');
    if (bar) {
      const pct = Math.max(0, Math.min(100, (Number(seconds) / QUESTION_SECONDS) * 100));
      bar.style.width = pct + '%';
      bar.classList.toggle('timer-low', pct <= 30);
    }
  }

  function setAnswerOptionsDisabled(disabled) {
    document.querySelectorAll('.answer-option').forEach(el => {
      el.disabled = !!disabled;
      el.classList.toggle('disabled', !!disabled);
      el.classList.toggle('answer-locked', !!disabled);
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
    // 每次判斷是否全體作答前，先透過 Function 取得最新玩家與作答狀態。
    await getGameState(state);
    const players = state.players || [];
    const attempts = (state.attempts || []).filter(item => Number(item.QID) === Number(state.question.QID));

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
    const answerScore = isCorrect ? Math.max(0, QUESTION_SECONDS - elapsed) : 0;

    try {
      const result = await callFunction('P01_submit_answer', {
        game_id: state.gameId,
        game_code: state.gameCode,
        user_id: state.userId,
        qid: state.question.QID,
        selected: selectedValue
      });

      state.submittedQids.add(state.question.QID);
      setAnswerOptionsDisabled(true);

      if (result.already_submitted) {
        $('actionMsg').textContent = '您已送出本題答案，請等待本題結束。';
      } else if (result.is_correct) {
        $('actionMsg').textContent = `已送出答案，答對得 ${result.score || 0} 分，請等待本題結束。`;
      } else {
        $('actionMsg').textContent = '已送出答案，本題未得分，請等待本題結束。';
      }

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
      setResultOnlyMode(false);
      updateTimer(remaining);
      if ($('resultStatus')) $('resultStatus').textContent = '';
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
    setResultOnlyMode(true);

    if (state.isHost) {
      $('nextBtn').disabled = false;
    }

    await renderDistribution(state, stats);
    await renderRanking(state);

    const statusText = state.isHost
      ? (allAnswered ? '全體已作答完成，主持者現在可以按「下一題」。' : '本題時間結束，主持者現在可以按「下一題」。')
      : (allAnswered ? '全體已作答完成，請等待主持者切換下一題。' : '本題時間結束，請等待主持者切換下一題。');
    if ($('resultStatus')) $('resultStatus').textContent = statusText;
    if ($('actionMsg')) $('actionMsg').textContent = statusText;
  }

  async function renderDistribution(state, stats = null) {
    // v20: 作答分布改用 P01_get_game_state 回傳資料，避免直接讀 Attempt 時受 RLS 影響。
    await getGameState(state);
    const attempts = (state.attempts || []).filter(item => Number(item.QID) === Number(state.question.QID));

    const counts = {};
    state.answers.forEach(answer => { counts[answer] = 0; });
    attempts.forEach(item => {
      counts[item.Selected] = (counts[item.Selected] || 0) + 1;
    });

    const html = state.answers.map((answer, idx) => {
      const label = String.fromCharCode(65 + idx);
      const marker = answer === state.question.CA ? '（正確答案）' : '';
      return `<div class="mb-2"><strong>${label}.</strong> ${escapeHtml(answer)} — ${counts[answer] || 0} 人 ${marker}</div>`;
    }).join('');

    const scoreRows = attempts
      .filter(item => item.IsCorrect)
      .sort((a, b) => (b.Score || 0) - (a.Score || 0))
      .map(item => `<div class="small-muted">${escapeHtml(item.UserID)}：${item.Score || 0} 分</div>`)
      .join('');

    $('distributionArea').innerHTML = html + (scoreRows ? `<div class="mt-3 fw-bold">本題得分</div>${scoreRows}` : '');
    $('correctArea').textContent = '正確答案：' + state.question.CA + (stats ? ` ｜ 已作答 ${stats.answeredCount}/${stats.playerCount} 人` : '');
  }

  async function renderRanking(state) {
    // v20: 排行榜改用 P01_get_game_state 回傳資料，避免主持人端直接讀 GamePlayer 失敗。
    await getGameState(state);
    const basePlayers = (state.players || []).map(player => ({
      UserID: player.UserID,
      CorrectCount: player.CorrectCount || 0,
      AnsweredCount: player.AnsweredCount || 0,
      TotalScore: player.TotalScore || 0,
      Accuracy: (player.AnsweredCount || 0) > 0 ? (player.CorrectCount || 0) / player.AnsweredCount : 0
    }));

    const rateRanked = [...basePlayers]
      .sort((a, b) => {
        if (b.Accuracy !== a.Accuracy) return b.Accuracy - a.Accuracy;
        if (b.CorrectCount !== a.CorrectCount) return b.CorrectCount - a.CorrectCount;
        if (b.AnsweredCount !== a.AnsweredCount) return b.AnsweredCount - a.AnsweredCount;
        return a.UserID.localeCompare(b.UserID);
      })
      .slice(0, 5);

    const countRanked = [...basePlayers]
      .sort((a, b) => {
        if (b.CorrectCount !== a.CorrectCount) return b.CorrectCount - a.CorrectCount;
        if (b.Accuracy !== a.Accuracy) return b.Accuracy - a.Accuracy;
        if (b.AnsweredCount !== a.AnsweredCount) return b.AnsweredCount - a.AnsweredCount;
        return a.UserID.localeCompare(b.UserID);
      })
      .slice(0, 5);

    const pointRanked = [...basePlayers]
      .sort((a, b) => {
        if (b.TotalScore !== a.TotalScore) return b.TotalScore - a.TotalScore;
        if (b.CorrectCount !== a.CorrectCount) return b.CorrectCount - a.CorrectCount;
        if (b.Accuracy !== a.Accuracy) return b.Accuracy - a.Accuracy;
        return a.UserID.localeCompare(b.UserID);
      })
      .slice(0, 5);

    if (rateRanked.length === 0) {
      $('rankArea').innerHTML = '尚無資料。';
      return;
    }

    const renderRows = (ranked, valueType) => ranked.map((player, idx) => {
      const value = valueType === 'rate'
        ? `${(player.Accuracy * 100).toFixed(1)}%`
        : (valueType === 'points' ? player.TotalScore : player.CorrectCount);
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(player.UserID)}</td>
          <td>${value}</td>
          <td>${player.CorrectCount}/${player.AnsweredCount}</td>
        </tr>
      `;
    }).join('');

    $('rankArea').innerHTML = `
      <div class="mb-3 fw-bold">排名一：搶答分數</div>
      <div class="table-responsive mb-4">
        <table class="table table-sm rank-table align-middle mb-0">
          <thead>
            <tr>
              <th>名次</th>
              <th>暱稱</th>
              <th>總分</th>
              <th>答對/作答</th>
            </tr>
          </thead>
          <tbody>${renderRows(pointRanked, 'points')}</tbody>
        </table>
      </div>

      <div class="mb-3 fw-bold">排名二：答對率</div>
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

      <div class="mb-3 fw-bold">排名三：答對數</div>
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

      const result = await callFunction('P01_set_question', {
        game_id: state.gameId,
        user_id: state.userId,
        qid: firstQuestion.QID,
        question_no: 1
      });

      // Dashboard / RLS 環境下，主持人端不等待下一輪輪詢才更新畫面；
      // 直接用已抽出的題目更新本機狀態，避免「按開始後畫面停在等待區」。
      state.session = Object.assign({}, state.session || {}, result.session || {}, {
        Status: 'playing',
        CurrentQID: firstQuestion.QID,
        CurrentQuestionNo: 1,
        StartedAt: (result.session && result.session.StartedAt) || new Date().toISOString()
      });
      $('questionNo').textContent = state.session.CurrentQuestionNo || 1;
      showPlayingState(state);
      renderQuestionObject(state, firstQuestion);
      await handleQuestionAndResultPhase(state);
      setTimeout(() => refreshSession(state, true), 300);
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

      const nextNo = (state.session.CurrentQuestionNo || 0) + 1;
      const result = await callFunction('P01_set_question', {
        game_id: state.gameId,
        user_id: state.userId,
        qid: nextQuestion.QID,
        question_no: nextNo
      });

      state.session = Object.assign({}, state.session || {}, result.session || {}, {
        Status: 'playing',
        CurrentQID: nextQuestion.QID,
        CurrentQuestionNo: nextNo,
        StartedAt: (result.session && result.session.StartedAt) || new Date().toISOString()
      });
      $('questionNo').textContent = state.session.CurrentQuestionNo || nextNo;
      showPlayingState(state);
      renderQuestionObject(state, nextQuestion);
      await handleQuestionAndResultPhase(state);
      setTimeout(() => refreshSession(state, true), 300);
    } catch (err) {
      console.error(err);
      $('actionMsg').textContent = '切換下一題失敗：' + (err.message || '未知錯誤');
    }
  }

  async function endGame(state) {
    if (!confirm('確定要結束這場競賽嗎？')) return;

    try {
      await callFunction('P01_end_game', {
        game_id: state.gameId,
        user_id: state.userId
      });
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
