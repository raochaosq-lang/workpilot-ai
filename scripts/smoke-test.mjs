import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexPath = join(rootDir, "index.html");
const html = readFileSync(indexPath, "utf8");
const htmlWithoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
const failures = [];
const notes = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function countMatches(pattern) {
  return [...html.matchAll(pattern)].length;
}

function getInlineScripts() {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
}

function runStaticChecks() {
  const ids = [...htmlWithoutScripts.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert(duplicateIds.length === 0, `Duplicate DOM ids: ${[...new Set(duplicateIds)].join(", ")}`);

  [
    "openAccountBtn",
    "openDevCloudBtn",
    "appNav",
    "managerNavBtn",
    "reviewNavBtn",
    "interviewFormModal",
    "interviewFormMessage",
    "interviewSearchInput",
    "interviewStatusFilter",
    "managerQuickFilters",
    "interviewFilterSummary",
    "clearInterviewFilterBtn",
    "interviewNextActionBanner",
    "reviewContextBar",
    "sourceQualityHint",
    "contentRoutingPanel",
    "contentTypeSelect",
    "recruiterSubtypeSelect",
    "redetectContentBtn",
    "fillSampleTranscriptBtn",
    "confirmModal",
    "modelModal",
    "devCloudModal",
    "historyModal",
    "toast"
  ].forEach(id => assert(ids.includes(id), `Missing required DOM id: ${id}`));

  assert(countMatches(/\bopenModelHeaderBtn\b/g) === 0, "Stale separate model header entry remains");
  assert(!html.includes("SHOW_DEV_CLOUD_CONFIG"), "Legacy SHOW_DEV_CLOUD_CONFIG flag remains");
  assert(html.includes('username: "admin"') && html.includes('password: "datou123"'), "Demo admin credential is missing");
  assert(/function isDeveloperMode\(\)\s*{\s*return isDevCloudConfigAllowed\(\) && isAdminActive\(\);/m.test(html), "Developer mode is not gated by admin session");
  assert(html.includes("SHARED_MODEL_KEY"), "Shared model config storage key is missing");
  assert(html.includes("DEMO_ADMIN_SESSION_KEY"), "Demo admin session storage key is missing");
  assert(html.includes("saveModelConfig()"), "Model config save path is missing");
  assert(html.includes("storageService.setJson(SHARED_MODEL_KEY, modelConfig)"), "Admin model config is not saved to shared storage");
  assert(html.includes("storageService.remove(SHARED_MODEL_KEY)"), "Admin model config clear path is missing");
  assert(html.includes("function renderQueueEmptyState"), "Queue empty state renderer is missing");
  assert(html.includes("els.interviewList.innerHTML = renderQueueEmptyState();"), "Interview queue empty state still uses the large hero empty block");
  assert(!html.includes("面试队列会自动帮你排优先级"), "Queue empty copy is too close to the top hero empty state");
  assert(html.includes('data-action="clear-interview-filter"') && html.includes("已清空搜索和筛选"), "Filtered empty state lacks a clear recovery action");
  assert(html.includes("function renderInterviewFilterToolbar") && html.includes("已筛出"), "Interview filter result summary is missing");
  assert(html.includes("function renderInterviewQuickFilters") && html.includes("needs-review") && html.includes("待复盘"), "Derived quick filters are missing");
  assert(html.includes("function renderInterviewNextActionBanner") && html.includes("去复盘") && html.includes("继续补充") && html.includes("再新增一条"), "Post-save next-action guide is missing");
  assert(html.includes("function isInterviewFormDirty") && html.includes("还没有保存"), "Interview form unsaved-change guard is missing");
  assert(html.includes("function buildDeleteInterviewConfirmMessage") && html.includes("已保存的历史复盘不会被自动删除"), "Interview delete confirmation lacks consequence copy");
  assert(html.includes("function showConfirmDialog") && html.includes("confirmModalTitle") && html.includes("confirmPrimaryBtn"), "Product confirmation dialog is missing");
  assert(html.includes("function renderReviewContextBar") && html.includes("当前复盘对象"), "Review context bar is missing");
  assert(html.includes("function getSourceQualityHint") && html.includes("内容偏短"), "Input quality hint is missing");
  assert(html.includes("function getSampleTranscriptText") && html.includes("已填入示例转写稿，可以直接生成复盘"), "One-click sample transcript path is missing");
  assert(html.includes("已取消面试关联，当前输入内容已保留"), "Review unlink action does not preserve input");
  assert(html.includes('id="uploadTab" class="capture-tab"') && html.includes('id="textTab" class="capture-tab active"'), "Default review input tab should be paste text");
  assert(html.includes('id="uploadCard" class="capture-card upload-flow"') && html.includes('id="textCard" class="capture-card active"'), "Default review input card should be paste text");
  assert(html.includes('inputMode: "text"') && html.includes('saved.inputMode || "text"') && html.includes('state.inputMode = "text";'), "Review input mode does not default/reset to paste text");
  assert(html.includes("function hasAsrConfig") && html.includes("转写服务暂未接入，请先粘贴已有转写文本"), "ASR unconfigured state lacks paste-text fallback");
  assert(html.includes("转写服务未配置") && html.includes("音频转写服务暂未接入，请先粘贴已有转写文本"), "Upload transcription controls do not explain missing ASR service");
  assert(html.includes("规则快速分析") && html.includes("不等同于真实大模型判断"), "Local analysis is not clearly labeled as rules-based");
  assert(html.includes("function normalizeModelUsedLabel") && html.includes('state.modelUsed = state.mode === "api" ? getModelName() : (isDeveloperMode() ? "本地模拟分析" : "规则快速分析")'), "History/result model labels can misrepresent local analysis");
  assert(html.includes("## 分析模式") && html.includes("## 内容类型") && html.includes("buildMinutesText(item.result, scenarioKey, item.modelUsed, item.contentType, item.recruiterSubtype)"), "Markdown export does not preserve analysis mode and content type");
  assert(html.includes("当前为本地体验，云端账号尚未配置") && html.includes("等待管理员配置"), "Unconfigured account state is not productized for local experience");
  assert(/async function shouldConfirmLongSourceBeforeGenerate[\s\S]*showConfirmDialog[\s\S]*生成可能更慢/.test(html), "Long source generation should use the product confirmation dialog");
  assert(/async function confirmReportExport[\s\S]*导出数据会下载当前账号可见的面试记录[\s\S]*showConfirmDialog/.test(html), "Sensitive export should use the product confirmation dialog");
  assert(html.includes("清空当前转写文本？") && html.includes("已取消清空，输入内容已保留"), "Clear-source confirmation is missing");
  assert(/async function regenerate[\s\S]*if \(hasResult\(\)\)[\s\S]*showConfirmDialog[\s\S]*覆盖当前\$\{isRecruiterContent\(\) \? "整理结果" : "复盘结果"\}/.test(html), "Regeneration should confirm before overwriting any existing result");
  // R10: the regenerate confirm must name the *active* report (content-aware), not
  // the hardcoded interview report — a recruiter "职业方向分析" must not be called
  // "AI 面试复盘报告" in its own overwrite dialog.
  assert(/async function regenerate[\s\S]*重新生成会覆盖当前页面展示的\$\{getActiveReportName\(\)\}/.test(html), "Regenerate confirm must use getActiveReportName() so recruiter reports are not mislabeled as 面试复盘报告");
  const directNativeConfirmLines = html.split("\n")
    .map((line, index) => ({ index: index + 1, line }))
    .filter(({ line }) => line.includes("confirm(") && !line.includes("window.confirm"));
  assert(directNativeConfirmLines.length === 0, `Native confirm() remains outside showConfirmDialog fallback: ${directNativeConfirmLines.map(item => item.index).join(", ")}`);
  assert(/clearLegacyAuthStateBtn[\s\S]*showConfirmDialog[\s\S]*清理旧账号状态/.test(html), "Legacy account cleanup must use the product confirmation dialog");
  assert(/async function clearCloudConfigFromForm[\s\S]*showConfirmDialog[\s\S]*清除腾讯云开发配置/.test(html), "CloudBase config clear must use the product confirmation dialog");
  assert(/async function confirmStopRecordingForSwitch[\s\S]*showConfirmDialog[\s\S]*停止当前录音转写/.test(html), "Recording interruption must use the product confirmation dialog");
  assert(/async function confirmAbortAudioTranscriptionForSwitch[\s\S]*showConfirmDialog[\s\S]*终止当前音频转写/.test(html), "Audio transcription interruption must use the product confirmation dialog");
  assert(html.includes("function clearHistorySearch") && html.includes('data-action="clear-history-search"') && html.includes("已清空历史搜索"), "History filtered empty state lacks a clear-search recovery action");
  assert(html.includes("function buildDeleteHistoryConfirmMessage") && html.includes("同步取消该轮次的复盘标记"), "History delete confirmation lacks consequence copy");
  assert(html.includes("function unlinkHistoryFromInterviewRound") && html.includes("已删除历史记录，并取消面试轮次复盘标记"), "Deleting history does not unlink interview round review markers");
  assert(html.includes('id="openAccountBtn" class="account-pill" type="button" aria-haspopup="menu" aria-expanded="false">本地体验</button>'), "Static first paint should not imply cloud login before config is known");
  assert(html.includes("当前仅本地保存，云端账号配置完成后才会启用登录和多设备同步"), "Static account modal copy overpromises sync");
  assert(html.includes("正在分析中...") && !html.includes("AI正在分析中") && !html.includes("AI 正在生成结果"), "Loading copy should not imply real AI when rules fallback may be used");
  assert(html.includes("使用规则分析") && html.includes("已切换为规则快速分析"), "Fallback action should be rules-based for ordinary users");
  assert(html.includes('id="loadingPanel" class="loading-panel hidden" role="status" aria-live="polite"'), "Loading panel lacks status semantics");
  assert(html.includes('id="errorPanel" class="error-panel hidden" role="alert"'), "Error panel lacks alert semantics");
  assert(html.includes("function handleGlobalKeydown") && html.includes('keyLower === "n"') && html.includes('keyLower === "k"'), "Global keyboard shortcuts are missing");
  assert(html.includes('setAttribute("aria-current", page === "manager" ? "page" : "false")'), "App nav aria-current state is missing");
  assert(html.includes('aria-haspopup="menu" aria-expanded="false"') && html.includes('setAttribute("aria-expanded", String(open))'), "Account menu expanded state is missing");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.queue-empty-state/.test(html), "Queue empty state dark-mode styling is missing");
  assert(/@media \(max-width: 1120px\)/.test(html), "Laptop/tablet header breakpoint is missing");
  assert(/@media \(max-width: 768px\)/.test(html), "Mobile breakpoint is missing");
  assert(/@media \(max-width: 560px\)/.test(html), "Small phone breakpoint is missing");
  assert(/showConfirmDialog\(\{[\s\S]*buildDeleteInterviewConfirmMessage\(record\)/.test(html), "Interview delete confirmation is missing");
  assert(html.includes("function validateInterviewRequiredFields"), "Interview form required-field validation helper is missing");
  assert(html.includes("interviewFormMessage") && html.includes("aria-invalid"), "Interview form validation lacks persistent inline feedback");
  assert(/function saveInterviewFromForm[\s\S]*validateInterviewRequiredFields\(record, \{ focus: true \}\)/.test(html), "Interview form save path does not enforce required-field validation");
  assert(/function saveInterviewFromForm[\s\S]*finally[\s\S]*els\.saveInterviewBtn\.disabled = false/.test(html), "Interview save button may stay disabled after validation or errors");
  assert(/function refreshAllCloudData[\s\S]*catch \(error\)[\s\S]*setSyncStatus\("error"/.test(html), "Cloud refresh failure is not recoverable");
  assert(/function importLocalDataToCloud[\s\S]*catch \(error\)[\s\S]*本地数据未删除/.test(html), "Local import failure does not reassure data preservation");
  assert(/async signOut\(\)[\s\S]*const wasAdmin = isAdminActive\(\)[\s\S]*if \(!wasAdmin\)/.test(html), "Admin sign-out may wipe shared model secrets");
  assert(html.includes("escapeHtml") && html.includes("escapeAttr"), "HTML escaping helpers are missing");

  // Guards added during the 2026-06-13 five-round test pass.
  assert(html.includes("文本模型：${escapeHtml(modelConfig.provider)") && html.includes("转写模型：${escapeHtml(asrProvider)"), "Model status must escape provider/asrProvider (XSS)");
  assert(html.includes("rawIndex != null && String(rawIndex).trim()"), "XLSX shared-string empty-index guard is missing");
  assert(html.includes("columnIndex > 16384"), "XLSX column-index bounds clamp is missing");
  const relLine = (html.match(/const relPattern = new RegExp\([^\n]*/) || [""])[0];
  assert(relLine.includes("Relationship") && !relLine.includes("\\\\\\\\b"), "XLSX relationship regex word boundary is broken (\\\\b)");
  assert(html.includes('test(String(sourceTime || ""))) return null'), "findSourceEvidence must reject empty/invalid sourceTime");
  assert(html.includes("fall through to structured fallback"), "parseModelJson fallback parse must be wrapped in try/catch");
  assert(/async function closeInterviewFormModal[\s\S]*showConfirmDialog[\s\S]*放弃修改并关闭/.test(html), "Interview-form unsaved guard must use the product confirm dialog");
  assert(/async function clearModelConfig[\s\S]*showConfirmDialog/.test(html), "clearModelConfig must use the product confirm dialog");
  assert(html.includes("looksLikeOtherField"), "Text-import heuristic must not assign labeled tokens to 整体进展");
  assert(html.includes("Number(raw.roundIndex ?? index + 1)"), "normalizeInterviewRound must preserve roundIndex 0 (use ??)");
  assert(html.includes("item.roundIndex == null"), "normalizeHistoryRecord must treat null/undefined roundIndex uniformly");
  assert(html.includes('.slice(0, 48)') && html.includes('.replace(/-+$/, "")'), "buildExportFileName must trim trailing hyphens");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.panel-head,\s*\.section-head \{\s*background: transparent;/.test(html), "Dark mode must flatten panel-head/section-head backgrounds");
  assert(/\.manager-filter-toolbar \{[\s\S]*?background: var\(--card-soft\);/.test(html), "Filter toolbar must use a themed (dark-aware) background");

  // Guards added during the 2026-06-14 five-round test pass.
  assert(html.includes("Array.from(row, cell => cell || \"\")"), "parseWorksheetXml must densify sparse rows via Array.from (row.map skips holes -> null cells)");
  assert(!/return row\.map\(cell => cell \|\| ""\);/.test(html), "parseWorksheetXml must not use row.map for densification (sparse XLSX columns become null)");
  assert(html.includes('} else if (value.trim() === "") {') && html.includes("a quote in the middle of an unquoted field is a literal"), "parseDelimitedText must treat mid-field quotes as literal so delimiters still split");
  assert(/match\(\/\(\\d\{1,3\}\(\?:\\\.\\d\+\)\?\)\\s\*%\//.test(html), "normalizePercentValue must capture the decimal part of percent strings");
  assert(html.includes("function mergeInterviewRecordData") && html.includes("interviewRecords[existingIndex] = mergeInterviewRecordData("), "Re-import must use field-level merge that preserves existing data");
  assert(html.includes('.replace(/[\\s的]*(?:HR|hr)\\s*$/, "")') && html.includes('.replace(/的\\s*$/, "")'), "sanitizeCompanyName must strip trailing HR/的 noise from inferred company names");
  assert(!/\.file-input\s*\{\s*width:\s*100%;/.test(html), "Hidden .file-input must not be forced to width:100% (caused mobile horizontal overflow)");

  // Content-type routing and recruiter conversation guards.
  assert(html.includes("const CONTENT_TYPES") && html.includes("recruiterConversation") && html.includes("猎头沟通整理"), "Content type model is missing recruiterConversation");
  [
    "opportunityRecommendation",
    "careerAnalysis",
    "profilePositioning",
    "interviewStrategy",
    "compensationNegotiation",
    "followUpCoordination",
    "mixed"
  ].forEach(subtype => assert(html.includes(subtype), `Recruiter subtype missing: ${subtype}`));
  assert(html.includes("function detectContentRouting") && html.includes("function detectRecruiterSubtype"), "Content routing classifier is missing");
  assert(html.includes("function refreshContentRoutingFromSource") && html.includes("contentRoutingManual"), "Manual content routing correction is missing");
  assert(html.includes("function simulateRecruiterGeneration") && html.includes("function buildRecruiterModelPrompt"), "Recruiter-specific generation path is missing");
  assert(html.includes("function renderRecruiterOverview") && html.includes("function renderRecruiterConclusions") && html.includes("function renderRecruiterRisks"), "Recruiter-specific report rendering is missing");
  assert(html.includes("本次没有明确推荐职位") && html.includes("不生成空的推荐职位卡"), "Recruiter report must avoid empty opportunity cards");
  assert(/function saveCurrentToHistory[\s\S]*const isInterviewReport = !isRecruiterContent\(\)[\s\S]*if \(isInterviewReport && item\.interviewId\)/.test(html), "Recruiter history must not default-link interview rounds");
  assert(/function unlinkHistoryFromInterviewRound[\s\S]*recruiterConversation[\s\S]*return false/.test(html), "Deleting recruiter history must not unlink interview round markers");
  assert(html.includes("buildRecruiterMinutesText") && html.includes("recruiterConversation / ${subtype}") && html.includes("可复制回复"), "Recruiter Markdown export is missing subtype-specific structure");
  assert(html.includes("已复制历史职业机会报告") && html.includes("已复制事实和分析观点"), "Recruiter copy paths are missing type-specific feedback");

  const domReadyIndex = html.indexOf('document.addEventListener("DOMContentLoaded"');
  const bindingStart = domReadyIndex >= 0 ? html.indexOf("[", domReadyIndex) : -1;
  const bindingEnd = bindingStart >= 0 ? html.indexOf("].forEach(id => els[id] = document.getElementById(id));", bindingStart) : -1;
  assert(bindingStart >= 0 && bindingEnd > bindingStart, "DOM id binding list is missing");
  if (bindingStart >= 0 && bindingEnd > bindingStart) {
    const bindingBlock = html.slice(bindingStart, bindingEnd);
    const boundIds = [...bindingBlock.matchAll(/"([^"]+)"/g)].map(match => match[1]);
    const missingBoundIds = boundIds.filter(id => !ids.includes(id));
    assert(missingBoundIds.length === 0, `Bound DOM ids missing from markup: ${missingBoundIds.join(", ")}`);
  }

  [
    "setAppPage",
    "renderMobilePageTabs",
    "normalizeInterviewRecord",
    "saveInterviewFromForm",
    "deleteInterviewRecord",
    "handleInterviewTextImport",
    "generate",
    "renderError",
    "saveCurrentToHistory",
    "renderHistory"
  ].forEach(name => assert(new RegExp(`function ${name}\\b`).test(html) || new RegExp(`async function ${name}\\b`).test(html), `Missing core function: ${name}`));

  [
    "els.openAccountBtn.addEventListener",
    "els.authPrimaryBtn.addEventListener",
    "els.interviewForm.addEventListener(\"submit\"",
    "els.generateBtn.addEventListener",
    "els.retryBtn.addEventListener",
    "els.saveModelBtn.addEventListener",
    "els.clearModelBtn.addEventListener",
    "els.mobilePageTabs.addEventListener"
  ].forEach(fragment => assert(html.includes(fragment), `Missing key interaction binding: ${fragment}`));

  assert(html.includes('classList.toggle("hidden", !isUnconfigured || !isDeveloperMode())'), "Developer config link can appear without admin mode");
  assert(html.includes("请先使用 admin / datou123 登录，进入开发者模式完成配置后再让普通用户登录"), "Unconfigured cloud login guidance is not admin-gated");
  assert(html.includes("els.accountDiagnosticPanel.innerHTML = \"\""), "Developer diagnostics are not cleared for non-admin users");

  // R8 fixes: dark-mode contrast, dialog naming, keyboard activation, import matching.
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.improvement-card\.high \{\s*background:/.test(html), "Dark mode must re-tint high-priority improvement cards (contrast)");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.count-badge \{\s*background:/.test(html), "Dark mode must re-tint result count badges (contrast)");
  assert(html.includes('aria-labelledby="modelModalTitle"') && html.includes('aria-labelledby="historyModalTitle"') && html.includes('aria-labelledby="sourceModalTitle"'), "Model/history/source dialogs must be aria-labelledby their titles");
  assert(html.includes('els.modelStatus.addEventListener("keydown"'), "modelStatus role=button must support Enter/Space keyboard activation");
  assert(html.includes("label.endsWith(alias)"), "findTextImportValue must use endsWith to avoid prose substring mis-assignment");
  assert(html.includes("function looksLikeDelimitedTable"), "Text-import table gate looksLikeDelimitedTable is missing");
  assert(html.includes("function enqueueCloudMutation") && html.includes("function finalizeCloudMutation"), "Serialized cloud mutation chain is missing");

  // R10: result hero stat tiles must stack number-over-label vertically. The old
  // horizontal (row-reverse) layout clipped the 3-char label (e.g. "通过率") under
  // overflow:hidden whenever the value was wide ("86%", "100%") in the narrow
  // 180–240px report sidebar, so part of the label was invisible to the user.
  assert(/\.stat-card \{[^}]*flex-direction: column-reverse;[^}]*\}/.test(html), "Result stat cards must stack vertically (column-reverse) so wide values do not clip the label");
  assert(!/\.stat-card \{[^}]*flex-direction: row-reverse;[^}]*\}/.test(html), "Result stat cards must not use the horizontal row-reverse layout that clipped the 通过率 label");

  // R10: the manager hero (.manager-headerline) hardcodes a near-white background
  // (rgba(255,255,255,0.82)); in dark mode its text turns light, so without a
  // dark-mode re-tint the title/subtitle were light-on-light and unreadable.
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*?\.history-card,\s*\.manager-headerline,\s*\.manager-stat,/.test(html), "Manager hero (.manager-headerline) must be re-tinted dark in dark mode (was light-on-light)");
  // R10: input-mode tabs, the paste-text example hint, trust-note callouts and the
  // reset button all hardcoded light fills; dark mode left them bright-white (and
  // the example hint light-on-light). Each needs a dark-mode re-tint.
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.capture-tab:not\(\.active\) \{\s*background: var\(--card-soft\)/.test(html), "Inactive capture tabs must be re-tinted dark in dark mode");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.text-empty-hint \{\s*background: var\(--card-soft\)/.test(html), "Paste-text example hint must be re-tinted dark in dark mode (was light-on-light)");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.trust-note\.local \{\s*background: var\(--card-soft\)/.test(html), "trust-note.local must be re-tinted dark in dark mode");

  // R10: a record id is globally unique. saveScopedLocalList must drop any stale
  // same-id copy left under a different userId (identity switch) instead of
  // appending a duplicate, and getScopedLocalList must dedupe by id on read.
  assert(/function saveScopedLocalList[\s\S]*scopedIds\.has\(item\.id\)\) return false/.test(html), "saveScopedLocalList must drop stale same-id rows from other scopes (was producing same-id duplicates)");
  assert(/function getScopedLocalList[\s\S]*seen\.has\(id\)\) return false/.test(html), "getScopedLocalList must dedupe records by id on read");

  // === Guards added during the 2026-06-22 ten-round test pass ===
  // R1 (import honesty): the import success line must report AI vs built-in field
  // matching based on whether the model ACTUALLY produced the records (usedAi),
  // never merely on whether an API key is configured. Claiming "已优先使用 AI 识别"
  // when the AI call failed or returned nothing violates the AGENTS.md honesty rule
  // (never label local field-matching as real AI) and contradicts the failure toast.
  assert(!/modelConfig\.apiKey \? "已优先使用 AI 识别。"/.test(html), "Import success must not claim AI based only on apiKey presence (must use usedAi)");
  assert(/function recognizeInterviewRecordsFromRows[\s\S]*?return \{ records: aiRecords, usedAi: true \}/.test(html), "recognizeInterviewRecordsFromRows must report usedAi:true only when the model returned records");
  assert(/function recognizeInterviewRecordsFromRows[\s\S]*?return \{ records: inferInterviewRecordsFromRows\(rows\), usedAi: false \}/.test(html), "recognizeInterviewRecordsFromRows must report usedAi:false on the local-matching fallback");
  assert(/async function importInterviewRecordsFromRows[\s\S]*?usedAi: recognized\.usedAi/.test(html), "importInterviewRecordsFromRows must thread usedAi up to the caller's status line");
  assert(html.includes('result.usedAi ? "已用 AI 识别。"'), "Import success status must label provenance off result.usedAi");
  assert(html.includes("AI 未识别成功，已用内置字段识别。"), "Import success must admit AI did not succeed when a key is set but usedAi is false");
  assert(html.includes("AI 未识别出记录，已使用本地字段匹配"), "Empty-AI-result fall-through must surface a toast (parity with the AI-failure catch branch)");
}

function runScriptSyntaxCheck() {
  getInlineScripts().forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      failures.push(`Inline script ${index + 1} syntax error: ${error.message}`);
    }
  });
}

function runContentRoutingFixtureChecks() {
  const script = getInlineScripts()[0] || "";
  const sandbox = `
    const window = { SpeechRecognition: null, webkitSpeechRecognition: null, crypto: { randomUUID: () => "fixture-id" }, location: { hostname: "127.0.0.1", protocol: "file:", search: "" }, SENLO_CONFIG: {} };
    const document = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; }, querySelector() { return null; }, body: { dataset: {} } };
    const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    const navigator = { clipboard: { writeText: async () => {} } };
  `;
  let detectContentRouting;
  try {
    ({ detectContentRouting } = new Function(`${sandbox}\n${script}\nreturn { detectContentRouting };`)());
  } catch (error) {
    failures.push(`Content routing fixture bootstrap failed: ${error.message}`);
    return;
  }
  const cases = [
    ["面试转写", "00:00 面试官：你为什么想做 AI 产品？\n00:35 候选人：我做过一个 AI 面试复盘工具。", "interview", "opportunityRecommendation"],
    ["职位推荐", "猎头说有个腾讯 AI 产品经理岗位，base 深圳，年包 80 万，问我是否推进。", "recruiterConversation", "opportunityRecommendation"],
    ["职业分析", "招聘顾问主要分析市场行情、行业趋势和我的职业定位，没有具体公司岗位。", "recruiterConversation", "careerAnalysis"],
    ["简历定位", "猎头建议我优化简历，突出项目经历、候选人卖点和对外包装话术。", "recruiterConversation", "profilePositioning"],
    ["面试策略", "HR 反馈下一轮面试可能会追问增长案例，需要准备回答策略和面试后跟进。", "recruiterConversation", "interviewStrategy"],
    ["薪资谈判", "猎头说 offer 职级和年包还有谈判空间，让我明确期望薪资和底线。", "recruiterConversation", "compensationNegotiation"],
    ["流程跟进", "招聘顾问约我下周补材料并确认面试时间，后续由 HR 推进流程。", "recruiterConversation", "followUpCoordination"],
    ["混合目的", "猎头推荐一个 AI 产品经理岗位，同时分析市场行情和我的职业方向是否适合。", "recruiterConversation", "mixed"]
  ];
  cases.forEach(([name, text, expectedContentType, expectedSubtype]) => {
    const actual = detectContentRouting(text);
    assert(actual.contentType === expectedContentType, `${name} content type expected ${expectedContentType}, got ${actual.contentType}`);
    assert(actual.recruiterSubtype === expectedSubtype, `${name} subtype expected ${expectedSubtype}, got ${actual.recruiterSubtype}`);
  });
  notes.push(`routing-fixtures=${cases.length}`);
}

function createMockInterviews() {
  const now = new Date("2026-05-21T10:00:00+08:00").toISOString();
  const longTitle = "资深 AI 产品经理 - " + "面试轮次与跨团队协同验证".repeat(12);
  return [
    {
      id: "normal_1",
      company: "云际协同科技",
      role: "AI 产品经理",
      baseLocation: "上海",
      overallProgress: "推进中",
      contactWechat: "hr_senlo_01",
      jd: "负责 AI 工作台的信息架构、面试评估和协同流程。",
      rounds: [{ name: "一面", time: "2026-05-22 15:00", method: "腾讯会议", result: "待面试" }],
      updatedAt: now
    },
    {
      id: "edge_long",
      company: longTitle,
      role: "Principal Product Manager / AI Collaboration Platform / 多端体验负责人",
      baseLocation: "北京 / Remote / 深圳",
      overallProgress: "待安排",
      contactWechat: " PM_2026-复杂字符_#%& ",
      jd: "<script>alert(1)</script> 中英文混合 emoji ✅ 🚀 very-long-description ".repeat(30),
      rounds: [{ name: "HR", time: "2099-12-31 23:59", method: "线下 + Zoom + 电话", result: "未定" }],
      updatedAt: now
    },
    {
      id: "duplicate_1",
      company: "云际协同科技",
      role: "AI 产品经理",
      baseLocation: "",
      overallProgress: "异常状态值",
      contactWechat: null,
      jd: undefined,
      rounds: [],
      updatedAt: ""
    },
    {},
    ...Array.from({ length: 196 }, (_, index) => ({
      id: `mass_${index + 1}`,
      company: `批量测试公司 ${String(index + 1).padStart(2, "0")}`,
      role: index % 3 === 0 ? "AI 复盘体验设计师" : "协同办公产品经理",
      baseLocation: ["上海", "北京", "杭州", "远程"][index % 4],
      overallProgress: ["推进中", "待安排", "已结束", "暂缓"][index % 4],
      contactWechat: `contact_${index + 1}`,
      jd: index % 5 === 0 ? "短 JD" : "负责面试协同、转写、复盘和状态流转。".repeat((index % 4) + 1),
      rounds: [{ name: "一面", time: `2026-06-${String((index % 28) + 1).padStart(2, "0")} 10:00`, method: "线上", result: "待面试" }],
      updatedAt: now
    }))
  ];
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function runMockDataChecks() {
  const records = createMockInterviews();
  assert(records.length >= 200, "Massive mock interview list is too small");

  const normalized = records.map((record, index) => ({
    id: normalizeText(record.id) || `fallback_${index}`,
    company: normalizeText(record.company) || "未填写公司",
    role: normalizeText(record.role) || "未填写岗位",
    status: normalizeText(record.overallProgress) || "待补充",
    searchable: [record.company, record.role, record.baseLocation, record.jd].map(normalizeText).join(" ")
  }));

  assert(normalized.every(item => item.id && item.company && item.role), "Mock normalization failed on incomplete records");
  assert(normalized.some(item => item.searchable.includes("<script>")), "Special-character mock record was not included");
  assert(normalized.filter(item => item.company === "云际协同科技").length >= 2, "Duplicate-name mock records are missing");

  let working = normalized.slice(0, 24);
  for (let index = 0; index < 12; index += 1) {
    working = [{ id: `created_fast_${index}`, company: "连续创建测试", role: `产品负责人 ${index}`, status: "推进中", searchable: "连续创建测试 产品负责人" }, ...working];
  }
  working = working.map(item => item.id === "created_fast_0" ? { ...item, role: "创建后立即编辑" } : item);
  working = working.map(item => item.id === "created_fast_1" ? { ...item, status: "编辑后待删除" } : item);
  working = working.filter(item => item.id !== "created_fast_1" && item.id !== "duplicate_1");
  const searchResult = working.filter(item => item.searchable.includes("AI") || item.role.includes("AI"));
  const emptySearchResult = working.filter(item => item.searchable.includes("不存在的候选人字段"));
  const statusFiltered = working.filter(item => item.status === "推进中");
  const sortedByPseudoTime = records
    .filter(record => record.rounds?.[0]?.time)
    .map(record => ({ id: record.id, time: Date.parse(record.rounds[0].time.replace(" ", "T")) }))
    .filter(item => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);
  assert(new Set(working.map(item => item.id)).size === working.length, "Rapid create/delete simulation produced duplicate ids");
  assert(working.some(item => item.role === "创建后立即编辑"), "Create-then-edit simulated flow failed");
  assert(!working.some(item => item.id === "created_fast_1" || item.id === "duplicate_1"), "Delete simulated flow failed");
  assert(searchResult.length > 0, "Search simulated flow has no result");
  assert(emptySearchResult.length === 0, "Empty search simulated flow failed");
  assert(statusFiltered.length > 0, "Status filter simulated flow has no result");
  assert(sortedByPseudoTime.length >= 180 && sortedByPseudoTime[0].time <= sortedByPseudoTime.at(-1).time, "Large-list time sorting simulation failed");

  notes.push(`mock-records=${records.length}`);
}

function runAssetChecks() {
  const assetRefs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(value => !value.startsWith("http") && !value.startsWith("#") && !value.startsWith("data:"));
  assetRefs.forEach(ref => {
    if (ref === "assets/env.js") return;
    const cleanRef = ref.split("?")[0];
    assert(Boolean(extname(cleanRef)), `Suspicious asset reference: ${ref}`);
  });
}

runStaticChecks();
runScriptSyntaxCheck();
runContentRoutingFixtureChecks();
runMockDataChecks();
runAssetChecks();

if (failures.length) {
  console.error("Senlo smoke check failed:");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Senlo smoke check passed.");
notes.forEach(note => console.log(note));
