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
<header class="site-header">
  <div class="header-inner">
    <a href="index.html" class="logo">
      <span class="plane">✈</span> TravelNest
    </a>
    <div class="header-search">
      <input type="text" id="hs-keyword" placeholder="目的地・ホテル名" onkeydown="if(event.key==='Enter')headerSearch()">
      <button onclick="headerSearch()" title="検索">🔍</button>
    </div>
    <nav class="header-nav" style="display:flex;align-items:center;gap:4px;">
      <a href="index.html" class="header-nav">ホーム</a>
      <a href="${helpLink}" class="header-nav">ヘルプ</a>
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
