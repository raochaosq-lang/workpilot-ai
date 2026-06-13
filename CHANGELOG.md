# Changelog

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
