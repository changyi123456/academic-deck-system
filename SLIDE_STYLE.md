# SLIDE_STYLE — 個人學術簡報風格規格

作者品牌：江長屹（AI Physics Classroom, @aiphysicsteacher）。
本文件定義「什麼樣的簡報才算是他的簡報」。所有 agent 產出前必讀；與 `theme/tokens.json` 衝突時以 tokens 為準。

## 1. 設計哲學

- **一頁一主張**：每張 slide 只回答一個問題。文字型 SSCI 研究尤其如此——密度靠「刪」，不靠縮小字級。
- **證據優先**：任何結論頁（data-result / evidence-chain）都必須能回答「你憑什麼這樣說」——來源、樣本、統計量不可省略。
- **黑板美學、期刊嚴謹**：視覺語言來自黑板與粉筆，內容紀律來自期刊審稿。兩者不可互相犧牲。
- **投影可讀性 > 螢幕美觀**：所有設計決策先想「教室最後一排看得到嗎」。

## 2. 簽名元素（辨識度來源，每份 deck 必須出現）

| 元素 | 規則 |
|------|------|
| **ψ 印記** | 標題頁右下與尾頁；金色（accent.primary），不與其他 logo 並列 |
| **粉筆手繪底線** | 只用於 title 頁主標與 section 頁章節名；SVG 手繪筆觸、4px、accent.primary；正文絕不使用 |
| **方格紙紋理** | canvas 背景極淡格線（texture.grid_paper）；print 主題移除 |
| **粉筆向量箭頭** | 框架圖與流程圖的連接線：圓頭筆觸（chalk-round-cap）、3px 起 |
| **CER 證據鏈版型** | evidence-chain 是本品牌的招牌頁型：主張→證據→推理三段式，每場簡報的核心結論至少用一次 |
| **襯線中文標題** | 所有標題 Noto Serif TC；正文 Noto Sans TC；數據/統計量 JetBrains Mono |

## 3. 主題（雙預設）

- **board-dark**（黑板風）：墨綠底 #1e2a24、粉筆白字、金色強調。用於：線上分享、光線可控的場地、品牌感優先的場合。
- **bright-minimal**（明亮簡易風）：粉筆紙淺底 #faf8f3、墨綠主字、暗金強調。用於：明亮教室、投影機對比不佳、研討會白天場次。**不確定場地時選這個。**
- **print**：PDF/黑白列印派生主題，自動套用於 export-pdf。

硬規則：
- 金色（accent.primary）只作標題底線、強調框、大字強調——**絕不作小字正文色**（投影時最先消失）。
- 每主題文字對比至少 WCAG AA（正文 4.5:1）。
- 同一份 deck 兩主題都必須能渲染，不允許只在單一主題下排版成立。

## 4. 字級與密度（validator 強制）

- 正文最小 30px（logical 1600×900），任何情況不低於 28px；citation 可至 18px。
- 中文正文每張 45–90 字為佳，>120 字警告，>240 字拒絕。
- bullets 最多 5 條、每條 ≤ 60 字；panels 最多 3 欄。
- 表格 ≤ 6 欄 × 8 列，統計表超出時拆頁或移附錄。
- 標題 ≤ 2 行；英文副標可作第二語言輔助，不逐句翻譯。

## 5. SSCI 敘事的版型選擇規則

本系統以文字型教育研究為主體。選版型的順序邏輯：

| 敘事階段 | 首選版型 | 備註 |
|----------|----------|------|
| 開場 | title → agenda | agenda 即研究路線圖 |
| 研究動機 | statement / content | 一句話問題意識 |
| 文獻 | literature-map | 叢集＋明確標記 gap，不逐篇流水帳 |
| 研究問題 | research-question | 背景→缺口→RQ 條列 |
| 理論 | theory-framework | 節點＋關係圖，變項角色標明（IV/DV/中介/調節） |
| 方法 | method-design | 取向、對象、工具、程序、分析一頁收 |
| 量化結果 | stats-table / data-result | 表必附顯著性註記；圖必附 takeaway |
| 質性結果 | coding-themes → quote | 主題編碼表，關鍵主題配匿名引語 |
| 核心結論 | **evidence-chain** | 招牌頁型，主張→證據→推理 |
| 討論 | comparison / content | 與文獻對話 |
| 收尾 | summary → limitations-future → references → qa-closing | 限制頁誠實具體，不寫套話 |

公式頁（equation-focus / derivation）為次要元件，物理教學場合才啟用。

## 6. 圖表規則

- 色盤只用 tokens 的 data.series，依序取用；同一變項跨圖同色。
- 每張圖必填：takeaway（一句結論）、unit、source、sample_size（適用時）。
- 除顏色外必須有第二辨識通道：線型、標記形狀或直接標籤（色盲與黑白列印）。
- 前後測比較優先 pre-post 斜線圖；迴歸/SEM 用 path-diagram；不用圓餅圖。
- 圖表 canonical 是 data(CSV)＋spec(YAML)，渲染為 SVG；禁止只有一張截圖充當數據圖。

## 7. AI 生圖（GPT 最新模型）規範

概念示意、情境插圖可用 GPT 生圖，但必須維持視覺一致：

**Prompt 模板**（填入 [主題] 後直接使用）：

> Minimal chalk-style illustration of [主題], hand-drawn white and gold chalk strokes on dark green blackboard (#1e2a24), clean composition, generous negative space, no text, no letters, no watermark, 16:9
>
> bright-minimal 版：Minimal ink-and-gold line illustration of [主題], hand-drawn strokes on warm paper background (#faf8f3), dark green ink (#22302a), gold accents, no text, 16:9

進場規則（validator 檢查）：
- 圖內**不得有 AI 生成的文字**（必歪）；文字一律由版型排。
- 存入 `assets/illustrations/`，檔名 kebab-case，figure.source 標「AI 生成（模型名）」。
- 只用於概念示意與氛圍；**數據圖、裝置圖、理論框架圖絕不用 AI 生圖**，一律 SVG 元件繪製。
- 解析度至少 1600px 寬；不足者不得拉伸。

## 8. 動態與媒體

- 動畫只允許 fragment 逐條出現與 fade；禁止移動、旋轉、縮放轉場。
- PDF 輸出合併 fragment 為最終狀態。
- 影片必附 poster、時長、來源與外開連結 fallback。

## 9. 編輯式版面設計（v1.1 — 設計感是硬需求）

「乾淨但均勻」的排版視為**不合格**。每張 slide 必須有明確的視覺層級與構圖張力：

### 9.1 每頁一個視覺主角
每張 slide 先決定主角——巨大數字、粉筆插圖、圖表、引語或框架圖——文字退居輔助。整頁只有均勻文字區塊的 slide 不允許連續出現超過一張。

### 9.2 尺度對比
- Hero 數字（如 184%、N=443、40.4%）用 display 級以上，可至 240–300px，JetBrains Mono 或 Serif 數字，配 12–16px 的小標籤形成極端對比。
- 標題可跨到 72–96px；同頁其他文字保持 30px——對比靠「差距」，不靠整體放大。

### 9.3 不對稱構圖
- 預設網格 40/60 或 35/65，不是置中對稱；文字錨在一側，另一側留給插圖、數字或大量負空間。
- 章節頁（section）：全幅設計——巨大章節數字（粉筆風，200px+）＋滿版或半版插圖＋細金線，不是「置中一行字」。
- title 頁：主標佔據左 55–60%，右側 hero 插圖或 ψ 大印記；斜向粉筆底線製造動勢。

### 9.4 粉筆手繪註記層
關鍵數據與圖表可疊加手繪風 SVG 註記：圈選、箭頭、底線、旁註（手寫感傾斜 2–4°、金色）。每頁最多兩個註記，指向真正的重點。

### 9.5 插圖槽位（art slot）
schema 的 `art` 欄位為裝飾性示意圖（與數據 figure 分離）：
- `placement: right|left|full|background`；background 時自動降低不透明度至 12–18% 作紋理層。
- title、section、statement、quote、summary、qa-closing 頁**預設應配插圖**；缺插圖時 renderer 以 ψ 幾何紋樣 fallback，validator 發 info 提示。
- 插圖一律經 GPT 生圖（見 §7 prompt 模板）或 SVG 元件，記錄 `art.prompt` 供重生成。

## 10. 錯誤示例（agent 常犯，validator 會擋）

- ❌ 一張塞三個結論、兩張圖 → 拆頁。
- ❌ 金色 20px 小字註記 → 改 text.secondary。
- ❌ 文獻回顧十張逐篇摘要 → literature-map 一到兩張叢集化。
- ❌ 表格 9 欄塞進一頁縮到 16px → 拆或移附錄。
- ❌ 用 custom_html 調 margin 救爆版 → 回頭刪內容或換版型。
- ❌ 質性引語附受訪者真名 → 一律代號。
