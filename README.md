# 我的學習紀錄（Learning Log）

W11 課程實作專案：使用純 HTML / CSS / JavaScript 搭配 Supabase（Auth 登入 + Postgres + RLS 門禁），並透過 GitHub 與 Cloudflare 部署上線。

## 檔案說明

- `index.html`：網站主頁面（繁體中文、手機友善排版，透過 CDN 載入 `@supabase/supabase-js` v2）。
- `style.css`：頁面樣式表，提供響應式卡片排版與表單樣式。
- `app.js`：前端邏輯，負責登入/註冊/登出、新增/查詢/刪除學習紀錄，並以 `textContent` 安全顯示使用者輸入的純文字。
- `config.js`：存放公開的 Supabase `Project URL` 與 `publishable key`（請勿放入任何私密金鑰）。
- `schema.sql`：在 Supabase SQL Editor 執行的資料庫腳本，建立 `learning_logs` 資料表、開啟 RLS 門禁並設定僅限本人讀寫刪的規則。
- `README.md`：專案說明文件。

## 快速設定步驟

1. 在 Supabase 建立名為 `learning-log` 的專案（建議勾選 Enable automatic RLS）。
2. 到 Supabase 左側 **SQL Editor**，貼上 `schema.sql` 全文並按 **Run**。
3. 複製專案的 **Project URL** 與 **Publishable key**，填入 `config.js`。
4. 到 Supabase 左側 **Authentication → Sign In / Providers**，關閉 **Confirm email** 並按 **Save changes**。
5. 使用本機靜態伺服器（例如 `python3 -m http.server 8000`）預覽測試後，再推上 GitHub 並連結 Cloudflare 上線。
