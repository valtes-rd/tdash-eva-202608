// ============================================================
//  TravelNest Demo – App Core (state, auth, utils)
// ============================================================

const App = (() => {

  // ── State ─────────────────────────────────────────────────
  const _state = {
    currentUser: null,
    bookings: [],
    favorites: [],
    searchParams: {},
  };

  // ── ローカルストレージキー ──
  const LS = {
    USER:      "tn_user",
    BOOKINGS:  "tn_bookings",
    FAVORITES: "tn_favorites",
  };

  // ── 初期化 ─────────────────────────────────────────────────
  function init() {
    // ユーザーセッション復元（localStorageでウィンドウ間共有）
    const u = localStorage.getItem(LS.USER);
    if (u) { try { _state.currentUser = JSON.parse(u); } catch(e) {} }

    // 予約データ初期化
    let bk = localStorage.getItem(LS.BOOKINGS);
    if (!bk) {
      // サンプルデータを投入
      localStorage.setItem(LS.BOOKINGS, JSON.stringify(SAMPLE_BOOKINGS));
      _state.bookings = [...SAMPLE_BOOKINGS];
    } else {
      try { _state.bookings = JSON.parse(bk); } catch(e) { _state.bookings = []; }
    }

    // お気に入りデータ初期化
    const fav = localStorage.getItem(LS.FAVORITES);
    if (fav) { try { _state.favorites = JSON.parse(fav); } catch(e) {} }

    renderHeader();
  }

  // ── 認証 ──────────────────────────────────────────────────
  function login(email, password) {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (!user) return { ok: false, msg: "メールアドレスまたはパスワードが正しくありません。" };
    _state.currentUser = user;
    localStorage.setItem(LS.USER, JSON.stringify(user));
    renderHeader();
    return { ok: true, user };
  }

  function logout() {
    if (!confirm("ログアウトしますか？")) return;
    _state.currentUser = null;
    localStorage.removeItem(LS.USER);
    renderHeader();
    window.location.href = "index.html";
  }

  function isLoggedIn() { return !!_state.currentUser; }
  function currentUser() { return _state.currentUser; }

  // ログイン必須ガード
  function requireLogin(redirectBack) {
    if (!isLoggedIn()) {
      const back = redirectBack || window.location.href;
      sessionStorage.setItem("tn_redirect_after_login", back);
      showLoginModal();
      return false;
    }
    return true;
  }

  // ── 予約 ──────────────────────────────────────────────────
  function getBookings(userId) {
    return _state.bookings.filter(b => b.userId === userId);
  }

  function createBooking(data) {
    // 重複チェック
    const uid = data.userId;
    const ci  = new Date(data.checkin).getTime();
    const co  = new Date(data.checkout).getTime();
    const conflict = _state.bookings.find(b =>
      b.userId === uid &&
      b.status !== BOOKING_STATUS.CANCELLED &&
      new Date(b.checkout).getTime() > ci &&
      new Date(b.checkin).getTime() < co
    );
    if (conflict) {
      return { ok: false, msg: `選択した期間は既存の予約（${conflict.bookingNo}）と重複しています。` };
    }

    // 翌日以降チェック
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    if (new Date(data.checkin) < tomorrow) {
      return { ok: false, msg: "チェックインは予約日の翌日以降のみ指定できます。" };
    }

    const seq = _state.bookings.length + 1;
    const booking = {
      id: `b${Date.now()}`,
      userId:   data.userId,
      hotelId:  data.hotelId,
      bookingNo: genBookingNo(data.checkin, seq),
      checkin:  data.checkin,
      checkout: data.checkout,
      nights:   calcNights(data.checkin, data.checkout),
      guests:   data.guests,
      rooms:    data.rooms,
      roomType: data.roomType,
      totalPrice: data.totalPrice,
      status:   BOOKING_STATUS.CONFIRMED,
      specialRequest: data.specialRequest || "",
      createdAt: new Date().toISOString(),
    };

    _state.bookings.push(booking);
    localStorage.setItem(LS.BOOKINGS, JSON.stringify(_state.bookings));
    return { ok: true, booking };
  }

  function cancelBooking(bookingId) {
    const b = _state.bookings.find(b => b.id === bookingId);
    if (!b) return { ok: false, msg: "予約が見つかりません。" };

    // 前日までチェック
    const checkin = new Date(b.checkin); checkin.setHours(0,0,0,0);
    const today   = new Date(); today.setHours(0,0,0,0);
    if (today >= checkin) return { ok: false, msg: "キャンセル期限（チェックイン前日23:59）を過ぎています。" };

    b.status = BOOKING_STATUS.CANCELLED;
    localStorage.setItem(LS.BOOKINGS, JSON.stringify(_state.bookings));
    return { ok: true };
  }

  // ── お気に入り ──────────────────────────────────────────────
  function isFavorite(hotelId) {
    if (!isLoggedIn()) return false;
    return _state.favorites.some(f => f.userId === _state.currentUser.id && f.hotelId === hotelId);
  }

  function toggleFavorite(hotelId) {
    if (!requireLogin()) return false;
    const uid = _state.currentUser.id;
    const idx = _state.favorites.findIndex(f => f.userId === uid && f.hotelId === hotelId);
    if (idx >= 0) {
      _state.favorites.splice(idx, 1);
    } else {
      _state.favorites.push({ userId: uid, hotelId, addedAt: new Date().toISOString() });
    }
    localStorage.setItem(LS.FAVORITES, JSON.stringify(_state.favorites));
    return isFavorite(hotelId);
  }

  function getFavoriteHotels() {
    if (!isLoggedIn()) return [];
    const uid = _state.currentUser.id;
    const favIds = _state.favorites.filter(f => f.userId === uid).map(f => f.hotelId);
    return HOTELS.filter(h => favIds.includes(h.id));
  }

  // ── 検索 ──────────────────────────────────────────────────
  function searchHotels({ region, checkin, checkout, guests = 1, keyword = "" }) {
    let results = [...HOTELS];
    if (region && region !== "all") results = results.filter(h => h.region === region);
    if (keyword) {
      const kw = keyword.toLowerCase();
      results = results.filter(h =>
        h.name.toLowerCase().includes(kw) ||
        h.desc.toLowerCase().includes(kw) ||
        h.facilities.some(f => f.toLowerCase().includes(kw))
      );
    }
    return results;
  }

  // ── 空き確認 ──────────────────────────────────────────────

  // hotel ID + 日付文字列で決定論的な 0〜1 値を生成（同一引数は常に同一結果）
  function _deterministicRng(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0) / 0xffffffff;
  }

  // soldOutDays を安全にパース（master.js の JSON 文字列形式に対応）
  function _parseSoldOutDays(hotel) {
    if (!hotel.soldOutDays) return [];
    try { return JSON.parse(hotel.soldOutDays.toString().replace(/'/g, '"')); } catch(e) { return []; }
  }

  // ── チェックイン〜チェックアウト全泊をスキャンして満室日を返す ──
  function _blockedNights(soldOutDays, checkin, checkout) {
    const blocked = [];
    if (!checkin) return blocked;
    const ci = new Date(checkin  + "T00:00:00");
    const co = checkout ? new Date(checkout + "T00:00:00") : new Date(ci.getTime() + 86400000);
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      if (soldOutDays.includes(d.getDay())) blocked.push(fmtDate(new Date(d)));
    }
    return blocked;
  }

  function checkAvailability(hotelId, checkin, checkout) {
    const hotel = HOTELS.find(h => h.id === hotelId);
    if (!hotel) return { available: false, days: [], rooms: [], blockedDays: [] };

    const soldOutDays = _parseSoldOutDays(hotel);

    // ── 先2週間グリッド（soldOutDays と同じロジック） ──
    const days = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dow = d.getDay();
      days.push({ date: fmtDate(d), dow, available: !soldOutDays.includes(dow) });
    }

    // ── チェックイン〜アウト全泊チェック（グリッドと同一ロジック） ──
    const blockedDays = _blockedNights(soldOutDays, checkin, checkout);
    const rangeAvailable = blockedDays.length === 0;

    // ── 部屋ごとの空き（ROOM_TYPES を参照、決定論的ハッシュ） ──
    // 同じ hotel+checkin の組み合わせは常に同じ結果を返す
    const rng = _deterministicRng(hotelId + (checkin || ""));
    const rooms = ROOM_TYPES.map((rt, i) => ({
      type:      rt.name,
      price:     Math.round(hotel.priceBase * rt.multiplier),
      // シングル/ダブルは在庫豊富なので満室日でなければ必ず空き
      // デラックス/スイートは決定論的ハッシュで埋まり具合を表現
      available: rangeAvailable && (i < 2 ? true : rng > (i === 2 ? 0.25 : 0.50)),
    }));

    return { available: rangeAvailable, days, rooms, blockedDays };
  }

  // ── ヘッダー描画 ──────────────────────────────────────────
  function renderHeader() {
    const navEl = document.getElementById("header-nav-dynamic");
    if (!navEl) return;
    if (isLoggedIn()) {
      const u = _state.currentUser;
      const initial = u.name.charAt(0);
      navEl.innerHTML = `
        <a href="mypage.html" class="header-nav btn-mypage">マイページ</a>
        <button onclick="App.logout()" class="header-nav">ログアウト</button>
        <div class="avatar-circle" title="${u.name}">${initial}</div>
      `;
    } else {
      navEl.innerHTML = `
        <a href="login.html" class="header-nav">ログイン</a>
        <a href="register.html" class="header-nav btn-register">会員登録</a>
      `;
    }
  }

  // ── ログインモーダル ──────────────────────────────────────
  function showLoginModal(onSuccess) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "login-modal";
    overlay.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" onclick="document.getElementById('login-modal').remove()">✕</button>
        <div class="modal-title">🔐 ログインが必要です</div>
        <p style="font-size:13px;color:var(--gray);margin-bottom:18px;">この操作にはログインが必要です。</p>
        <div class="form-group mb-16">
          <label>メールアドレス</label>
          <input type="email" id="modal-email" placeholder="user@example.com" />
        </div>
        <div class="form-group mb-16">
          <label>パスワード</label>
          <input type="password" id="modal-pw" placeholder="パスワード" />
        </div>
        <div id="modal-err" class="alert alert-danger hidden" style="margin-bottom:12px;"></div>
        <button class="btn btn-primary" style="width:100%" onclick="App.loginFromModal()">ログイン</button>
        <p style="text-align:center;margin-top:12px;font-size:13px;">
          アカウントをお持ちでない方は<a href="register.html">会員登録</a>
        </p>
      </div>`;
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    document.getElementById("modal-email").focus();
    window._loginModalCallback = onSuccess;
  }

  function loginFromModal() {
    const email = document.getElementById("modal-email").value.trim();
    const pw    = document.getElementById("modal-pw").value;
    const errEl = document.getElementById("modal-err");
    const res = login(email, pw);
    if (!res.ok) {
      errEl.textContent = res.msg;
      errEl.classList.remove("hidden");
      return;
    }
    document.getElementById("login-modal")?.remove();
    showToast("ログインしました。", "success");
    if (typeof window._loginModalCallback === "function") {
      window._loginModalCallback(res.user);
    } else {
      const redir = sessionStorage.getItem("tn_redirect_after_login");
      if (redir) { sessionStorage.removeItem("tn_redirect_after_login"); window.location.href = redir; }
      else { window.location.reload(); }
    }
  }

  // ── ユーティリティ ────────────────────────────────────────
  // yyyy/mm/dd 形式で表示（予約一覧等）
  function fmtDateSlash(d) {
    return fmtDate(d).replace(/-/g, "/");
  }

  // テキスト入力 yyyy/mm/dd or yyyy-mm-dd → 内部形式 yyyy-mm-dd に変換
  function parseDateStr(str) {
    if (!str) return "";
    const clean = str.replace(/[\/\-]/g, "");
    if (clean.length !== 8 || !/^\d{8}$/.test(clean)) return "";
    const y = clean.slice(0,4), m = clean.slice(4,6), d = clean.slice(6,8);
    const dt = new Date(`${y}-${m}-${d}T00:00:00`);
    if (isNaN(dt.getTime())) return "";
    return `${y}-${m}-${d}`;
  }

  // ローディングオーバーレイ（操作ロック付き）
  function showLoading(msg = "読み込み中...") {
    if (document.getElementById("loading-overlay")) return;
    const el = document.createElement("div");
    el.id = "loading-overlay";
    el.innerHTML = `
      <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
      <div style="font-size:15px;font-weight:600;color:var(--primary)">${msg}</div>`;
    document.body.appendChild(el);
  }

  function hideLoading() {
    document.getElementById("loading-overlay")?.remove();
  }

  function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,"0");
    const dd = String(dt.getDate()).padStart(2,"0");
    return `${y}-${m}-${dd}`;
  }

  function fmtDateJP(str) {
    if (!str) return "";
    const d = new Date(str);
    const DOW = ["日","月","火","水","木","金","土"];
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
  }

  function calcNights(ci, co) {
    return Math.round((new Date(co) - new Date(ci)) / 86400000);
  }

  function fmtPrice(n) {
    return "¥" + Number(n).toLocaleString();
  }

  function getHotelById(id) { return HOTELS.find(h => h.id === id); }
  function getRegionById(id) { return REGIONS.find(r => r.id === id); }

  function showToast(msg, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = ".4s"; setTimeout(() => t.remove(), 400); }, 3000);
  }

  function genBookingNo(checkin, seq) {
    const d = checkin.replace(/-/g, "");
    return `TN-${d}-${String(seq).padStart(5,"0")}`;
  }

  function starsHtml(n) {
    return "★".repeat(n) + "☆".repeat(5-n);
  }

  // 曜日名
  function dowName(n) { return ["日","月","火","水","木","金","土"][n]; }

  // ホテルの背景色（地域別）
  const REGION_COLORS = {
    fukuoka: "#065A82", tokyo: "#21295C", nagoya: "#0D9488",
    osaka: "#D97706", philippines: "#065F46"
  };
  function hotelBgColor(region) { return REGION_COLORS[region] || "#065A82"; }

  // 地域名取得
  function regionName(id) { const r = REGIONS.find(r => r.id === id); return r ? r.name : id; }

  // 検索パラメータ保存/取得（localStorageでウィンドウ間共有）
  function saveSearchParams(p) {
    _state.searchParams = p;
    localStorage.setItem("tn_search", JSON.stringify(p));
  }
  function loadSearchParams() {
    const s = localStorage.getItem("tn_search");
    if (s) { try { _state.searchParams = JSON.parse(s); } catch(e) {} }
    return _state.searchParams;
  }

  // ── 公開API ──────────────────────────────────────────────
  return {
    init, login, logout, loginFromModal, isLoggedIn, currentUser,
    requireLogin, showLoginModal,
    getBookings, createBooking, cancelBooking,
    isFavorite, toggleFavorite, getFavoriteHotels,
    searchHotels, checkAvailability,
    fmtDate, fmtDateJP, fmtDateSlash, parseDateStr, calcNights, fmtPrice,
    getHotelById, getRegionById, regionName,
    showToast, starsHtml, hotelBgColor,
    saveSearchParams, loadSearchParams,
    showLoading, hideLoading,
    renderHeader,
  };
})();

// DOM準備後に初期化
document.addEventListener("DOMContentLoaded", () => App.init());
