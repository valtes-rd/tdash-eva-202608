# ============================================================
#  TravelNest Demo – GitHub 公開手順スクリプト
#  実行場所: C:\Users\sadaaki.emura\Documents\Script\WebAPP\Demo-Travel
# ============================================================
#
#  使い方:
#    PowerShell を開いて Demo-Travel フォルダに移動してから実行
#    cd C:\Users\sadaaki.emura\Documents\Script\WebAPP\Demo-Travel
#    .\setup-github.ps1
#
# ============================================================

Write-Host "=== TravelNest Demo – GitHub セットアップ ===" -ForegroundColor Cyan

# ── 1. Git 初期化 ─────────────────────────────────────────
if (-Not (Test-Path ".git")) {
    git init
    Write-Host "✅ git init 完了" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .git フォルダはすでに存在します" -ForegroundColor Yellow
}

# ── 2. ユーザー設定（必要に応じて変更）─────────────────────
# git config user.email "your-email@example.com"
# git config user.name "Your Name"

# ── 3. ファイルをステージング ───────────────────────────────
git add .
Write-Host "✅ git add . 完了" -ForegroundColor Green

# ── 4. 初回コミット ─────────────────────────────────────────
git commit -m "feat: TravelNest Demo 初回リリース

- 271ホテル（福岡56・東京56・名古屋52・大阪55・フィリピン52）
- テストユーザー5名（予約履歴付き）
- バルテスシリーズホテル（各エリア・曜日満席設定）
- 無限スクロール検索・日程選択・空き確認
- 予約フロー（3ステップ）・マイページ
- デモサイト免責表示
"
Write-Host "✅ git commit 完了" -ForegroundColor Green

# ── 5. GitHub リモート設定 ─────────────────────────────────
#
#  ★ 事前に GitHub でリポジトリを作成してください:
#    https://github.com/new
#    Repository name: Demo-Travel
#    Public / Private: お好みで
#    README や .gitignore は追加しない（すでに含まれています）
#
#  ★ 以下の URL をあなたのリポジトリに合わせて変更してください:

$GITHUB_URL = "https://github.com/YOUR_USERNAME/Demo-Travel.git"

Write-Host ""
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  ★ GitHub URL を設定してください" -ForegroundColor Yellow
Write-Host "  現在の設定: $GITHUB_URL" -ForegroundColor Yellow
Write-Host "  変更する場合: このスクリプトの GITHUB_URL 変数を編集" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host ""

# リモートを設定（すでにある場合は更新）
$remoteExists = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    git remote set-url origin $GITHUB_URL
    Write-Host "✅ git remote set-url origin 完了" -ForegroundColor Green
} else {
    git remote add origin $GITHUB_URL
    Write-Host "✅ git remote add origin 完了" -ForegroundColor Green
}

# ── 6. main ブランチに設定してプッシュ ─────────────────────
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "=== 完了！===" -ForegroundColor Cyan
Write-Host "GitHub Pages で公開する場合:" -ForegroundColor White
Write-Host "  1. GitHub リポジトリ → Settings → Pages" -ForegroundColor White
Write-Host "  2. Source: Deploy from a branch" -ForegroundColor White
Write-Host "  3. Branch: main / (root)" -ForegroundColor White
Write-Host "  4. Save → 数分後に公開URL が表示されます" -ForegroundColor White
