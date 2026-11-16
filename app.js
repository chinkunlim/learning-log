(() => {
  const statusBanner = document.getElementById("status-banner");
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");

  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authSubmitBtn = document.getElementById("auth-submit-btn");

  const userEmailDisplay = document.getElementById("user-email-display");
  const logoutBtn = document.getElementById("logout-btn");

  const logForm = document.getElementById("log-form");
  const logDate = document.getElementById("log-date");
  const logMinutes = document.getElementById("log-minutes");
  const logTopic = document.getElementById("log-topic");
  const logNote = document.getElementById("log-note");
  const saveLogBtn = document.getElementById("save-log-btn");

  const logList = document.getElementById("log-list");
  const logCount = document.getElementById("log-count");
  const weeklySummary = document.getElementById("weekly-summary");

  let authMode = "login"; // "login" | "signup"
  let supabaseClient = null;
  let currentUser = null;

  function setDefaultDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    logDate.value = `${yyyy}-${mm}-${dd}`;
  }

  function showBanner(type, message) {
    statusBanner.className = `banner ${type}`;
    statusBanner.textContent = message;
  }

  function clearBanner() {
    statusBanner.className = "banner hidden";
    statusBanner.textContent = "";
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === "login";
    tabLogin.classList.toggle("active", isLogin);
    tabSignup.classList.toggle("active", !isLogin);
    tabLogin.setAttribute("aria-selected", String(isLogin));
    tabSignup.setAttribute("aria-selected", String(!isLogin));
    authPassword.autocomplete = isLogin ? "current-password" : "new-password";
    authSubmitBtn.textContent = isLogin ? "登入" : "註冊並登入";
    clearBanner();
  }

  function translateError(error) {
    const msg = (error && error.message ? error.message : String(error || "")).toLowerCase();
    if (msg.includes("invalid login credentials")) {
      return "Email 或密碼不對。如果是第一次使用，請先切換到「第一次來：註冊」。";
    }
    if (msg.includes("email not confirmed")) {
      return "帳號尚未完成信箱驗證。請到 Supabase 的 Authentication → Sign In / Providers 關閉 Confirm email，再重新登入。";
    }
    if (msg.includes("user already registered")) {
      return "這個 Email 已經註冊過了，請直接切換到「登入」。";
    }
    if (msg.includes("invalid format") || msg.includes("email address") && msg.includes("invalid")) {
      return "Email 格式不正確或被拒絕，請使用真實的 Email。";
    }
    if (msg.includes("relation") && msg.includes("learning_logs") && msg.includes("does not exist")) {
      return "找不到資料表 learning_logs。請先到 Supabase 的 SQL Editor 執行 schema.sql。";
    }
    if (msg.includes("permission denied")) {
      return "資料表還沒開放給登入者使用，請確認 schema.sql 最後的 grant 指令已執行。";
    }
    if (msg.includes("failed to fetch") || msg.includes("network")) {
      return "連不到 Supabase，請檢查 config.js 的 Project URL 是否正確，或專案是否已暫停。";
    }
    return error && error.message ? error.message : "發生未知錯誤，請稍後再試。";
  }

  function validateConfig() {
    const cfg = window.APP_CONFIG || {};
    const url = (cfg.SUPABASE_URL || "").trim();
    const key = (cfg.SUPABASE_PUBLISHABLE_KEY || "").trim();

    if (!url || !key || url.includes("貼上") || key.includes("貼上")) {
      showBanner("warn", "設定還沒完成：請先在 config.js 填入 Supabase 的 Project URL 與 publishable key。");
      return null;
    }

    if (key.startsWith("sb_secret_") || key.includes("_secret_")) {
      showBanner("error", "偵測到不可公開的萬能鑰匙！請立即移除並作廢該把鑰匙，改貼 sb_publishable_ 開頭的 publishable key。");
      return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showBanner("error", "無法載入 supabase-js，請確認網路連線後重新整理頁面。");
      return null;
    }

    return { url, key };
  }

  function formatLocalDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function updateWeeklySummary(items) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const todayStr = formatLocalDate(today);
    const startStr = formatLocalDate(start);

    let totalMinutes = 0;
    let count = 0;
    items.forEach((row) => {
      if (row.log_date && row.log_date >= startStr && row.log_date <= todayStr) {
        count += 1;
        totalMinutes += Number(row.minutes) || 0;
      }
    });

    weeklySummary.textContent = `最近 7 天：共 ${totalMinutes} 分鐘、${count} 筆`;
  }

  function renderLogs(rows) {
    logList.textContent = "";
    const items = Array.isArray(rows) ? rows : [];
    logCount.textContent = `${items.length} 筆`;
    updateWeeklySummary(items);

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "目前還沒有學習紀錄，快在上方新增第一筆吧！";
      logList.appendChild(empty);
      return;
    }

    items.forEach((row) => {
      const card = document.createElement("article");
      card.className = "log-item";

      const top = document.createElement("div");
      top.className = "log-top";

      const meta = document.createElement("div");
      meta.className = "log-meta";

      const dateSpan = document.createElement("span");
      dateSpan.className = "log-date";
      dateSpan.textContent = row.log_date || "";
      meta.appendChild(dateSpan);

      if (row.minutes !== null && row.minutes !== undefined && row.minutes !== "") {
        const minSpan = document.createElement("span");
        minSpan.textContent = `· ${row.minutes} 分鐘`;
        meta.appendChild(minSpan);
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-danger";
      deleteBtn.textContent = "刪除";
      deleteBtn.addEventListener("click", () => handleDeleteLog(row.id, deleteBtn));

      top.appendChild(meta);
      top.appendChild(deleteBtn);

      const topicP = document.createElement("p");
      topicP.className = "log-topic";
      topicP.textContent = row.topic || "";

      card.appendChild(top);
      card.appendChild(topicP);

      if (row.note) {
        const noteP = document.createElement("p");
        noteP.className = "log-note";
        noteP.textContent = `卡住的地方：${row.note}`;
        card.appendChild(noteP);
      }

      logList.appendChild(card);
    });
  }

  async function loadLogs() {
    if (!supabaseClient || !currentUser) return;
    const { data, error } = await supabaseClient
      .from("learning_logs")
      .select("id, log_date, topic, minutes, note, created_at")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      showBanner("error", translateError(error));
      return;
    }
    renderLogs(data);
  }

  async function handleDeleteLog(id, buttonEl) {
    if (!supabaseClient || !currentUser) return;
    buttonEl.disabled = true;
    clearBanner();

    const { error } = await supabaseClient
      .from("learning_logs")
      .delete()
      .eq("id", id);

    if (error) {
      buttonEl.disabled = false;
      showBanner("error", translateError(error));
      return;
    }

    showBanner("info", "已刪除該筆學習紀錄。");
    await loadLogs();
  }

  function updateUIForSession(session) {
    currentUser = session && session.user ? session.user : null;
    if (currentUser) {
      authSection.classList.add("hidden");
      appSection.classList.remove("hidden");
      userEmailDisplay.textContent = currentUser.email || "";
      loadLogs();
    } else {
      appSection.classList.add("hidden");
      authSection.classList.remove("hidden");
      userEmailDisplay.textContent = "";
      renderLogs([]);
    }
  }

  tabLogin.addEventListener("click", () => setAuthMode("login"));
  tabSignup.addEventListener("click", () => setAuthMode("signup"));

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return;

    authSubmitBtn.disabled = true;
    clearBanner();

    try {
      const action = authMode === "login"
        ? supabaseClient.auth.signInWithPassword({ email, password })
        : supabaseClient.auth.signUp({ email, password });

      const { data, error } = await action;
      if (error) {
        showBanner("error", translateError(error));
        return;
      }

      if (authMode === "signup" && !data.session) {
        showBanner("warn", "註冊成功，但目前 Supabase 開啟了信箱驗證。請關閉 Confirm email 後再登入。");
        return;
      }

      authPassword.value = "";
      showBanner("info", authMode === "login" ? "登入成功！" : "註冊並登入成功！");
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    if (!supabaseClient) return;
    logoutBtn.disabled = true;
    clearBanner();
    const { error } = await supabaseClient.auth.signOut();
    logoutBtn.disabled = false;
    if (error) {
      showBanner("error", translateError(error));
      return;
    }
    showBanner("info", "已登出。");
  });

  logForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient || !currentUser) return;

    const topic = logTopic.value.trim();
    const note = logNote.value.trim();
    const minutesRaw = logMinutes.value.trim();
    const minutes = minutesRaw === "" ? null : Number(minutesRaw);

    if (!topic) {
      showBanner("warn", "請填寫「今天學了什麼」。");
      return;
    }
    if (minutes !== null && (Number.isNaN(minutes) || minutes < 0 || minutes > 1440)) {
      showBanner("warn", "分鐘數請填寫 0 到 1440 之間的整數。");
      return;
    }

    saveLogBtn.disabled = true;
    clearBanner();

    try {
      const { error } = await supabaseClient
        .from("learning_logs")
        .insert([{
          log_date: logDate.value,
          topic,
          minutes,
          note: note || null
        }]);

      if (error) {
        showBanner("error", translateError(error));
        return;
      }

      logTopic.value = "";
      logMinutes.value = "";
      logNote.value = "";
      setDefaultDate();
      showBanner("info", "已儲存學習紀錄！");
      await loadLogs();
    } finally {
      saveLogBtn.disabled = false;
    }
  });

  async function init() {
    setDefaultDate();
    const valid = validateConfig();
    if (!valid) {
      authSubmitBtn.disabled = true;
      return;
    }

    supabaseClient = window.supabase.createClient(valid.url, valid.key);

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      showBanner("error", translateError(error));
    } else {
      updateUIForSession(data.session);
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateUIForSession(session);
    });
  }

  init();
})();
