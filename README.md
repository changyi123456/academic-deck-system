# academic-deck-system

江長屹（@aiphysicsteacher）的個人學術簡報系統：任一 AI agent 接到任何主題，都能產出同一套個人風格的學術簡報。

## 架構

```
deck.yaml（語義化內容，唯一原稿）
   │  validate（schema＋內容紀律檢查）
   ▼
renderer（TypeScript → 受控 HTML 元件）
   │
   ├─ Reveal.js 5 薄 runtime → HTML（投影/scroll 閱讀/講者視圖）
   ├─ Playwright/Chromium   → PDF
   └─ PptxGenJS 第二 renderer → 可編輯 PPTX（PPT-safe 子集）
```

- **內容**：`decks/<id>/deck.yaml`——agent 只寫這個，不寫 HTML
- **風格**：`theme/tokens.json`（唯一 token 來源）＋ `SLIDE_STYLE.md`（設計規則）
- **流程**：`AGENTS.md`——agent 固定十步工作流
- **品質**：validator＋自動截圖 contact sheet＋golden 視覺回歸

## 主題

- `board-dark`：黑板墨綠＋粉筆金（品牌主視覺）
- `bright-minimal`：粉筆紙淺底（明亮教室/投影機對比不佳時的預設）
- `print`：PDF/黑白列印派生

## 使用（腳本由 codex 實作中）

```bash
npm run validate  -- decks/<id>   # schema＋內容紀律
npm run render    -- decks/<id>   # 產 dist/<id>/index.html
npm run screenshot -- decks/<id>  # contact sheet 視覺檢查
npm run export    -- decks/<id>   # PDF＋PPTX
```

## 狀態

- [x] tokens / schema / 風格規格 / agent 流程（main—Claude）
- [ ] renderer / validator / export / QA scripts（helper—codex）
- [ ] 三套 golden example deck 完整渲染
- [ ] stress-test deck
