// ============================================================
//  TravelNest Demo – Shared Layout Builder
// ============================================================

function buildDisclaimer() {
  return `
<div class="disclaimer-banner">
  ⚠️ <strong>デモサイト：</strong>
  このサイトはデモンストレーション目的で作成された架空のサービスです。
  掲載されているホテル・料金・予約情報はすべてフィクションです。実際の予約・決済は行われません。
</div>`;
}

function buildHeader(activePage = "") {
  const helpLink = "help.html";
  return `
<header id="site-header" class="site-header">
  <div class="header-inner">
    <a href="index.html" class="logo" id="logo">
      <span class="plane">✈</span> TravelNest
    </a>
    <div class="header-search">
      <input type="text" id="hs-keyword" placeholder="目的地・ホテル名" onkeydown="if(event.key==='Enter')headerSearch()">
      <button id="btn-header-search" onclick="headerSearch()" title="検索">🔍</button>
    </div>
    <nav id="global-nav" class="header-nav" style="display:flex;align-items:center;gap:4px;">
      <a href="index.html" class="header-nav" id="nav-home">ホーム</a>
      <a href="${helpLink}" class="header-nav" id="nav-help">ヘルプ</a>
      <span id="header-nav-dynamic" style="display:flex;align-items:center;gap:4px;"></span>
    </nav>
  </div>
</header>`;
}

function buildFooter() {
  return `
<footer class="site-footer">
  <div class="footer-nav">
    <a href="index.html">ホーム</a>
    <a href="search.html">ホテル検索</a>
    <a href="mypage.html">マイページ</a>
    <a href="help.html">ヘルプ</a>
  </div>
  <div>© 2025 TravelNest Demo – Valtes Inc.</div>
  <div class="disclaimer-footer">
    【免責事項】本サイトはデモンストレーション目的で作成された架空のサービスです。
    掲載されているホテル名・料金・写真・レビュー・予約情報はすべて架空のフィクションであり、
    実在のホテルや企業とは一切関係ありません。本サイト上での予約・決済・個人情報の送受信は
    行われず、いかなる法的拘束力も生じません。本デモは株式会社バルテスの内部デモ用途のみに
    使用されます。
  </div>
</footer>
<div id="toast-container"></div>`;
}

// 日付テキスト入力の自動フォーマット（yyyy/mm/dd）
function autoFormatDate(input) {
  const digits = input.value.replace(/[^0-9]/g, "").slice(0, 8);
  let v = digits;
  if (digits.length > 6) v = digits.slice(0,4) + "/" + digits.slice(4,6) + "/" + digits.slice(6);
  else if (digits.length > 4) v = digits.slice(0,4) + "/" + digits.slice(4);
  input.value = v;
  // 8桁揃ったら対応するカレンダーピッカーにも同期
  if (digits.length === 8) {
    const picker = document.getElementById(input.id + "-dp");
    if (picker) picker.value = digits.slice(0,4) + "-" + digits.slice(4,6) + "-" + digits.slice(6);
  }
}

// ── カスタムカレンダーポップアップ ──
const Cal = (() => {
  let _id = null, _y = null, _m = null;

  function _outside(e) {
    const popup = document.getElementById('cal-popup');
    if (!popup) return;
    if (!document.contains(e.target)) return; // innerHTML再描画で切り離された要素は無視
    const wrap = _id && document.getElementById(_id)?.closest('.date-input-wrap');
    if (!popup.contains(e.target) && (!wrap || !wrap.contains(e.target))) _close();
  }

  function _open(inputId) {
    _close();
    _id = inputId;
    const input = document.getElementById(inputId);
    const mt = (input?.value || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    const now = new Date();
    _y = mt ? +mt[1] : now.getFullYear();
    _m = mt ? +mt[2] - 1 : now.getMonth();

    const popup = document.createElement('div');
    popup.id = 'cal-popup';
    popup.className = 'cal-popup';
    document.body.appendChild(popup);
    _render();

    const wrap = input?.closest('.date-input-wrap');
    if (wrap) {
      const r  = wrap.getBoundingClientRect();
      const st = window.scrollY || 0;
      popup.style.top  = (r.bottom + st + 4) + 'px';
      const left = (window.scrollX || 0) + r.left;
      popup.style.left = Math.min(left, window.innerWidth - 290 + (window.scrollX || 0)) + 'px';
    }
    setTimeout(() => document.addEventListener('click', _outside), 0);
  }

  function _close() {
    document.getElementById('cal-popup')?.remove();
    document.removeEventListener('click', _outside);
    _id = null;
  }

  function _move(delta) {
    _m += delta;
    if (_m < 0)  { _m = 11; _y--; }
    if (_m > 11) { _m = 0;  _y++; }
    _render();
  }

  function _pick(ds) {
    const input = document.getElementById(_id);
    if (input) {
      input.value = ds.replace(/-/g, '/');
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const dp = document.getElementById(_id + '-dp');
      if (dp) { dp.value = ds; dp.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    _close();
  }

  function _render() {
    const popup = document.getElementById('cal-popup');
    if (!popup) return;
    const input = document.getElementById(_id);
    const mt    = (input?.value || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    const sel   = mt ? `${mt[1]}-${mt[2]}-${mt[3]}` : null;
    const today = new Date(); today.setHours(0,0,0,0);
    const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const DOWS   = ['日','月','火','水','木','金','土'];
    const first  = new Date(_y, _m, 1);
    const last   = new Date(_y, _m + 1, 0);

    let head = DOWS.map((d, i) =>
      `<div class="cal-dow${i===0?' cal-sun':i===6?' cal-sat':''}">${d}</div>`
    ).join('');

    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += `<div class="cal-day cal-other"></div>`;
    for (let d = 1; d <= last.getDate(); d++) {
      const dt  = new Date(_y, _m, d);
      const ds  = `${_y}-${String(_m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = dt.getDay();
      let cls = 'cal-day';
      if (dt.getTime() === today.getTime()) cls += ' cal-today';
      if (sel === ds) cls += ' cal-sel';
      if (dow === 0) cls += ' cal-sun';
      if (dow === 6) cls += ' cal-sat';
      cells += `<div class="${cls}" data-date="${ds}" onclick="Cal.pick('${ds}')">${d}</div>`;
    }

    popup.innerHTML = `
      <div class="cal-header" id="cal-header">
        <button class="cal-nav" id="cal-prev" onclick="Cal.move(-1)" title="前の月">◀</button>
        <span id="cal-month-label">${_y}年 ${MONTHS[_m]}</span>
        <button class="cal-nav" id="cal-next" onclick="Cal.move(1)" title="次の月">▶</button>
      </div>
      <div class="cal-grid" id="cal-grid">${head}${cells}</div>
      <div class="cal-footer" id="cal-footer">
        <button class="btn btn-secondary btn-sm" id="cal-close-btn" onclick="Cal.close()">✕ 閉じる</button>
      </div>`;
  }

  return { open: _open, close: _close, move: _move, pick: _pick };
})();

// カレンダーピッカーを開く
function openDatePicker(id) {
  Cal.open(id);
}

// カレンダーピッカーの選択をテキスト入力に反映
function syncFromPicker(id) {
  const val = document.getElementById(id + "-dp")?.value; // yyyy-mm-dd
  if (val) {
    document.getElementById(id).value = val.replace(/-/g, "/");
  }
}

function headerSearch() {
  const kw = document.getElementById("hs-keyword")?.value.trim() || "";
  const sp = App.loadSearchParams();
  sp.keyword = kw;
  App.saveSearchParams(sp);
  window.location.href = "search.html";
}

function buildPage({ title, body, scripts = [], activePage = "" }) {
  document.title = title ? `${title} | TravelNest Demo` : "TravelNest Demo";
  document.body.insertAdjacentHTML("afterbegin", buildDisclaimer() + buildHeader(activePage));
  document.body.insertAdjacentHTML("beforeend", buildFooter());
  // buildPageはApp.init()のrenderHeader()より後に実行されるためここで再描画する
  if (typeof App !== "undefined") App.renderHeader();
}
