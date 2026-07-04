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
  assert(html.includes("columnIndex >= 16384"), "XLSX column-index bounds clamp is missing or off-by-one (XFD=16383 is the max valid column; >=16384 rejects XFE)");
  const relLine = (html.match(/const relPattern = new RegExp\([^\n]*/) || [""])[0];
  assert(relLine.includes("Relationship") && !relLine.includes("\\\\\\\\b"), "XLSX relationship regex word boundary is broken (\\\\b)");
  assert(html.includes('test(String(sourceTime || ""))) return null'), "findSourceEvidence must reject empty/invalid sourceTime");
  assert(html.includes("fall through to structured fallback"), "parseModelJson fallback parse must be wrapped in try/catch");
  assert(/async function closeInterviewFormModal[\s\S]*showConfirmDialog[\s\S]*放弃修改并关闭/.test(html), "Interview-form unsaved guard must use the product confirm dialog");
  assert(/async function clearModelConfig[\s\S]*showConfirmDialog/.test(html), "clearModelConfig must use the product confirm dialog");
  assert(html.includes("isLabeledOtherField"), "Text-import heuristic must gate base地点/联系人微信名/整体进展 with a labeled-field check (isLabeledOtherField)");
  assert(html.includes("Number(raw.roundIndex ?? index + 1)"), "normalizeInterviewRound must preserve roundIndex 0 (use ??)");
  assert(html.includes("item.roundIndex == null"), "normalizeHistoryRecord must treat null/undefined roundIndex uniformly");
  assert(html.includes('.slice(0, 48)') && html.includes('.replace(/-+$/, "")'), "buildExportFileName must trim trailing hyphens");
  assert(/@media \(prefers-color-scheme: dark\)[\s\S]*\.panel-head,\s*\.section-head \{\s*background: transparent;/.test(html), "Dark mode must flatten panel-head/section-head backgrounds");
  assert(/\.manager-filter-toolbar \{[\s\S]*?background: var\(--card-soft\);/.test(html), "Filter toolbar must use a themed (dark-aware) background");

  // Guards added during the 2026-06-14 five-round test pass.
  assert(/Array\.from\(\{ length: Math\.min\(maxCol \+ 1, 1024\) \}/.test(html), "parseWorksheetXml must cap densified row width (Math.min(maxCol+1,1024)) so a crafted far-right-cell sheet cannot materialize a 16384-wide row (DoS), while still filling sparse holes");
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

  // === R10 part-1 (cross-feature integration + keyboard/modal safety) guards ===
  assert(html.includes("function isAnyModalOpen"), "isAnyModalOpen modal-state helper is missing");
  assert(/keyLower === "n" && state\.appPage === "manager" && !isAnyModalOpen\(\)/.test(html), "global 'n' new-interview shortcut must be gated by !isAnyModalOpen() (else it wipes an open unsaved form)");
  assert(/if \(commandKey && keyLower === "k"\) \{[\s\S]{0,220}?if \(isAnyModalOpen\(\)\) return;/.test(html), "Cmd/Ctrl+K must bail out when a modal is open (no focus escape to the obscured search box)");
  assert(/function setContentRouting\([^)]*\)\s*\{\s*if \(state\.isLoading\)/.test(html) && /function setContentRouting[\s\S]*?if \(state\.isLoading\)[\s\S]*?renderContentRouting\(\);\s*return;/.test(html), "setContentRouting must early-return while generating (state.isLoading) so a mid-flight switch can't mislabel+autosave the report");
  assert(/redetectContentBtn\.addEventListener\("click"[\s\S]{0,90}state\.isLoading/.test(html), "重新识别 must be ignored while generating");
  assert(/managerState\.status === "upcoming" && Boolean\(getFutureInterview/.test(html) && /managerState\.status === "needs-update" && Boolean\(getOverdueInterview/.test(html), "quick-filter chips must filter by the same predicate their badge count uses (no chip-count vs list drift)");
  assert(html.includes("如需保留当前版本，请先复制或导出 Markdown") && !html.includes("可以从历史记录中找回"), "regenerate confirm must not falsely promise the result is recoverable from history (regenerate overwrites the same entry)");
  assert(/function deleteInterviewRecord[\s\S]*?state\.linkedInterviewId === id[\s\S]*?state\.linkedInterviewId = "";/.test(html), "deleting the linked interview must clear state.linkedInterviewId (no ghost review context bar)");
  assert(/function startReviewFromInterview[\s\S]*state\.linkedInterviewId === id && hasRealInput\(\)/.test(html), "re-clicking 去复盘 on the linked record with unsaved input must preserve it, not overwrite with the record template");

  // === R10 part-2 (modal a11y: focus trap + focus restore) guards ===
  assert(html.includes("function getTopOpenModal"), "getTopOpenModal helper (focus-trap target) is missing");
  assert(/if \(key === "Tab"\)[\s\S]{0,500}getTopOpenModal\(\)/.test(html), "modal focus trap (Tab containment inside the top open modal) is missing");
  assert(/function settleConfirmDialog[\s\S]*?const restoreTarget = confirmDialogLastFocus;/.test(html), "settleConfirmDialog must capture the focus-restore target locally before nulling the field");
  assert(/function settleConfirmDialog[\s\S]*?restoreTarget && restoreTarget\.isConnected/.test(html), "confirm-dialog focus restore must validate the target is still connected/visible (no focus loss to <body>)");
  assert(/body\.modal-open\s*\{\s*overflow:\s*hidden/.test(html), "body scroll-lock (body.modal-open { overflow: hidden }) is missing");
  assert(/new MutationObserver[\s\S]{0,220}classList\.toggle\("modal-open"/.test(html), "modal scroll-lock observer (toggles body.modal-open on any modal open/close) is missing");

  // === R2 fleet deep-sweep guards (data-loss in the save path) ===
  assert(/function fillInterviewForm[\s\S]*?interviewIntentionInput[\s\S]*?data-custom='1'/.test(html), "intention <select> must preserve a non-preset imported value via an injected option (else it is silently wiped on edit-save)");
  assert(/function saveInterviewRecords\(\)\s*\{[\s\S]*?return ok;/.test(html), "saveInterviewRecords must return its ok flag so callers can detect a failed persist");
  assert(/function saveInterviewFromForm[\s\S]*?if \(!saveInterviewRecords\(\)\)[\s\S]*?interviewRecords = previousRecords;[\s\S]*?return;/.test(html), "saveInterviewFromForm must roll back + bail (no success toast / modal close) when the save fails");

  // === R2 fleet deep-sweep guards, part 2 ===
  // [2] An in-flight save (esp. async company inference) must not be dismissable by
  // Escape/overlay/close, and must clear the busy flag in finally.
  assert(/async function saveInterviewFromForm[\s\S]*?managerState\.savingInterview = true[\s\S]*?finally[\s\S]*?managerState\.savingInterview = false/.test(html), "saveInterviewFromForm must set/clear a savingInterview busy flag (set in try, cleared in finally)");
  assert(/function closeInterviewFormModal[\s\S]*?!options\.force && managerState\.savingInterview\) return false/.test(html), "closeInterviewFormModal must refuse non-forced close while a save is in flight");
  // [3] A terminally-failed pipeline must expose no upcoming/overdue active round.
  assert(/function hasFailedRound[\s\S]*?result === "failed"/.test(html), "hasFailedRound helper must detect a failed round");
  assert(/function getFutureInterview[\s\S]*?if \(hasFailedRound\(record\)\) return null;/.test(html), "getFutureInterview must return null for a failed pipeline");
  assert(/function getOverdueInterview[\s\S]*?if \(hasFailedRound\(record\)\) return null;/.test(html), "getOverdueInterview must return null for a failed pipeline");
  // [4] transcript/summary/uploadedFile saves must gate cloud sync on a successful
  // local write (return null otherwise) so a failed persist can't queue a sync or
  // leave a dangling history reference.
  assert(/const ok = saveScopedLocalList\(TRANSCRIPTS_KEY[\s\S]{0,200}if \(!ok\)[\s\S]{0,140}return null;[\s\S]{0,80}queueCloudSync\("transcripts"/.test(html), "transcriptService.save must gate queueCloudSync on a successful local write");
  assert(/const ok = saveScopedLocalList\(SUMMARY_REPORTS_KEY[\s\S]{0,200}if \(!ok\)[\s\S]{0,140}return null;[\s\S]{0,80}queueCloudSync\("summaries"/.test(html), "summaryService.save must gate queueCloudSync on a successful local write");
  assert(/const ok = saveScopedLocalList\(UPLOADED_FILES_KEY[\s\S]{0,200}if \(!ok\)[\s\S]{0,140}return null;[\s\S]{0,80}queueCloudSync\("uploadedFiles"/.test(html), "uploadedFileService.save must gate queueCloudSync on a successful local write");
  assert(/const savedTranscript = transcriptService\.save[\s\S]*?const savedSummary = summaryService\.save[\s\S]*?if \(!savedTranscript \|\| !savedSummary\)[\s\S]*?return false;/.test(html), "saveCurrentToHistory must abort before writing history when transcript/summary persist fails");
  // [5] 待安排 stat card must use the same predicate (needsInterviewTime) as the
  // 待补时间 chip, and not double-count the record under 推进中.
  assert(/includes\(progress\.key\) && !needsInterviewTime\(record\)\) acc\.active \+= 1;/.test(html), "推进中 stat card must exclude records still needing a time (needsInterviewTime)");
  assert(/if \(needsInterviewTime\(record\)\) acc\.unscheduled \+= 1;/.test(html), "待安排 stat card must count via needsInterviewTime (same predicate as the 待补时间 chip)");
  assert(!/progress\.key === "unscheduled"\) acc\.unscheduled \+= 1;/.test(html), "待安排 stat card must NOT use the narrow progress.key predicate that diverges from the chip count");
  // [6] The in-progress draft must be scoped per identity so a login/switch can't
  // clobber another identity's draft.
  assert(/function getDraftStateKey[\s\S]*?\$\{STATE_KEY\}:\$\{getCurrentUserId\(\)\}/.test(html), "getDraftStateKey must scope the draft slot per identity");
  assert(/function saveState\(\)[\s\S]*?setJson\(getDraftStateKey\(\)/.test(html), "saveState must persist the draft under the per-identity key");
  assert(/key\.startsWith\(`\$\{STATE_KEY\}:`\)\) return false/.test(html), "legacy-account purge must protect per-identity draft slots from removal");
  // [7] Search copy must disclose JD + round notes are matched (placeholder + empty state).
  assert(/interviewSearchInput[\s\S]{0,140}placeholder="[^"]*JD[^"]*备注/.test(html), "search placeholder must disclose JD and 备注 are searched (matches actual behavior)");

  // === R3 fleet deep-sweep guards (AI review core) ===
  // [0] routing: a multi-speaker dialog requires RECURRING speakers, so a single-author
  // labeled note (公司：/年包：) can't masquerade as a fake transcript.
  assert(/recurringSpeakers\s*>=\s*2\s*&&\s*segments\.length\s*>=\s*3/.test(html), "routing multi-speaker detection must require >=2 recurring speakers");
  // [1] API-mode generate adopts the model's content type/subtype unless routing is pinned.
  assert(/result = await callConfiguredModel\(state\.source\);[\s\S]{0,600}if \(!state\.contentRoutingManual\)[\s\S]{0,300}state\.recruiterSubtype = modelType === "recruiterConversation"/.test(html), "API-mode generate must adopt the model's returned content type/subtype (not clobber it) when routing is auto");
  // [2] Trust note / analysis label must not claim real-model output for a rules result.
  assert(/function resultIsModelGenerated/.test(html), "resultIsModelGenerated helper must gate real-model claims on what actually produced the result");
  assert(/!state\.lastApiFailed && resultIsModelGenerated\(\)\)[\s\S]{0,90}当前由 \$\{getModelName\(\)\}/.test(html), "trust note's '当前由 <模型> 生成' must be gated on resultIsModelGenerated()");
  // [3] generate() must confirm-stop in-flight recording/transcription before generating.
  assert(/async function generate\(\)[\s\S]{0,400}if \(isRecording\)[\s\S]{0,200}confirmStopRecordingForSwitch[\s\S]{0,200}if \(isAudioTranscribing\)[\s\S]{0,200}confirmAbortAudioTranscriptionForSwitch[\s\S]{0,200}persistVisibleSource/.test(html), "generate() must confirm-stop any in-flight recording/transcription before generating");
  // [6] Source-evidence must resolve by carried segment index, not just first time match.
  assert(/function findSourceEvidence\(sourceTime, sourceIndex[\s\S]{0,500}segment\.index === sourceIndex && segment\.time === sourceTime/.test(html), "findSourceEvidence must prefer the card's carried sourceIndex over the first time match");
  assert(/function normalizeQaCard[\s\S]{0,900}sourceIndex:/.test(html), "QA cards must carry a sourceIndex for source-evidence disambiguation");
  // [7] Speaker detection must reject year/annotation tokens as speaker names.
  assert(/isAnnotationLabel = speakerMatch/.test(html), "transcript speaker detection must reject year/annotation tokens (备注：/2021年：)");
  // [9] Live-recording onresult must skip per-chunk routing and debounce the heavy render.
  assert(/speechRecognition\.onresult[\s\S]{0,700}skipRouting: true[\s\S]{0,300}recordRenderTimer = setTimeout/.test(html), "live-recording onresult must skip per-chunk routing detection and debounce the full re-render");

  // === R4 fleet deep-sweep guards (generation engine) ===
  // [4] Anthropic must send the direct-browser-access header or it CORS-fails in a static app.
  assert(html.includes("anthropic-dangerous-direct-browser-access"), "Anthropic adapter must send the direct-browser-access header so the provider works from the browser");
  // [9-model] parseModelJson must require a plain object (reject bare primitive/array).
  assert(/function parseModelJson[\s\S]{0,800}typeof parsed === "object" && !Array\.isArray\(parsed\)/.test(html), "parseModelJson must require a plain object and fall through to the structured fallback otherwise");
  // [14] Adapters must surface an in-body {error} even on HTTP 200.
  assert(countMatches(/if \(data\.error\?\.message\) throw new Error\(data\.error\.message\);/g) >= 3, "all three model adapters must surface a 200-with-error body");
  // [10] Loading ticker must be mode-aware (model-waiting copy in API mode, not local stages).
  assert(/function startLoadingTicker[\s\S]{0,450}state\.mode === "api"[\s\S]{0,200}等待返回/.test(html), "loading ticker must show model-waiting copy in API mode instead of local rule-engine stage labels");
  // [8] Fractional probability/score is rescaled, not collapsed to 1%.
  assert(/direct > 0 && direct < 1 \? direct \* 100 : direct/.test(html), "normalizePercentValue must rescale only an open (0,1) fraction (integer 1 stays 1%)");
  // [2] Recruiter facts reject placeholder/negation prose as a concrete company/role.
  assert(/function isPlaceholderFact/.test(html), "inferRecruiterFacts must drop placeholder/negation values via isPlaceholderFact");
  // [6] One shared opportunity gate (company AND role) for sim + renderer.
  assert(/function hasConcreteOpportunityFacts/.test(html) && /const hasConcreteOpportunity = hasConcreteOpportunityFacts\(facts\)/.test(html), "simulateRecruiterGeneration must use the shared AND opportunity gate");
  // [12] Recruiter string fields flatten nested objects (no [object Object]).
  assert(/function coerceText/.test(html) && /coreConclusion: coerceText\(/.test(html), "recruiter report string fields must flatten nested objects via coerceText");

  // === R5 fleet deep-sweep guards (result rendering / stats / honesty) ===
  // [0] Stored records use a pure label helper that can't emit 真实大模型 for empty modelUsed.
  assert(/function normalizeStoredModelLabel/.test(html), "normalizeStoredModelLabel must exist for stored-record engine labels");
  assert(/const modelUsedLabel = normalizeStoredModelLabel\(item\.modelUsed\)/.test(html), "history card must label the stored item via normalizeStoredModelLabel, not live state");
  assert(!/normalizeModelUsedLabel\(modelUsed\)/.test(html), "buildMinutes* must not flow a stored modelUsed through the live-state normalizeModelUsedLabel");
  // [4] Recruiter 待确认 stat-card scroll target points at the section that holds questions.
  assert(/recruiterPassCard\)\s*recruiterPassCard\.dataset\.target = "tasksSection"/.test(html), "recruiter 待确认 stat-card must scroll to tasksSection");
  assert(/interviewPassCard\)\s*interviewPassCard\.dataset\.target = "summarySection"/.test(html), "interview 通过率 stat-card must reset its scroll target to summarySection");
  // [5]/[6] QA score must not collapse a legitimate 0 to 78 via a truthy-OR fallback.
  assert(!/String\(card\.score \|\| 78\)/.test(html), "QA score display must not collapse 0 to 78 via || fallback");

  // === R6 fleet deep-sweep guards (account / cloud / security) ===
  // [0] Cloud history mappers carry the manual-routing override + audio link.
  assert(/content_routing_manual: Boolean\(record\.contentRoutingManual\)/.test(html) && /audio_file_id: record\.audioFileId/.test(html), "toCloudHistory must persist contentRoutingManual + audioFileId");
  assert(/contentRoutingManual: row\.content_routing_manual/.test(html) && /audioFileId: row\.audio_file_id/.test(html), "fromCloudHistory must read contentRoutingManual + audioFileId back");
  // [1] Non-JSON account values in the diagnostics snapshot are always masked.
  assert(/snapshot\[key\] = maskSensitiveValue\(String\(raw \|\| ""\)\.slice\(0, 240\)\)/.test(html), "getAccountStorageSnapshot must always mask a non-JSON account value (no raw token dump)");
  // [2] A post-auth cloud-load failure must not be shown as a login error / leave modal open.
  assert(/catch \(error\)[\s\S]{0,550}if \(isCloudActive\(\)\)[\s\S]{0,160}closeAccountModal\(\)/.test(html), "handleAuthSubmit must close the modal + treat an established session as logged-in even if the initial cloud load failed");
  // [3] Enter submits the auth form (inputs are not in a <form>).
  assert(/accountPasswordInput[\s\S]{0,300}keydown[\s\S]{0,200}handleAuthSubmit/.test(html), "auth inputs must submit on Enter");
  // [4] Redaction regex covers the access-key aliases.
  assert(/client\[-_\]\?id\|publishable\[-_\]\?key/.test(html), "redactSensitiveValue must cover clientId/publishableKey aliases");
  // [5] Non-string sensitive diagnostic values are fully redacted.
  assert(/typeof entry === "string" && entry\) \? maskSensitiveValue\(entry\) : "\[redacted\]"/.test(html), "sanitizeDiagnosticValue must fully redact non-string sensitive values");
  // [6] Restored/forged demo-admin session is inert off local-debug origins.
  assert(/authState\.user\?\.authMode === "admin" && isDevCloudConfigAllowed\(\)/.test(html), "isAdminActive must re-check isDevCloudConfigAllowed so a restored/forged admin session is inert in prod");

  // === R7 fleet deep-sweep guards (model/ASR config + audio/recording) ===
  // [0] customModel reconciliation on save + defensive clear on sync.
  assert(/customModel: resolveCustomModel\(els\.customModelInput\.value, els\.modelSelect\.value\)/.test(html), "saveModelFromForm must drop a customModel that just echoes the dropdown pick");
  assert(/customModel: row\.text_model_id \? "" : modelConfig\.customModel/.test(html), "mergeCloudModelSettings must clear a stale local customModel when the cloud provides a model id");
  // [5] Numeric model params are clamped (no raw Number(... || default)).
  assert(/function clampModelNumber/.test(html) && !/Number\(els\.timeoutInput\.value \|\| 30000\)/.test(html), "model numeric params must be clamped, not raw Number(... || default)");
  // [1] ASR connection test inspects an in-body error even on HTTP 200.
  assert(/async function requestAsrConnectionTest[\s\S]{0,1000}data\.error\?\.message/.test(html), "requestAsrConnectionTest must surface a 200-with-error body instead of reporting 连接成功");
  // [2] Both key inputs opt out of password-manager / autofill save (device-local keys).
  ["apiKeyInput", "asrApiKeyInput"].forEach(id => {
    const tag = (html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`)) || [""])[0];
    assert(/autocomplete="off"/.test(tag) && /data-1p-ignore/.test(tag), `${id} must opt out of browser/password-manager credential save`);
  });
  // [3] Audio preview registers a decode-error handler.
  assert(/els\.audioPreview\.addEventListener\("error"/.test(html), "audio preview must handle a decode/load error (not freeze at 读取时长中)");
  assert(/audioPreviewError \|\| isAudioTranscribing/.test(html), "transcribe button must be disabled when the audio file failed to decode");
  // [4]/[10] Recording onerror special-cases benign no-speech and maps real errors honestly.
  assert(/speechRecognition\.onerror[\s\S]{0,200}no-speech/.test(html) && /"audio-capture":/.test(html), "recording onerror must special-case no-speech and map audio-capture to honest copy");
  // [7] Oversize-audio warning threshold exists.
  assert(/MAX_ASR_BYTES/.test(html) && /file\.size > MAX_ASR_BYTES/.test(html), "handleAudioFile must warn on an oversize audio file");
  // [8] Transcript field is coerced before .trim() (no crash on array/number).
  assert(!/data\.text \|\| data\.transcript \|\| data\.result\?\.text \|\| ""/.test(html), "transcript extraction must coerce a non-string field before trim");
  // [6] isAsrProbeReachable no longer excludes on the bare word 'model'.
  assert(!/permission\|model\|not found/.test(html), "isAsrProbeReachable must not exclude on the bare word 'model'");

  // === R8 fleet deep-sweep guards (history / export / fidelity) ===
  // [0] Dedup-evicted history records are also cloud-deleted (no resurrection on sync).
  assert(/function saveCurrentToHistory[\s\S]*isDuplicateOf[\s\S]*queueCloudDelete\("history_records"/.test(html), "saveCurrentToHistory must cloud-delete same-source dedup-evicted records");
  // [1] Search inputs store the raw value and only sync when not focused (don't eat spaces).
  assert(/historyState\.search = els\.historySearchInput\.value;/.test(html), "history search must store the raw value (no mid-typing trim)");
  assert(/document\.activeElement !== els\.historySearchInput/.test(html) && /document\.activeElement !== els\.interviewSearchInput/.test(html), "search inputs must not be rewritten while focused");
  // [2]/[3] Recruiter fact + key-value map values flatten nested objects.
  assert(/coerceText\(item\.value \?\? item\.detail/.test(html), "normalizeRecruiterFacts must flatten nested fact values via coerceText");
  assert(/Object\.entries\(value\)\.map\(\(\[key, item\]\) => \[key, coerceText\(item\)\]\)/.test(html), "normalizeKeyValueMap must flatten nested values via coerceText");
  // [4] copyText branches on the execCommand result (no false success toast).
  assert(/ok = document\.execCommand\("copy"\)/.test(html), "copyText must check the execCommand return before claiming success");
  assert(/ok = document\.execCommand\("copy"\);?\s*\}\s*finally\s*\{\s*temp\.remove\(\)/.test(html), "copyText fallback must remove the temp textarea in a finally block");
  // [5] Export filename strips control/bidi via codepoint filter.
  assert(/code > 31 && code !== 127 && !\(code >= 0x200b && code <= 0x206f\)/.test(html), "buildExportFileName must strip control/bidi characters");
  // [6] The JSON export no longer advertises a non-existent restore version.
  assert(!/app: "Senlo",\s*version: 1/.test(html), "exportAllUserData must not imply a restore format (version:1) with no import path");

  // === R9 fleet deep-sweep guards (security: markdown injection, tamper, key-leak) ===
  // [0] Markdown export neutralizes model/transcript-derived text.
  assert(/function escapeMarkdownText/.test(html), "escapeMarkdownText helper must exist for exported Markdown");
  assert(/escapeMarkdownText\(card\.answer\)/.test(html) && /escapeMarkdownText\(report\.coreConclusion\)/.test(html), "Markdown builders must run model/transcript values through escapeMarkdownText");
  // [1] Tampered nested-object string fields are coerced, not stringified to [object Object].
  assert(/company: coerceText\(record\.company/.test(html), "normalizeInterviewRecord must coerce string fields (no [object Object])");
  assert(/next\[mode\] = coerceText\(sourceByMode\[mode\]\)/.test(html), "normalizeSourceByMode must coerce values");
  // [2] Diagnostics snapshot masks a top-level JSON string/array token.
  assert(/typeof parsed === "string"\) snapshot\[key\] = maskSensitiveValue\(parsed\)/.test(html), "getAccountStorageSnapshot must mask a top-level JSON string token");
  // [3] Redaction covers serviceRole/service_role.
  assert(/service\[-_\]\?role/.test(html), "redactSensitiveValue must cover serviceRole/service_role");

  // === R10 fleet deep-sweep guards (cross-feature / coverage audit) ===
  // [0]/[2] Switching 去复盘 to a different record confirms before discarding unsaved work.
  assert(/async function startReviewFromInterview[\s\S]*state\.linkedInterviewId !== id[\s\S]{0,800}showConfirmDialog/.test(html), "startReviewFromInterview must confirm before overwriting unsaved input/result when switching records");
  // [4] ...and confirm-stops in-flight recording/transcription.
  assert(/async function startReviewFromInterview[\s\S]*confirmStopRecordingForSwitch[\s\S]{0,400}confirmAbortAudioTranscriptionForSwitch/.test(html), "startReviewFromInterview must confirm-stop in-flight recording/transcription");
  // [1] Re-saving a restored rules report must not fabricate a real-model attribution.
  assert(!/modelUsed: state\.modelUsed \|\| getModelName\(\)/.test(html), "saveCurrentToHistory must not relabel an empty modelUsed with the live model name");
  assert(/modelUsed: normalizeModelUsedLabel\(state\.modelUsed\)/.test(html) && /model_id: normalizeStoredModelLabel\(item\.modelUsed\)/.test(html), "save + cloud paths must use honest engine labels");
  // [3] getFactValue excludes placeholder values.
  assert(/value !== "待确认" && !isPlaceholderFact\(value\)/.test(html), "getFactValue must exclude placeholder/negation values");
  // [5] Failed local import resets the sync pill out of 'syncing'.
  assert(/function importLocalDataToCloud[\s\S]*catch \(error\)[\s\S]{0,400}setSyncStatus\("error"/.test(html), "importLocalDataToCloud catch must reset sync status (no stuck syncing spinner)");
  // [6]/[7] Modals manage focus on open/close.
  assert(/function openModalWithFocus/.test(html) && /function restoreModalFocus/.test(html), "modal open/close focus helpers must exist");
  assert(/function openHistoryModal[\s\S]{0,80}openModalWithFocus/.test(html) && /function closeHistoryModal[\s\S]{0,60}restoreModalFocus/.test(html), "history modal must focus on open and restore on close");
  assert(/!isCloudActive\(\) && !els\.accountEmailInput\?\.disabled\) \? els\.accountEmailInput/.test(html), "account modal must focus the email field when signed out");
  // [8] normalizeStringList flattens a non-array object.
  assert(/typeof items === "object" \? Object\.values\(items\)/.test(html), "normalizeStringList must use Object.values for a non-array object");
  // [9] mergeRecruiterCoreFacts treats placeholders as non-real when merging.
  assert(/const isReal = v => Boolean\(v && v !== "未提及" && v !== "待确认" && !isPlaceholderFact\(v\)\)/.test(html), "mergeRecruiterCoreFacts must not concatenate placeholder values");
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
    const window = { SpeechRecognition: null, webkitSpeechRecognition: null, crypto: { randomUUID: () => "fixture-id" }, location: { hostname: "127.0.0.1", protocol: "file:", search: "" }, SENLO_CONFIG: {}, addEventListener() {} };
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

function runPageShellChecks() {
  assert(/<meta name="description"/.test(html), "meta description is missing");
  assert(/<link rel="icon"[^>]*senlo-favicon-64\.png/.test(html), "optimized 64px favicon link is missing");
  assert(/<link rel="apple-touch-icon"[^>]*senlo-touch-180\.png/.test(html), "apple-touch-icon link is missing");
  assert(!/<img[^>]*src="assets\/senlo-logo\.png"/.test(html), "header logo must use the optimized small variant, not the 234KB original");
  assert(/<noscript>/.test(html), "noscript fallback is missing");
  assert(/host === "\[::1\]"/.test(html), "IPv6 bracketed loopback host must be recognized as local-debug origin");
  assert(/catch \(error\) \{[\s\S]{0,260}clearInterval\(timer\);[\s\S]{0,600}模型调用失败，正在使用规则快速分析/.test(html), "generate() catch must stop the API loading ticker before the rules fallback");
  assert(/window\.SENLO_CONFIG_LOAD_ERROR\b/.test(html.replace(/onerror="window\.SENLO_CONFIG_LOAD_ERROR = true"/, "")), "SENLO_CONFIG_LOAD_ERROR flag must have a reader, not just the writer");
}

function runAudioPreviewChecks() {
  assert(/audioPreview\.addEventListener\("error"[\s\S]{0,400}isLikelyTranscribableAudio/.test(html), "audio preview error handler must distinguish unplayable-vs-corrupt via isLikelyTranscribableAudio");
  assert(/audioPreviewUnplayable/.test(html), "soft audioPreviewUnplayable flag is missing");
}

function runBootIdentityChecks() {
  assert(/function hydratePersistedSession\(\)/.test(html), "hydratePersistedSession is missing");
  assert(/hydratePersistedSession\(\);\s*\n\s*loadAll\(\);/.test(html), "Boot must hydrate persisted identity BEFORE loadAll reads per-user drafts");
  assert(/bootHydratedCloudIdentity = false;\s*\n\s*loadAll\(\);\s*\n\s*render\(\);/.test(html), "restoreSession downgrade must reload local-identity data before any save");
}

function runDeploymentChecks() {
  assert(!/cloudbase-js-sdk\/latest\//.test(html), "CloudBase SDK version must be pinned, not 'latest'");
  assert(!/<script\s+src="https:\/\/static\.cloudbase\.net[^"]*"><\/script>/.test(html), "CloudBase SDK must not be a parser-blocking top-level script");
  assert(/function ensureCloudbaseSdk\(\)/.test(html), "ensureCloudbaseSdk lazy loader is missing");
  assert(/async function getCloudBaseClient\(\)\s*{\s*await ensureCloudbaseSdk\(\);/m.test(html), "getCloudBaseClient must await ensureCloudbaseSdk");
  const clientCallSites = [...html.matchAll(/getCloudBaseClient\(\)/g)]
    .filter(match => !/(?:await |function )$/.test(html.slice(Math.max(0, match.index - 15), match.index)));
  assert(clientCallSites.length === 0, "getCloudBaseClient call sites must all await (async client init)");
}

runStaticChecks();
runDeploymentChecks();
runBootIdentityChecks();
runAudioPreviewChecks();
runPageShellChecks();
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
