(function () {
  const config = window.APP_CONFIG;
  const myQrCodeBox = document.getElementById('myQrCodeBox');
  const myQrMessage = document.getElementById('myQrMessage');
  const liveNoticePanel = document.getElementById('liveNoticePanel');
  const liveNoticeText = document.getElementById('liveNoticeText');
  const myNicknameDisplay = document.getElementById('myNicknameDisplay');
  const myAccountDisplay = document.getElementById('myAccountDisplay');

  let latestKnownCreatedAt = localStorage.getItem('P04_LAST_SEEN_CREATED_AT') || null;
  let initialized = false;

  function setMessage(msg, type = '') {
    if (!myQrMessage) return;
    myQrMessage.textContent = msg;
    myQrMessage.className = 'status-message ' + type;
  }

  function normalizeAccount(v) {
    return String(v || '').trim().toLowerCase();
  }

  function accountToEmail(account) {
    return `${account}${config.EMAIL_DOMAIN}`;
  }

  function renderQrCode(account) {
    if (!myQrCodeBox || typeof QRCode === 'undefined') return;
    myQrCodeBox.innerHTML = '';
    new QRCode(myQrCodeBox, {
      text: accountToEmail(account),
      width: 190,
      height: 190,
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showFlower(row, account) {
    const name = row.responder_nickname || row.responder_account || '某位同學';
    const label = row.smile_type_label || '善意';

    if (liveNoticePanel && liveNoticeText) {
      liveNoticeText.textContent = `剛剛 ${name} 記錄了你對他的${label}。`;
      liveNoticePanel.classList.remove('hidden');
    }

    if (myQrCodeBox) {
      myQrCodeBox.innerHTML = `
        <div class="flower-notice-card">
          <div class="flower-emoji">💐</div>
          <div class="flower-title">收到一束微笑之花</div>
          <div class="flower-message">
            剛剛 <strong>${escapeHtml(name)}</strong><br>
            記錄了你對他的${escapeHtml(label)}
          </div>
          <div class="flower-subtitle">謝謝你把善意傳出去</div>
        </div>
      `;
    }

    setMessage('新的微笑漣漪已送達。QRCode 稍後會自動回來。', 'success');

    setTimeout(() => {
      renderQrCode(account);
      setMessage('此 QRCode 內容為完整校園 Email；掃描後系統會自動轉換為帳號。', 'success');
    }, config.NOTIFICATION_DISPLAY_MS || 8000);
  }

  async function callRecentNotice(account) {
    const url = config.FUNCTIONS?.GET_RECENT_NOTICE;
    if (!url) {
      setMessage('config.js 缺少 FUNCTIONS.GET_RECENT_NOTICE。', 'error');
      return;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        smiler_account: account,
        after_created_at: latestKnownCreatedAt,
        limit: 3
      })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      setMessage(`通知查詢失敗：${data?.message || res.status}`, 'error');
      return;
    }

    const rows = data.rows || [];

    if (!initialized) {
      if (rows.length && rows[0].created_at) {
        latestKnownCreatedAt = rows[0].created_at;
      } else {
        latestKnownCreatedAt = new Date().toISOString();
      }
      localStorage.setItem('P04_LAST_SEEN_CREATED_AT', latestKnownCreatedAt);
      initialized = true;
      return;
    }

    if (!rows.length) return;

    const newest = rows[0];
    if (newest.created_at) {
      latestKnownCreatedAt = newest.created_at;
      localStorage.setItem('P04_LAST_SEEN_CREATED_AT', latestKnownCreatedAt);
    }

    showFlower(newest, account);
  }

  const account = normalizeAccount(localStorage.getItem(config.STORAGE_KEY_ACCOUNT || 'P04_ACCOUNT'));
  const nickname = localStorage.getItem(config.STORAGE_KEY_NICKNAME || 'P04_NICKNAME') || '';

  if (myNicknameDisplay) myNicknameDisplay.textContent = nickname;
  if (myAccountDisplay) myAccountDisplay.textContent = accountToEmail(account);

  if (account) {
    renderQrCode(account);
    setMessage('此 QRCode 內容為完整校園 Email；掃描後系統會自動轉換為帳號。', 'success');
    callRecentNotice(account);
    setInterval(() => callRecentNotice(account), config.NOTIFICATION_POLL_MS || 3000);
  } else {
    setMessage('尚未設定帳號，請回首頁設定。', 'error');
  }
})();
