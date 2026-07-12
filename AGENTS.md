# AGENTS — 簡報產出固定流程

任何 agent（Claude、Codex 或其他）接到「做一份簡報」的任務時，一律走以下流程。目標：換 agent、換主題，產出風格與品質一致。

## 你可以動的檔案

- `decks/<deck-id>/` 底下的 `deck.yaml`、`references.yaml`、`data/`、`assets/`

## 你不可以動的檔案

- `theme/`、`schemas/`、`src/`、`scripts/`（模板核心；缺版型時見第 8 步）
- 其他 deck 的目錄

## 固定十步流程

1. **讀規格**：`SLIDE_STYLE.md` → `schemas/deck.schema.json` → 對應 preset 的 `examples/`。
2. **先寫大綱**：每張只寫 `type + 一句主張 + 證據來源`，確認敘事成立（SSCI 順序見 SLIDE_STYLE 第 5 節）再展開。10–40 頁；seminar 預設 15、workshop 20、defense 25。
3. **寫 deck spec**：只用 schema 定義的 type 與欄位。每張填 `notes`（講者稿）。引用一律走 `references.yaml` ＋ `citation_ids`，不手寫引用文字。
4. **準備資產**：數據圖給 CSV＋chart spec；概念插圖依 SLIDE_STYLE 第 7 節的 prompt 模板生圖（或請使用者生成），存 `assets/`，填 alt/source。
5. **validate**：`npm run validate -- decks/<id>`。修到零 error；warning 逐條判斷，不可默默忽略。
6. **render**：`npm run render -- decks/<id>`，產出 `dist/<id>/index.html`。
7. **視覺檢查**：`npm run screenshot -- decks/<id>` 產 contact sheet，逐張檢查：爆版、對比、中文斷行、表格可讀性。**兩個主題（board-dark、bright-minimal）都要檢查關鍵頁。**
8. **修正**：改 deck.yaml，不用 custom_html 補洞。若確實缺版型，停下來回報使用者/協作 agent 討論新增 component，不自創。
9. **export**：`npm run export -- decks/<id>` 產 PDF 與 PPTX。確認 PDF 無缺字、PPTX 文字可編輯。
10. **交付**：回報使用者——dist 路徑、頁數、使用的版型清單、warning 處理說明、待使用者補的素材（如需生圖）。

## PPTX 注意事項

- PPTX renderer 只支援 PPT-safe 子集；validator 會標記哪些頁在 PPTX 中降級為圖片（如 custom_html、複雜框架圖）。
- 交付時明確告知使用者哪些頁可編輯、哪些是圖片。

## 禁止事項

- 直接寫 HTML/CSS 或 inline style（唯一例外：custom_html escape hatch，用了要在交付說明中標注）。
- 自訂顏色、字級——一律用 tokens。
- 跳過 validate 或 screenshot 步驟直接交付。
- 在引語、圖片中留下可識別的學生/受訪者資訊。
