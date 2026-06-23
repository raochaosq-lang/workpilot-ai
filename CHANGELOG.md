# Changelog

## v0.2.0 — 2026-06-24 — 九轮 Fleet 对抗式执行深扫 (R2–R10)

Tag: `v0.2.0` (SemVer minor — 大量正确性 / 诚实 / 安全 / 数据保护 与无障碍硬化，无破坏性变更、无新功能). 在 v0.1.1 完成「人工逐轮阅读核验」后，本轮用 **fleet 对抗式执行深扫**（每轮 6 个维度 finder 并行 + 各自独立 skeptic 复核）覆盖全部十轮主题。深扫专门跑代码、喂构造输入，找出阅读会漏的执行级缺陷——并确实如此：在所有人工标记 CLEAN 的轮次里仍发现 **80 条确认真问题**。

每轮：finder → 独立 skeptic 复核（默认证伪，仅在能用代码证据站住时确认）→ 主循环串行修复 → 回归守卫锁定 → `npm run check` 跑到 0 失败 + 对抗执行 probe 干净 → 提交。复核器证伪了若干夸大/不成立的发现（如 R6 的「文化场景被误标」实为 `getValidScenario` 恒返回 interview、文化场景休眠不可达；R9 的「队友读取云端副本」实被 user_id 隔离否定），严重度据实下调。R5 还抓到 R4 自己引入的回归（整数 1% 被当 0–1 分数放大成 100%），证明对抗式再扫的价值。

最终套件：smoke 绿（`routing-fixtures=8`、`mock-records=200`，静态断言由 ~138 增至 ~240）+ logic 绿（断言 **194 → 308**），对抗执行 probe 干净。

### 修复 (Fixed) — 80 条，按轮次

- **R2 面试管理 (8)**：导入的非预设「我的意向」自由文本在编辑保存时被静默清空；保存失败却提示「已保存」（reload 丢记录）；公司识别异步期间保存弹窗可被 Esc/遮罩关闭、输入被覆盖；已挂流程因残留 pending 轮被算进「即将面试/已过期」；transcript/summary/uploadedFile 保存吞掉配额失败仍排队云同步→历史悬挂引用；「待安排」概览卡与「待补时间」chip 计数口径不一致；草稿 `STATE_KEY` 单一全局槽在身份切换时被对方覆盖；搜索实际匹配 JD/备注但文案未告知。
- **R3 AI 复盘核心 (11)**：单作者标签笔记（公司：/年包：）被伪装成「多人对话」误路由为面试（改为要求**复现说话人**）；API 模式覆盖模型返回的 recruiterSubtype；trust-note 对规则结果谎称「当前由 <模型> 生成」；generate/regenerate 不停止进行中的录音/转写（麦克风继续录、输入被覆盖）；重传删除转写稿下方手写笔记；`inferSourceTime` 把正文里的时间段当成片段时间戳；来源按钮在时间戳重复时定位错轮；说话人正则把日期/数字（2021年：）当人名；零宽字符输入可触发生成；实时录音每帧重算路由+分段；历史与面板复盘名不一致。
- **R4 生成引擎 (15)**：QA 卡答案窗口跨过中间提问轮、把不同问题的答案粘在一起；候选人陈述中的疑问词催生「角色颠倒」的伪面试官卡；猎头事实把占位/否定词当成具体公司+岗位；文化语言检测 `/[a-zA-Z]{24,}/` 永不命中→恒标中文（改为按 CJK/拉丁字符量判定）；Anthropic 浏览器直连缺 `anthropic-dangerous-direct-browser-access` 头必 CORS 失败；面试时长用合成 18s/行伪造；sim 与渲染器「具体机会」判定 OR/AND 不一致；文化卡混入相邻说话人且对「对方」发言给「你」的建议；0–1 分数/通过率被压成 1%；`parseModelJson` 把非对象 JSON 原样返回成空报告；API 加载显示本地引擎步骤文案；`inferCultureMisreadRisk` 凭单个 would/could 断言「委婉担忧」；猎头字符串字段渲染成 `[object Object]`；同标签事实只留最后一条；OpenAI/Gemini/Anthropic 丢弃 HTTP 200 错误体。
- **R5 结果渲染/统计/诚实 (7)**：空 modelUsed 的旧/云历史在列表与导出里被误标「真实大模型：<当前模型>」（并丢失免责声明）→ 纯函数 `normalizeStoredModelLabel`；**R4 回归**：整数 1% 被放大成 100% → 改为开区间 (0,1)；无值事实变「待确认」伪造具体机会；完整度标签把占位值计入；猎头「待确认」统计卡滚动到无问题的 summary 区；QA 分数 0 显示成 78 却标「需重练」。
- **R6 账号/云/安全 (7)**：云历史 mapper 丢失 contentRoutingManual/Reason 与 audioFileId（同步后手动分类被重测、音频重链失效）；诊断快照非 JSON 分支裸吐账号值→恒掩码；登录成功但首次云加载失败被当登录错误且弹窗不关；登录表单无回车提交；脱敏正则漏 clientId/publishableKey/anonKey 别名；`maskSensitiveValue` 对数组密钥半泄露；demo-admin 会话在任意源被复活（改为按 `isDevCloudConfigAllowed` 把关）。
- **R7 模型/ASR 配置+音频/录音 (11)**：customModel 镜像下拉选项→陈旧自定义 id 越过云同步覆盖模型；ASR 连接测试对 200-错误体/空转写谎报「连接成功」；API Key 输入框无 autocomplete/密码管理器退出；不可解码音频被静默接受、转写仍可点；录音 onerror 对无害 no-speech 弹惊吓提示；数值参数接受 0/负/越界；`isAsrProbeReachable` 因裸词「model」误判；无超大文件提示；非字符串转写崩 `.trim()`；`parseJsonOrEmpty` 遇 JSON-null 体抛错；onerror 把 audio-capture/service-not-allowed 映射成误导性「稍后重试」。
- **R8 历史/导出/保真 (7)**：`saveCurrentToHistory` 同源去重只删本地未删云端→旧副本下次同步复活；历史+管理器搜索吃掉空格（聚焦时 trim 回写）；嵌套对象事实/键值映射导出 `[object Object]`；`copyText` 忽略 execCommand 返回值→空剪贴板谎报「已复制」；导出文件名放过 bidi/控制字符；导出 JSON 谎称 version:1 可恢复格式。
- **R9 安全深扫 (4)**：导出/复制/云 Markdown 原样拼接模型+转写文本→外部查看器自动拉远程图片(追踪像素)/执行内联 HTML（新增 `escapeMarkdownText`）；被篡改/云端嵌套对象字段渲染 `[object Object]`；诊断快照泄露顶层 JSON 字符串/数组 token；脱敏漏 serviceRole/service_role。
- **R10 跨功能/无障碍/覆盖审计 (10)**：「去复盘」切到**另一条**记录时静默销毁未保存的转写/已生成结果（守卫只覆盖同记录）；重存恢复的旧/规则报告把 modelUsed 改写成当前真实模型名（R5 显示修复在写入侧复发）；`getFactValue` 仍接受占位/否定词伪造具体机会；切换复盘不停进行中的录音/转写；本地导入失败后同步药丸永久卡在「同步中」；五个非确认弹窗（历史/模型/来源/账号/开发者云）开启不入焦、关闭不还焦；账号弹窗不聚焦邮箱；`normalizeStringList` 对象→`[object Object]`；`mergeRecruiterCoreFacts` 把「待确认」占位拼到真实值前。

### 改动 (Changed)

- 新增多个共享纯函数收敛重复逻辑并便于测试：`coerceText`（扁平化嵌套对象/数组）、`escapeMarkdownText`、`normalizeStoredModelLabel`、`detectSourceLanguage`、`isPlaceholderFact`、`hasConcreteOpportunityFacts`、`clampModelNumber`、`resolveCustomModel`、`hasFailedRound`、`getDraftStateKey`、`openModalWithFocus`/`restoreModalFocus`。
- 草稿持久化按身份作用域化（`${STATE_KEY}:${userId}`，含安全的一次性迁移与脱敏清理保护）。
- `package.json` 版本 `0.1.1` → `0.2.0`。

### 新增 (Added)

- 回归守卫大幅扩充：smoke 静态断言约 +100，logic 可执行断言 **194 → 308**（每条修复均配套守卫；多处通过 `scripts/logic-test.mjs` 暴露纯函数以驱动执行级断言）。其中 R5/R7 的守卫在提交前就抓到了我方修复自身的边界回归（整数 1%、空字符串 clamp）。
- `.agents/test-rounds/` 工作流工具：`round-runner.js`（单轮深扫 workflow）、`probe.mjs`（对抗执行 probe）、`ledger.json`（逐轮台账）。

### 移除 (Removed)

- 导出 JSON 的误导性 `version: 1` 字段（无对应导入路径），改为诚实的 `snapshotNote`。

## v0.1.1 — 2026-06-18 — Three-round test & UX-hardening pass (R10)

Tag: `v0.1.1` (SemVer patch — fixes + hardening only, no new features, no breaking changes). Unlike prior sandboxed rounds, this environment allowed real local-port binding, so the dev server (`npm run dev` on `http://127.0.0.1:8001/`) and full browser journey verification (manager + AI-review flows, light/dark/mobile) were exercised end-to-end, and the git tag was created normally.

Three full rounds were run from clean state (Round 1 baseline + journey, Round 2 error/edge/a11y audit, Round 3 regression + gates + closure). Every round ran the complete suite (`npm run check` = `smoke-test.mjs` + `logic-test.mjs`) to 0 failures and walked the key user journeys as a real user. All findings were root-caused, fixed in place, and locked with regression guards. Final suite: smoke green (`routing-fixtures=8`, `mock-records=200`, 138 static assertions) + logic green (assertions 145 → **149**).

### 修复 (Fixed)

- **结果统计卡片标签被裁切**：复盘/猎头报告右上角的统计卡用 `flex-direction: row-reverse` 横向排「数值 + 标签」，在 180–240px 的窄侧栏里 3 张卡放不下，`overflow:hidden` 把较宽数值（如 `86%`/`100%`）旁的标签（`通过率`、4 字的 `事实信息`）截断，用户只看到半个标签。改为纵向堆叠（数值在上、标签在下），任意数值宽度都不再裁切。
- **重新生成确认弹窗误称报告类型**：猎头「职业方向分析」报告点「重新生成」时，确认弹窗用 `getScenario().reportName` 硬编码成「AI 面试复盘报告」。改用内容感知的 `getActiveReportName()`，标题随内容类型切换为「覆盖当前整理结果？/复盘结果？」。
- **暗色模式：面试作战台标题栏不可读**：`.manager-headerline` 硬编码近白底 `rgba(255,255,255,0.82)`，暗色下文字转浅，浅字叠浅底几乎看不清。已加入暗色再着色清单。
- **暗色模式：残留亮白控件**：未选中的输入方式标签（`.capture-tab`）、粘贴示例提示卡（`.text-empty-hint`，浅字叠浅底对比度不达标）、`trust-note` 提示条、面板「重置」按钮在暗色下仍是亮白底。逐一补暗色再着色（选中标签仍保留主色渐变）。
- **数据完整性：本地面试记录重复**：身份发生切换（匿名→账号、账号→账号）后，内存中仍带旧 `userId` 的记录被重新保存时，`saveScopedLocalList` 的 `[...others, ...scoped]` 会让同一条记录 id 同时以旧、新两个 userId 留存，产生「同 id 重复行」。已修复为：记录 id 全局唯一，当前作用域副本覆盖任何残留的同 id 旧副本。

### 改动 (Changed)

- `getScopedLocalList` 读取时按 id 去重，已损坏的存储在下次读取/保存时自愈，UI 与持久层都不再出现同 id 重复。
- `.stat-card` 内边距与最小高度随纵向布局微调（`padding: 7px 9px 7px 12px`、`min-height: 48px`），最宽数值（`100%`）叠最长 4 字标签经压力测试 0 溢出。
- `package.json` 版本 `0.1.0` → `0.1.1`。

### 新增 (Added)

- 静态回归守卫（`scripts/smoke-test.mjs`）：统计卡纵向布局、重新生成文案内容感知、暗色再着色（hero/标签/示例提示/trust-note）、存储层同 id 去重，共新增 8 条断言。
- 可执行回归（`scripts/logic-test.mjs`）：新增「存储作用域去重 / 跨 userId 不产生同 id 重复 / 读取去重自愈」断言，并暴露 `getScopedLocalList`、`saveScopedLocalList`、`getCurrentUserId` 供测试驱动（断言 145 → 149）。

### 移除 (Removed)

- 无。

## 2026-06-15 — Three-round confirmation UX regression pass (R9)

Target tag: `senlo-test-20260615-r9-confirmation-polish`. Git tag creation is blocked in the current sandbox because `.git`, `.git/index`, and `.git/refs/tags` are not writable; final fallback artifacts are saved under `/private/tmp/selon-checkpoints/`.

### Round 1 — baseline correctness

- Verified the project shape and guardrails: static `index.html` app, no production dependency changes, CloudBase/account boundaries unchanged.
- `npm run check` passed (`smoke-test.mjs` + `logic-test.mjs`, `routing-fixtures=8`, `mock-records=200`, logic assertions=139).
- `git diff --check` and syntax checks for `scripts/smoke-test.mjs`, `scripts/logic-test.mjs`, and `scripts/serve.mjs` passed.
- `npm run dev` is still blocked by the current environment with `EPERM` local port binding and prints `file:///Users/raochaodembpm2max/Documents/selon/index.html` as fallback.

### Round 2 — UX / interaction audit

- Found remaining browser-native `confirm()` usage in risk-sensitive flows: cleaning legacy auth state, clearing CloudBase config, switching scenarios while recording/transcribing, and switching input mode while recording/transcribing.
- Replaced those flows with the product confirmation dialog, including consequence copy, safe cancel labels, and recoverability wording.
- Added shared helpers for interrupting recording/audio transcription so scenario switching and input-mode switching behave consistently.
- Updated async callers so a canceled confirmation keeps the current recording/transcription and does not continue with focus, sample-fill, or navigation side effects.

### Round 3 — regression and artifact closure

- Added smoke guards that fail if any direct native `confirm()` remains outside the `showConfirmDialog` fallback.
- Added guards for the legacy-account cleanup dialog, CloudBase config clear dialog, recording interruption dialog, and audio-transcription interruption dialog.
- Final checks passed: `npm run check`, `git diff --check`, and script syntax checks.
- Playwright visual automation could not run in this environment because the wrapper needed to fetch `@playwright/cli` and npm registry access failed with `ENOTFOUND registry.npmjs.org`; no browser screenshot verification is claimed for this pass.

## 2026-06-14 — Two-round bug-fix & hardening pass (R7 + R8)

Two further full test rounds over the recruiter-routing build, each a multi-agent adversarial bug hunt with every candidate independently verified before fixing. Fixes applied in place and locked with executable regression assertions; `npm run check` (smoke + logic) and interactive browser verification both green. The logic harness grew from 126 → 139 assertions.

This pass also folds in the earlier same-session fixes to the cloud-sync layer and the AI-review failure path (see "Defects fixed" → cloud sync / generation below).

### Round 7 — `senlo-test-20260614-r7-bugfix-hardening` (correctness, data-loss, crashes)

Adversarial hunt across 7 dimensions (recruiter routing, AI-review generation, cloud sync, import pipeline, XSS/secrets, state/normalization, malformed/bulk inputs); 15 findings confirmed, 8 refuted (XSS surface and API-key device-locality re-confirmed clean). Fixed:

- **Crash / silent demotion (high+med):** `normalizeResult` and the recruiter normalizers threw `TypeError` on `null` array elements or a non-array `facts` container — breaking the history modal, aborting cloud refresh mid-way, and silently demoting a valid model response to the rules fallback. Added null/non-array guards across every list normalizer (`normalizeQaCards`/`FocusItems`/`ConcernItems`/`ImprovementItems`/`NextSteps`/`StringList`/`RecruiterFacts`/`RecruiterActions` + the top-level task/risk/question maps), coerced object/string `facts` containers, and made `historyService.list` + the cloud refresh maps per-record fault-tolerant.
- **Routing misclassification (high+med):** `detectContentRouting` only recognized the four literal `面试官/候选人` labels, so named-speaker transcripts (`张伟：`/`王芳：`) and short labeled exchanges mentioning interview-internal vocab (`职业定位`/`市场`/`简历`) mis-routed to `recruiterConversation`. Now treats a real multi-speaker dialog (≥2 named speakers, excluding the `说话人N` fallback) or any canonical label in a ≥2-segment exchange as transcript evidence, and dropped interview-internal terms from the strong-recruiter short-circuit.
- **Reopen layout bug (high+med):** auto re-detection on render/reopen overwrote `state.contentType`, hiding a generated recruiter report behind the interview layout. `renderContentRouting`/`loadAll` now skip re-detection while a formal result is shown, and the manual content-type override is persisted in history and restored on reopen.
- **XLSX corruption (high):** `parseWorksheetXml` did not match self-closing empty cells (`<c r="B2" s="3"/>`), so a blank cell swallowed the next cell and shifted every later column. Regex now matches both self-closing and paired cells.
- **Cloud sync (high):** manual 同步 (`refreshAllCloudData`) bypassed the serialized mutation chain — a stale read could silently revert a just-saved local edit and report a false 已同步. It now drains in-flight writes before reading, and if a queued write failed it preserves local data and surfaces the error instead of overwriting.
- **Import pipeline (med):** ragged comma tables (a trailing cell omitted) were rejected by the strict equal-column gate and lost; `looksLikeDelimitedTable` now accepts a dominant column count. `.txt` / single-column CSV imports failed with "empty import file"; they now route through the prose/label extractor.
- **Cap propagation (low):** transcripts/summaries/uploaded-file 100-caps were local-only; eviction now also deletes from the cloud (mirrors the history 50-cap), so a later refresh can't resurrect them.

### Round 8 — `senlo-test-20260614-r8-regression-a11y-darkmode` (regression + polish)

Fresh hunt (regression review of every R7 change + a11y, responsive/dark-mode, bulk performance, copy consistency, account/auth); 14 findings confirmed, 3 refuted. R7 changes regressed nothing — the routing, eviction and drain fixes held. Fixed:

- **Dark-mode contrast (high):** high/mid `.improvement-card`s (recruiter "风险与下一步行动" + interview "待提升点") kept light-mode backgrounds via higher-specificity selectors, leaving light title/body text near-invisible; `.count-badge` and ordinal chips likewise kept near-white fills. Added dark-mode overrides — browser-verified the cards re-tint and badges become readable.
- **Text-import substring mis-match (low):** `findTextImportValue` matched any label *containing* an alias, so prose like "我对这家公司的整体印象：…" was assigned as a company. Now requires exact or `endsWith` match.
- **Recruiter company noise (low):** rules-path `inferRecruiterFacts` leaked speaker/verb prefixes (e.g. "猎头说腾讯") into 推荐公司/团队; now stripped and run through `sanitizeCompanyName`.
- **Cross-user routing leak (low):** `loadAll` restored `contentType`/`recruiterSubtype`/`contentRoutingManual` unconditionally; now gated on `canRestorePrivateState` like the other private fields.
- **Accessibility (low):** added `aria-labelledby` to the model/history/source dialogs (were unnamed to screen readers) and Enter/Space keyboard activation to the `role="button"` model-status pill.

Known, deliberately-deferred polish (need real browser verification, no functional/correctness impact): modal focus-trap + focus-restore + initial-focus-into-dialog, the account-menu `role="menu"` and capture-tab `role="tab"` keyboard patterns, and debounce/memoization micro-optimizations for the bulk-data (200+ records / ~20k-char transcript) render paths.

## 2026-06-14 — Five-round verification pass (deep logic + adversarial bug hunt)

Added a second, executable test layer (`scripts/logic-test.mjs`, 126 assertions) that bootstraps the real inline app script in a Node sandbox and exercises pure helpers with adversarial inputs. Wired it into `npm run check` (`smoke-test.mjs && logic-test.mjs`). Ran a 6-dimension adversarial bug hunt (each candidate double-verified) plus interactive browser verification of every core flow.

Defects found and fixed (each with a regression guard):

- **`parseWorksheetXml` sparse-column corruption** — `row.map(cell => cell || "")` skips sparse-array holes from omitted/empty XLSX columns, leaving `undefined` cells that serialize to `null`. Switched to `Array.from(row, …)` which densifies holes to `""`.
- **CSV mid-field quote breaks columns** — `parseDelimitedText` toggled quoted-mode on any `"`, so a stray quote in an unquoted field swallowed the next delimiter and merged columns. Opening quotes now only count at a (whitespace-only) field start; mid-field quotes are literal.
- **Re-import wiped existing data** — a re-imported spreadsheet row that matched an existing record replaced its rounds/fields wholesale, so empty imported cells erased saved results, notes, and JD (and dropped review artifacts). Added `mergeInterviewRecordData` for a field-level merge that prefers incoming non-empty values and preserves existing data, file/transcript/summary links included.
- **`normalizePercentValue` truncated decimals** — the percent regex captured only the integer part, so `85.5%` became `85` instead of `86`. Capture group now includes the decimal so it rounds correctly.
- **`sanitizeCompanyName` left trailing noise** — inferred names like `Google HR` / `字节跳动的` kept the trailing `HR`/`的`. Added trailing-noise strips.
- **Mobile horizontal overflow** — a `@media (max-width: 768px)` rule forced the visually-hidden `.file-input` to `width: 100%`, pushing the absolutely-positioned input ~31px past the viewport. Kept it hidden (`width: 1px`).

Verified at runtime (browser): interview create/edit/delete + required-field validation + unsaved-close guard + search/filter/empty-state recovery; content-type routing (interview vs recruiter); rules-fallback generation with honest "规则快速分析" labeling; recruiter report structure and non-linking history; text/TSV/free-text import; JSON export (confirm dialog + valid payload); persistence across reloads; XSS escaping of injected record fields; keyboard shortcuts with editable-target guard; nav `aria-current`; dark-mode contrast; responsive 375/560/768/1280; and a 313-record stress pass (search ~15ms, no overflow, no crash).

## 2026-06-14

### Phase 0 — `senlo-comm-type-00-baseline`

- Completed baseline discovery for the content-type routing work: this is still a static `index.html` app with `npm run check` as the primary no-dependency smoke gate.
- Confirmed the protected paths that must keep working: interview management, AI interview review, history saving, JSON/Markdown export, local persistence, model settings, and CloudBase sync boundaries.
- Verified baseline commands:
  - `npm run check` → passed (`Senlo smoke check passed.`)
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed
- Git checkpoint commit/tag was blocked by `.git/index.lock Operation not permitted`; saved fallback checkpoint artifacts under `/private/tmp/selon-checkpoints/`:
  - `senlo-comm-type-00-baseline.head`
  - `senlo-comm-type-00-baseline.patch`
  - `senlo-comm-type-00-baseline.tar.gz`

### Phase 1 — `senlo-comm-type-01-discovery`

- Kept the existing interview-first product structure and added a minimal separate routing model instead of repurposing the old `scenario` path.
- Designed two top-level content types: `interview` and `recruiterConversation`, plus recruiter subtypes for opportunity recommendation, career analysis, profile positioning, interview strategy, compensation negotiation, follow-up coordination, and mixed conversations.
- Preserved CloudBase collection and security-rule boundaries; the new fields are stored in existing report/history JSON documents for backward-compatible local/cloud persistence.
- Verification after this phase:
  - `npm run check` → passed
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed
- Git checkpoint commit/tag remained blocked by `.git/index.lock Operation not permitted`; fallback patches are saved under `/private/tmp/selon-checkpoints/`.

### Phase 2 — `senlo-comm-type-02-classifier`

- Added local rules-based content routing for pasted text, uploaded/recorded transcripts, and sample/manual input paths.
- Added visible “当前识别” UI with content type, recruiter subtype, manual correction selects, and a “重新识别” action.
- Manual correction preserves source/sourceByMode, existing history, and any retained interview context; switching type invalidates only the current generated result so the UI does not show a stale report.
- Verification after this phase:
  - `npm run check` → passed
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed

### Phase 3 — `senlo-comm-type-03-recruiter-report`

- Added a recruiter-specific `recruiterReport` structure with counterpart, purpose, facts, analysis, questions, risks, next actions, copyable reply, and subtype-specific sections.
- Added local rules analysis for recruiter conversations and a model prompt that asks configured LLMs for the same recruiter-specific JSON structure.
- Reworked result rendering for recruiter content into a “职业机会情报卡 + 下一步行动台” view and removed interview-only semantics such as Q&A, pass rate, and interviewer focus from that route.
- If no concrete company or role is present, the UI shows a career judgement/action card instead of an empty opportunity card.
- Verification after this phase:
  - `npm run check` → passed
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed

### Phase 4 — `senlo-comm-type-04-history-export`

- History records now store and restore `contentType` and `recruiterSubtype`.
- Markdown export and copy paths now branch by content type; recruiter reports include analysis mode, content type, subtype, facts, analysis, questions, risks, actions, and copyable reply.
- Recruiter history is not default-linked to interview rounds, and deleting recruiter history cannot clear interview round review markers.
- Updated README and CloudBase documentation to describe the content-type routing behavior and sync boundary without changing collections or security rules.
- Extended `scripts/smoke-test.mjs` with static guards for routing controls, classifier functions, recruiter subtype coverage, recruiter report rendering, history unlink safety, and recruiter Markdown/copy paths.
- Verification after this phase:
  - `npm run check` → passed
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed

### Phase 5 — `senlo-comm-type-05-final-regression`

- Added executable routing fixtures to `scripts/smoke-test.mjs` covering:
  - interview transcript → `interview`
  - concrete opportunity recommendation → `recruiterConversation / opportunityRecommendation`
  - no-specific-job career analysis → `recruiterConversation / careerAnalysis`
  - profile positioning → `profilePositioning`
  - interview strategy → `interviewStrategy`
  - compensation negotiation → `compensationNegotiation`
  - follow-up coordination → `followUpCoordination`
  - opportunity + market analysis → `mixed`
- Tightened classifier edge cases found during code-level fixture testing:
  - Salary facts in a concrete opportunity no longer force `mixed`.
  - “没有具体公司/岗位” no longer creates an empty opportunity recommendation.
  - HR interview-strategy feedback is routed to recruiter conversation instead of interview review when there is no interview transcript speaker structure.
- Code-level recruiter generation verification passed for no-specific-job career analysis: generated a recruiter report, avoided a concrete opportunity card, and exported Markdown with `recruiterConversation / careerAnalysis` plus a copyable reply section.
- Final standard verification:
  - `npm run check` → passed (`routing-fixtures=8`, `mock-records=200`)
  - `git diff --check` → passed
  - `node --check scripts/smoke-test.mjs` → passed
  - `node --check scripts/serve.mjs` → passed
- Local browser verification was not executable in this environment:
  - `npm run dev` returned `EPERM` for local port binding and printed `file:///Users/raochaodembpm2max/Documents/selon/index.html` as fallback.
  - The in-app Browser rejected the fallback `file://` URL due to Browser URL policy, so no click-through or screenshot verification was performed.
- Git checkpoint commit/tag remained blocked by `.git/index.lock Operation not permitted`; final fallback patch is saved under `/private/tmp/selon-checkpoints/`.

## 2026-06-13

Five-round full-coverage test pass (real browser-driven verification via local dev server + an adversarial multi-agent code audit). Each round seeds its own normal / edge / malformed / bulk data, fixes defects in place, and is verified before tagging.

### Round 1 — `senlo-test-20260613-r1-manager-core` (interview management + cross-cutting defects)

Browser-verified: create/edit/delete, required-field validation, search + status + derived quick filters, filtered empty-state recovery, post-save next-action banner, unsaved-change guard, and localStorage persistence across a server restart. Injected `<script>`/`<img onerror>`/`<svg onload>` payloads through the real form path and confirmed they render as inert escaped text (sentinel never fired).

Defects found (by the adversarial audit + manual testing) and fixed:

- **XSS (high):** `renderModelStatus()` interpolated the user-controlled `provider` and free-text `asrProvider` model-config values into `innerHTML` without escaping. Now escaped via `escapeHtml`. Verified a payload in `asrProvider`/`provider` renders inert.
- **XLSX import (high):** the workbook-relationship regex used `\\\\b`, which compiles to a literal `\b` (backslash-b) instead of a `\b` word boundary, so the relationship→worksheet lookup never matched and silently fell back. Fixed the escaping.
- **XLSX import (high):** shared-string cells with an empty/missing `<v>` index resolved to `Number("")===0` and returned `sharedStrings[0]` (wrong value). Now validated as a finite, in-range integer or treated as empty.
- **XLSX import (medium):** a malformed/malicious column ref (e.g. `ZZZZZZ1`) produced a giant sparse array (memory DoS). Column index is now clamped to Excel's max (16384) or appended.
- **Source evidence (medium):** `findSourceEvidence()` with an empty/invalid `sourceTime` parsed to `[0,0]` and always matched the first transcript segment, showing bogus evidence. Now guarded (and `parseTimeRange` hoisted out of the loop).
- **Model JSON (medium):** the second-pass `JSON.parse` in `parseModelJson()` was not wrapped in try/catch, so a malformed model response threw instead of degrading to the structured fallback. Now wrapped.
- **Data normalization:** `normalizeInterviewRound` used `||` for `roundIndex` (dropped a valid `0`) → `??`; `normalizeHistoryRecord` mapped `null` roundIndex to `0` (spurious round-1 link) while `undefined`→`null` — now both missing values map to `null`.
- **Transcript segments:** segment filter now drops whitespace-only segments, not just empty ones.
- **Export filename:** `buildExportFileName` now collapses repeated hyphens and trims leading/trailing hyphens so names like `name -2026-06-13.json` are clean.
- **UX consistency:** the interview-form unsaved-change guard used the native `confirm()`; replaced with the product `showConfirmDialog` (kicker/title/desc + "继续编辑 / 放弃修改并关闭"). Verified discard does not persist the edit and cancel keeps it.

### Round 2 — `senlo-test-20260613-r2-review-flow` (AI review + rules analysis + history)

Browser-verified end-to-end, no new code defects (the relevant fixes from Round 1 were confirmed in real flows):

- Default input path is paste-text; one-click "填入示例" loads a 13-segment sample transcript and the quality hint reports "已识别 13 段说话人片段，适合生成".
- Rules-based generation (no model configured) produces a full structured report — 8 Q&A cards, 6 interviewer-focus items, 6 next steps, 4 key conclusions, tasks and risks — correctly labeled "规则快速分析 · 不等同于真实大模型判断", never as real-model output.
- **Verified the `findSourceEvidence` fix:** a valid `sourceTime` opens the correct transcript segment in the 原文依据 drawer, while empty / "未定位" / `undefined` now return `null` instead of falsely highlighting the first segment.
- **Verified the `normalizeHistoryRecord` roundIndex fix:** saving a review linked to round 1 (index 0) preserves `roundIndex: 0`; an unlinked save keeps `roundIndex: null` (no spurious round-1 link).
- Save-to-history dedups on re-save; linking a review to an interview round writes a `summaryId` round marker, and deleting that history record unlinks it (round marker cleared, toast "已删除历史记录，并取消面试轮次复盘标记").
- Regenerate confirms before overwriting ("覆盖当前复盘结果？" with recoverability copy); history search empty-state offers a "清空搜索" recovery; long-source (>20000 chars) generation prompts a cost/latency confirmation and cancelling preserves the input.

### Round 3 — `senlo-test-20260613-r3-import` (CSV / TSV / TXT / XLSX / JSON import + heuristics)

Built a real 2304-byte XLSX fixture (worksheet deliberately named `xl/worksheets/data.xml`, not `sheet1.xml`, so it is only reachable via the workbook-relationship lookup) and confirmed the **`relPattern` fix is what makes import succeed** — rows parsed correctly through the full read→recognize→normalize→merge pipeline. Also unit-verified the shared-string and column-bounds fixes against crafted worksheet XML.

- **XLSX fixes verified (from Round 1):** rich-text `<si>` concatenation, `inlineStr`, empty `<v></v>` → `""` (not `sharedStrings[0]`), and a `ZZZZZZ1` column ref clamped to append (no 300M-element sparse array, no crash).
- **CSV/TSV:** quoted fields preserve embedded commas (`未来,智能科技`) and newlines (`算法\n产品负责人`); delimiter auto-detection picks `,` vs `\t`; result column normalizes (通过/pass/已offer→passed, 未通过/挂了→failed, 待定/空→pending); dates `2026-08-15 10:30` and slash-form `2026/08/20 16:00` both normalize to `datetime-local`.
- **Text paste:** free-form `label：value` and tab-table both parse; company inference (`字节跳动` from prose) works; round-prefixed columns (`一面是否通过`, `二面是否通过`) map to the right round.
- **JSON import** parses arrays; empty / unrecognized / malformed inputs throw and surface friendly messages ("没有识别到有效内容。" / "没有识别到面试记录。…").
- **New fix — text-import heuristic pollution:** `applyTextImportHeuristics` assigned any token containing "面试" to `整体进展`, so a `JD：负责AI面试产品…` line leaked into the progress field. Added a guard that skips tokens beginning with another field's label (JD/公司/岗位/base/联系人/时间/地址/…); legit unlabeled progress phrases ("已约二面") are still detected.

### Round 4 — `senlo-test-20260613-r4-persistence-account` (persistence, export, account/dev mode, model config)

- **Persistence:** 5 interview records + history survive a full page reload and re-render; localStorage keys intact.
- **Export:** full-data JSON export prompts the privacy confirmation, then produces valid JSON with all top-level keys (interviews/history/transcripts/summaryReports/user/…); Markdown export prompts its privacy confirmation and emits a report carrying the "## 分析模式 / 规则快速分析 / 不等同于真实大模型判断" disclaimer so local reports are never passed off as real-model output.
- **Admin / developer mode:** `admin / datou123` login on a local-debug origin enters developer mode (header badges 管理员模式 · admin · 开发者模式; dev tools become visible).
- **Model config:** saving writes provider + keys to the device-local shared key `senlo_shared_model_config_v1`; an ordinary user on the same browser inherits it (mode → `api`). **Re-verified the XSS fix through the real save→render path** — an `<img onerror>` payload in the ASR-provider field renders inert (`&lt;img&gt;`, no element, sentinel stays 0).
- **Admin sign-out preserves shared secrets:** after admin signs out, `senlo_shared_model_config_v1` (incl. API key) is retained and the admin session/dev tools are cleared (dev buttons `display:none`) — matching the AGENTS.md rule that account work must not break model settings.
- **New fix — productized model-config clear:** `clearModelConfig` used the native `confirm()`; replaced with `showConfirmDialog` showing admin-vs-ordinary consequence copy ("普通用户也会失去这套共享配置…回退到规则快速分析"). Verified the dialog clears `senlo_shared_model_config_v1` and resets to defaults on confirm.

### Round 5 — `senlo-test-20260613-r5-responsive-a11y` (responsive, dark mode, a11y, keyboard, stress, regression)

- **Stress:** injected 205 records — the manager renders in ~28ms, search narrows to 1/205 with a correct summary, and status/derived filters work at scale without errors.
- **Responsive:** 375px mobile layout stacks the header, nav and action buttons cleanly; spotlight + queue reflow correctly.
- **Dark mode — two fixes:**
  - `.manager-filter-toolbar` used a hardcoded `#f8fafc` background with `#475569` text, leaving a light bar (and light-on-light text) in dark mode. Switched both to themed variables (`--card-soft` / `--text-secondary`) — identical in light mode, correct (`#172033` / `#9caec5`) in dark mode.
  - `.panel-head` (white `linear-gradient`) and `.section-head` (`#fbfdff`) kept light backgrounds in dark mode because the dark block only overrode their border. Added `background: transparent` for both in the dark media query so they inherit the dark panel; light mode is untouched.
- **Keyboard:** `n` opens a new record on the manager (and is suppressed while typing in an input/textarea via `isEditableEventTarget`); `Cmd/Ctrl+K` focuses the manager search / review input; `Esc` closes modals.
- **Accessibility:** nav `aria-current` toggles page↔false on switch; account button exposes `aria-haspopup="menu"` + `aria-expanded`; loading panel is `role="status" aria-live="polite"`, error panel is `role="alert"`.
- **Regression:** added 14 `scripts/smoke-test.mjs` guards locking in every fix from rounds 1–5 (XSS escaping, XLSX relationship/shared-string/column-bounds, source-evidence guard, parseModelJson try/catch, both productized confirm dialogs, text-import heuristic guard, roundIndex nullish handling, export-filename trim, dark-mode toolbar/header). `npm run check` passes; app boots with no console errors across both pages; the model→local import fallback degrades gracefully on auth failure.

## 2026-06-07

### Step `senlo-level3-20260607-07-confirmation-polish`

- Replaced native long-transcript generation confirmation with the product confirmation dialog, including cost/latency and recoverability copy.
- Replaced Markdown/JSON export confirmation with the product confirmation dialog so privacy-sensitive downloads no longer rely on browser-native `confirm`.
- Updated regeneration to confirm before overwriting any existing report, not only manually edited reports.
- Removed remaining user-facing `AI 正在生成结果` loading copy from normal navigation blockers.
- Extended `scripts/smoke-test.mjs` to guard product confirmation for long-source generation, export, and regeneration overwrite.

### Step `senlo-level3-20260607-06-trial-flow-closure`

- Added a one-click sample transcript entry so first-time users can complete the local review flow without preparing their own transcript.
- Added a post-save next-action banner after creating or updating an interview record, with direct actions for review, further editing, another new record, or returning to the workbench.
- Added derived quick filters for `即将面试`, `已过期待更新`, `待补时间`, and `待复盘` without changing the data schema.
- Replaced high-frequency native confirmations for interview deletion, transcript clearing, workspace reset, regeneration overwrite, and history deletion with a product confirmation dialog that explains object, consequence, and recoverability.
- Added analysis-mode metadata to Markdown exports so local rules-based reports are not confused with real large-model output.
- Extended `scripts/smoke-test.mjs` to guard the sample transcript path, post-save guide, derived quick filters, product confirmation dialog, and Markdown analysis-mode export.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md`.
- `npm run dev` was blocked by the current sandbox (`EPERM` local port binding). The script returned the fallback URL `file:///Users/raochaodembpm2max/Documents/selon/index.html`.
- In-app Browser validation of the fallback `file://` URL was blocked by Browser URL policy, so real click-through verification still needs a normal local browser or static hosting environment.

### Step `senlo-step-20260607-01-ux-clarity`

- Changed the AI review default input path from audio upload to pasted transcript text, including reset and restored-state fallback.
- Clarified unconfigured ASR states: audio upload now explains that transcription is not connected and directs users to paste existing transcript text.
- Renamed local non-model output to `规则快速分析` across status, trust note, result metadata, toast, and history labels.
- Productized unconfigured account state as local experience instead of an available login/register path.
- Extended `scripts/smoke-test.mjs` to guard the default paste-text path, ASR fallback copy, rules-based analysis labeling, and unconfigured-account state.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md`.
- Git tag creation was blocked by `.git/refs/tags/*.lock Operation not permitted`; checkpoint patch saved to `/private/tmp/selon-checkpoints/senlo-step-20260607-01-ux-clarity.patch`.

### Step `senlo-step-20260607-02-data-safety`

- Added privacy confirmation before exporting the current Markdown report, a history Markdown report, or the full local JSON data package.
- Added confirmation before clearing pasted transcript input, with clear copy that saved history reports are not deleted.
- Added a long-input generation confirmation and inline quality hint to warn about slower generation and possible model cost before users send very long transcripts.
- Extended `scripts/smoke-test.mjs` to guard export confirmation, clear-input confirmation, and long-source confirmation.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md`.
- Git tag creation was blocked by `.git/refs/tags/*.lock Operation not permitted`; checkpoint patch saved to `/private/tmp/selon-checkpoints/senlo-step-20260607-02-data-safety.patch`.

### Step `senlo-step-20260607-03-history-recovery`

- Added a one-click clear-search recovery action to the history filtered empty state.
- Expanded history deletion confirmation with the exact affected record and consequences.
- When deleting a history report that is linked to an interview round, the round review marker is now unlinked so the interview queue does not show a stale `有复盘` state.
- Extended `scripts/smoke-test.mjs` to guard the history clear-search action, delete consequence copy, and round-marker unlink path.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md`.
- Git tag creation was blocked by `.git/refs/tags/*.lock Operation not permitted`; checkpoint patch saved to `/private/tmp/selon-checkpoints/senlo-step-20260607-03-history-recovery.patch`.

### Step `senlo-step-20260607-04-docs-trust-boundary`

- Updated README to document the paste-transcript-first AI review path, ASR dependency, rules-based fallback, long-input warning, and sensitive export confirmation.
- Corrected the local run path to `/Users/raochaodembpm2max/Documents/selon`.
- Clarified that CloudBase sync is only available after real cloud configuration and login; unconfigured users remain in local experience.
- Updated `cloudbase/README.md` to match the current admin-mode entry and sync boundary wording.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md README.md cloudbase/README.md`.
- Git tag creation was blocked by `.git/refs/tags/*.lock Operation not permitted`; checkpoint patch saved to `/private/tmp/selon-checkpoints/senlo-step-20260607-04-docs-trust-boundary.patch`.

### Step `senlo-step-20260607-05-first-paint-copy`

- Updated static first-paint account copy to default to local experience instead of implying login/sync before CloudBase config is known.
- Replaced ambiguous `AI正在分析中...` loading copy with neutral `正在分析中...`.
- Updated the error fallback action for ordinary users to `使用规则分析`, while developer mode still uses local simulation wording.
- Removed an unnecessary `AI 为什么引用这段` label from the source drawer so evidence copy matches both rules-based and real-model output.
- Extended `scripts/smoke-test.mjs` to guard static local-experience copy and neutral loading/fallback wording.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs CHANGELOG.md README.md cloudbase/README.md`.
- Git tag creation was blocked by `.git/refs/tags/*.lock Operation not permitted`; checkpoint patch saved to `/private/tmp/selon-checkpoints/senlo-step-20260607-05-first-paint-copy.patch`.

### UX optimization

- Improved interview manager filtering with a visible result summary and one-click reset path.
- Added unsaved-change protection for the interview form, including close, backdrop, and cancel actions.
- Expanded interview deletion confirmation with record details and consequence copy.
- Added busy feedback for interview form save actions to reduce accidental repeated submits.
- Added an AI review context bar that keeps the linked interview, round, time, and location visible.
- Added input quality hints for review source text, including short-content and speaker-segment guidance.
- Improved AI review empty, loading, and error states with clearer next-step language and accessibility semantics.
- Added global keyboard handling for Escape, Command/Ctrl+K, and manager-page quick create.
- Added navigation and account menu accessibility state with `aria-current` and `aria-expanded`.

### Verification

- Updated `scripts/smoke-test.mjs` to cover the new UX safeguards, recovery paths, and accessibility markers.
- Verified with `npm run check`.
- Verified with `git diff --check -- index.html scripts/smoke-test.mjs`.

### Environment note

- Local dev server and Git write operations were blocked by the current sandbox (`EPERM` / `.git/index.lock Operation not permitted`), so phase patches were saved under `/private/tmp/selon-checkpoints/`.
