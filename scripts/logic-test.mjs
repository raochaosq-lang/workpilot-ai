import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deep logic test harness: bootstraps the real inline app script in a Node
// sandbox and exercises pure helpers with adversarial inputs. This complements
// scripts/smoke-test.mjs (which is mostly static string assertions).

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = readFileSync(join(rootDir, "index.html"), "utf8");
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const script = inlineScripts[0] || "";

const failures = [];
let passCount = 0;

function ok(condition, message) {
  if (condition) passCount += 1;
  else failures.push(message);
}
function eq(actual, expected, message) {
  ok(Object.is(actual, expected) || actual === expected, `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function deep(actual, expected, message) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sandbox = `
  let __recordingStub = false;
  const window = {
    SpeechRecognition: null, webkitSpeechRecognition: null,
    crypto: { randomUUID: () => "fixture-" + (window.__n = (window.__n || 0) + 1) },
    location: { hostname: "127.0.0.1", protocol: "file:", search: "" },
    SENLO_CONFIG: {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, setTimeout: () => 0, clearTimeout() {}
  };
  const document = {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return null; }, querySelectorAll() { return []; },
    querySelector() { return null; }, createElement() { return { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {}, remove() {}, style: {}, dataset: {} }; },
    body: { dataset: {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } }
  };
  const localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
  const navigator = { clipboard: { writeText: async () => {} }, userAgent: "node" };
  const crypto = window.crypto;
`;

const exposed = [
  "parseDelimitedText", "detectDelimiter", "tableRowsToObjects",
  "parseSharedStrings", "parseWorksheetXml", "columnNameToIndex", "decodeXml",
  "parseGenericJson", "parseJsonOrEmpty",
  "normalizeImportedResult", "normalizeImportKey", "findImportedValue", "normalizeImportedDateValue",
  "normalizeDateTimeLocal", "excelSerialToDateTimeLocal", "sanitizeInterviewLocation",
  "normalizeInterviewRecord", "normalizeInterviewRound", "mergeInterviewRecordData", "getInterviewRecordMergeKey",
  "normalizeHistoryRecord",
  "normalizeResult", "normalizeRecruiterFacts",
  "detectContentRouting", "detectRecruiterSubtype",
  "escapeHtml", "escapeAttr", "escapeRegExp",
  "clampPercent", "formatPercent", "normalizePercentValue",
  "parseTimeRange", "formatClock", "formatDuration", "normalizeTime",
  "formatFileSize", "buildExportFileName", "sanitizeCompanyName", "normalizeSensitiveName",
  "inferCompanyLocally", "isGenericMeetingLocation",
  "buildInterviewRowsFromText", "extractInterviewFieldsFromText",
  "uniqueList", "uniqueBy",
  "getScopedLocalList", "saveScopedLocalList", "getCurrentUserId",
  "getInterviewDerivedStatusCounts", "matchesInterviewFilter", "managerState", "compareInterviewRecords", "getFutureInterview", "getOverdueInterview",
  "getTranscriptSegmentsFromText", "inferSourceTime", "getEffectiveInput", "removeAudioUploadBlocks", "getActiveReportName", "getHistoryReportName",
  "buildInterviewQaCards", "splitSentences", "inferInterviewDuration", "inferCultureInfo", "detectSourceLanguage",
  "inferRecruiterFacts", "getFactValue", "hasConcreteOpportunityFacts", "hasConcreteOpportunityReport", "normalizeRecruiterReport", "mergeRecruiterCoreFacts",
  "inferCultureMisreadRisk", "buildCultureCards", "parseModelJson", "normalizeQaCard",
  "normalizeStoredModelLabel", "getRecruiterCompletenessLabel",
  "toCloudHistory", "fromCloudHistory", "redactSensitiveValue", "sanitizeDiagnosticValue",
  "clampModelNumber", "resolveCustomModel", "isAsrProbeReachable", "getAsrResponseErrorMessage",
  "escapeMarkdownText", "buildMinutesText", "buildRecruiterMinutesText",
  "isLikelyTranscribableAudio"
];
// Sandbox internals the storage-integrity tests need to seed/read raw storage.
const sandboxExtras = ["localStorage"];

let fns;
try {
  fns = new Function(`${sandbox}\n${script}\nreturn { ${[...exposed, ...sandboxExtras].join(", ")} };`)();
} catch (error) {
  console.error("Logic test bootstrap failed:", error.message);
  process.exit(1);
}

const {
  parseDelimitedText, detectDelimiter, tableRowsToObjects,
  parseSharedStrings, parseWorksheetXml, columnNameToIndex, decodeXml,
  parseGenericJson, parseJsonOrEmpty,
  normalizeImportedResult, normalizeImportKey, findImportedValue, normalizeImportedDateValue,
  normalizeDateTimeLocal, excelSerialToDateTimeLocal, sanitizeInterviewLocation,
  normalizeInterviewRecord, normalizeInterviewRound, mergeInterviewRecordData, getInterviewRecordMergeKey,
  normalizeHistoryRecord,
  normalizeResult, normalizeRecruiterFacts,
  detectContentRouting, detectRecruiterSubtype,
  escapeHtml, escapeAttr, escapeRegExp,
  clampPercent, formatPercent, normalizePercentValue,
  parseTimeRange, formatClock, formatDuration, normalizeTime,
  formatFileSize, buildExportFileName, sanitizeCompanyName, normalizeSensitiveName,
  inferCompanyLocally, isGenericMeetingLocation,
  buildInterviewRowsFromText, extractInterviewFieldsFromText,
  uniqueList, uniqueBy,
  getScopedLocalList, saveScopedLocalList, getCurrentUserId,
  getInterviewDerivedStatusCounts, matchesInterviewFilter, managerState, compareInterviewRecords, getFutureInterview, getOverdueInterview,
  getTranscriptSegmentsFromText, inferSourceTime, getEffectiveInput, removeAudioUploadBlocks, getActiveReportName, getHistoryReportName,
  buildInterviewQaCards, splitSentences, inferInterviewDuration, inferCultureInfo, detectSourceLanguage,
  inferRecruiterFacts, getFactValue, hasConcreteOpportunityFacts, hasConcreteOpportunityReport, normalizeRecruiterReport, mergeRecruiterCoreFacts,
  inferCultureMisreadRisk, buildCultureCards, parseModelJson, normalizeQaCard,
  normalizeStoredModelLabel, getRecruiterCompletenessLabel,
  toCloudHistory, fromCloudHistory, redactSensitiveValue, sanitizeDiagnosticValue,
  clampModelNumber, resolveCustomModel, isAsrProbeReachable, getAsrResponseErrorMessage,
  escapeMarkdownText, buildMinutesText, buildRecruiterMinutesText,
  isLikelyTranscribableAudio,
  localStorage
} = fns;

// ---- CSV / delimited parsing ----
deep(parseDelimitedText("a,b\nc,d"), [["a", "b"], ["c", "d"]], "CSV basic rows");
deep(parseDelimitedText('"a,b",c'), [["a,b", "c"]], "CSV quoted comma");
deep(parseDelimitedText('"a""b",c'), [['a"b', "c"]], "CSV escaped quote");
deep(parseDelimitedText('"l1\nl2",b'), [["l1\nl2", "b"]], "CSV quoted newline preserved");
deep(parseDelimitedText("a,b\r\nc,d"), [["a", "b"], ["c", "d"]], "CSV CRLF");
deep(parseDelimitedText("a,b\rc,d"), [["a", "b"], ["c", "d"]], "CSV lone CR (old mac)");
deep(parseDelimitedText("﻿a,b"), [["a", "b"]], "CSV strips BOM");
deep(parseDelimitedText("a,b\n\n\nc,d"), [["a", "b"], ["c", "d"]], "CSV skips blank rows");
deep(parseDelimitedText("a;b", ";"), [["a", "b"]], "CSV semicolon delimiter");
// C1 regression: a quote in the middle of an unquoted field is literal; the
// following delimiter must still split the row instead of being swallowed.
deep(parseDelimitedText('John"s Tech,Engineer'), [['John"s Tech', "Engineer"]], "CSV mid-field quote does not swallow delimiter");
deep(parseDelimitedText('a, "b"'), [["a", "b"]], "CSV quoted field after leading space still unquotes");
deep(parseDelimitedText('5\'2",170cm'), [["5'2\"", "170cm"]], "CSV trailing stray quote keeps both columns");
eq(detectDelimiter("a\tb\tc"), "\t", "detect tab delimiter");
eq(detectDelimiter("a;b;c"), ";", "detect semicolon delimiter");
eq(detectDelimiter("a,b,c"), ",", "detect comma delimiter");

deep(tableRowsToObjects([["公司", "岗位"], ["腾讯", "PM"]]), [{ 公司: "腾讯", 岗位: "PM" }], "tableRowsToObjects basic");
deep(tableRowsToObjects([["公司", "岗位", ""], ["腾讯", "PM", "北京"]]), [{ 公司: "腾讯", 岗位: "PM", 字段3: "北京" }], "tableRowsToObjects names empty header cell");
deep(tableRowsToObjects([]), [], "tableRowsToObjects empty");

// ---- XLSX XML parsing ----
eq(columnNameToIndex("A"), 0, "col A index");
eq(columnNameToIndex("Z"), 25, "col Z index");
eq(columnNameToIndex("AA"), 26, "col AA index");
eq(columnNameToIndex("AB"), 27, "col AB index");
deep(parseSharedStrings('<si><t>Hello</t></si><si><t>世界</t></si>'), ["Hello", "世界"], "shared strings basic");
deep(parseSharedStrings('<si><r><t>a</t></r><r><t>b</t></r></si>'), ["ab"], "shared strings rich text concat");
eq(decodeXml("&lt;tag&gt;&amp;&quot;&apos;"), '<tag>&"\'', "decodeXml entities");
eq(decodeXml("a&amp;lt;b"), "a&lt;b", "decodeXml no double-unescape");
{
  const xml = '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>42</v></c></row>' +
              '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="C2" t="inlineStr"><is><t>Inline</t></is></c></row>';
  const rows = parseWorksheetXml(xml, ["公司", "腾讯"]);
  deep(rows, [["公司", "42"], ["腾讯", "", "Inline"]], "parseWorksheetXml shared+number+inline+sparse");
}
{
  // shared-string index out of range / empty index must not crash or mis-map
  const xml = '<row r="1"><c r="A1" t="s"><v>99</v></c><c r="B1" t="s"><v></v></c></row>';
  const rows = parseWorksheetXml(xml, ["only"]);
  deep(rows, [], "parseWorksheetXml out-of-range and empty shared index -> empty");
}
{
  // R7 regression: a self-closing empty cell (<c r="B2" s="3"/>) must NOT swallow
  // the following cell; columns stay aligned and the empty cell becomes "".
  const xml = '<row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2" s="3"/><c r="C2" t="s"><v>1</v></c><c r="D2" t="s"><v>2</v></c></row>';
  deep(parseWorksheetXml(xml, ["腾讯", "北京", "高"]), [["腾讯", "", "北京", "高"]], "parseWorksheetXml self-closing empty cell keeps alignment");
}

// ---- JSON parsing ----
deep(parseGenericJson('{"a":1}'), { a: 1 }, "parseGenericJson plain");
deep(parseGenericJson('```json\n{"a":1}\n```'), { a: 1 }, "parseGenericJson fenced");
deep(parseGenericJson('noise {"a":1} trailing'), { a: 1 }, "parseGenericJson embedded object");
ok((() => { try { parseGenericJson("not json at all"); return false; } catch { return true; } })(), "parseGenericJson throws on garbage");
deep(parseJsonOrEmpty("{bad"), {}, "parseJsonOrEmpty swallows error");
deep(parseJsonOrEmpty(""), {}, "parseJsonOrEmpty empty");
deep(parseJsonOrEmpty('{"x":2}'), { x: 2 }, "parseJsonOrEmpty valid");

// ---- import value normalization ----
eq(normalizeImportedResult("通过"), "passed", "result 通过");
eq(normalizeImportedResult("未通过"), "failed", "result 未通过 (failed precedence)");
eq(normalizeImportedResult("不通过"), "failed", "result 不通过");
eq(normalizeImportedResult("拒绝"), "failed", "result 拒绝");
eq(normalizeImportedResult("offer"), "passed", "result offer");
eq(normalizeImportedResult(""), "pending", "result empty -> pending");
eq(normalizeImportedResult("待面试"), "pending", "result 待面试 -> pending");
eq(normalizeImportKey("Base地点（必填）"), "base地点必填", "normalizeImportKey strips punctuation");
eq(findImportedValue({ "面试公司": "腾讯" }, ["公司", "面试公司"]), "腾讯", "findImportedValue exact");
eq(findImportedValue({ "公司名称": "字节" }, ["公司"]), "字节", "findImportedValue includes");
eq(findImportedValue({ "x": "y" }, ["公司"]), "", "findImportedValue miss");

// ---- date/time normalization ----
eq(normalizeDateTimeLocal("2026-05-22T15:00"), "2026-05-22T15:00", "datetime ISO local passthrough");
eq(normalizeDateTimeLocal("garbage"), "", "datetime garbage -> empty");
eq(normalizeDateTimeLocal(""), "", "datetime empty");
eq(sanitizeInterviewLocation("2026-05-22"), "", "location strips date-only");
eq(sanitizeInterviewLocation("2026/5/22 15:00"), "", "location strips datetime");
eq(sanitizeInterviewLocation("腾讯会议"), "腾讯会议", "location keeps real location");
eq(excelSerialToDateTimeLocal("100"), "", "excel serial below range");
eq(excelSerialToDateTimeLocal("99999"), "", "excel serial above range");
ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(excelSerialToDateTimeLocal("45800")), "excel serial in range parses");
eq(normalizeImportedDateValue("2026/05/22 15:00"), normalizeDateTimeLocal("2026-05-22 15:00"), "imported date slashes->dashes");

// ---- escaping (XSS) ----
eq(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;", "escapeHtml tags+quotes");
eq(escapeHtml("a&b"), "a&amp;b", "escapeHtml ampersand");
eq(escapeHtml("a'b"), "a&#039;b", "escapeHtml single quote");
eq(escapeHtml(null), "", "escapeHtml null -> empty");
eq(escapeAttr("`tpl`"), "&#096;tpl&#096;", "escapeAttr backtick");
eq(escapeRegExp("a.b*c"), "a\\.b\\*c", "escapeRegExp meta chars");
ok(new RegExp(`^${escapeRegExp("1.2(3)")}$`).test("1.2(3)"), "escapeRegExp roundtrip matches literal");

// ---- percent ----
eq(clampPercent(150), 100, "clampPercent upper");
eq(clampPercent(-5), 0, "clampPercent lower");
eq(clampPercent(73.6), 74, "clampPercent rounds");
eq(normalizePercentValue("85%"), 85, "percent from string %");
// C9/C14 regression: decimal precision must round, not truncate.
eq(normalizePercentValue("85.5%"), 86, "percent string keeps decimal (rounds up)");
eq(normalizePercentValue("99.5%"), 100, "percent decimal rounds and clamps");
eq(normalizePercentValue("12.3%"), 12, "percent decimal rounds down");
eq(normalizePercentValue("150"), 100, "percent clamps numeric string");
eq(normalizePercentValue(""), null, "percent empty -> null");
eq(normalizePercentValue("abc"), null, "percent garbage -> null");
eq(formatPercent("70%"), "70%", "formatPercent");
eq(formatPercent("xyz"), "--%", "formatPercent unknown -> --%");

// ---- time/clock/duration ----
deep(parseTimeRange("00:10-00:20"), [10, 20], "parseTimeRange range");
deep(parseTimeRange("01:02:03"), [3723, 3723], "parseTimeRange single hms");
deep(parseTimeRange(""), [0, 0], "parseTimeRange empty");
eq(formatClock(3661), "01:01:01", "formatClock hms");
eq(formatClock(-5), "00:00:00", "formatClock negative clamps");
eq(formatClock(0), "00:00:00", "formatClock zero");
eq(formatDuration(125), "02:05", "formatDuration mm:ss");
eq(formatDuration(0), "00:00", "formatDuration zero");
eq(normalizeTime("1:05"), "00:01:05", "normalizeTime mm:ss -> hms");

// ---- file size / export name ----
eq(formatFileSize(NaN), "未知大小", "formatFileSize NaN");
eq(formatFileSize(0), "1KB", "formatFileSize 0 floors to 1KB");
eq(formatFileSize(1536), "2KB", "formatFileSize KB rounds");
eq(formatFileSize(5 * 1024 * 1024), "5.0MB", "formatFileSize MB");
ok(buildExportFileName("a/b:c*d", "json").startsWith("a-b-c-d-"), "buildExportFileName sanitizes path chars");
ok(buildExportFileName("", "json").startsWith("senlo-export-"), "buildExportFileName empty fallback");
ok(buildExportFileName("---", "json").startsWith("senlo-export-"), "buildExportFileName all-hyphen fallback");
ok(buildExportFileName("x".repeat(60), "json").length <= 48 + ".json".length + 11 + 1, "buildExportFileName length bounded");
ok(!/-\d{4}-\d{2}-\d{2}\.json$/.test(buildExportFileName("name-", "json")) === false, "buildExportFileName has date suffix");

// ---- company / sensitive ----
eq(sanitizeCompanyName("腾讯"), "腾讯", "company keeps real");
eq(sanitizeCompanyName("岗位"), "", "company blocks role word");
eq(sanitizeCompanyName("X"), "", "company too short");
// C7/C8 regression: strip trailing recruiter/possessive noise from inferred names.
eq(sanitizeCompanyName("Google HR"), "Google", "company strips trailing HR");
eq(sanitizeCompanyName("字节跳动的"), "字节跳动", "company strips trailing 的");
eq(sanitizeCompanyName("Google的HR"), "Google", "company strips trailing 的HR");
eq(sanitizeCompanyName("Microsoft"), "Microsoft", "company keeps plain name");
eq(inferCompanyLocally("我约了企业微信的一面"), "腾讯", "infer company from product alias");
eq(inferCompanyLocally("飞书产品经理岗位"), "字节跳动", "infer company from 飞书");
eq(isGenericMeetingLocation("腾讯会议"), true, "generic meeting location true");
eq(isGenericMeetingLocation("腾讯总部"), false, "specific location false");
eq(normalizeSensitiveName("未具名女生（关系密切对象）"), "未具名同学", "sensitive name softened");

// ---- uniqueness ----
deep(uniqueList(["a", "a", " b ", "", "b"]), ["a", "b"], "uniqueList trims+dedups");
deep(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], "id"), [{ id: 1 }, { id: 2 }], "uniqueBy");

// ---- record normalization ----
{
  const rec = normalizeInterviewRecord({ company: " 腾讯 ", role: "PM", rounds: [{ time: "2026-05-22T10:00", result: "weird" }] });
  eq(rec.company, "腾讯", "record trims company");
  eq(rec.rounds.length, 4, "record always has 4 rounds");
  eq(rec.rounds[0].result, "pending", "invalid round result -> pending");
  eq(rec.rounds[0].roundIndex, 1, "round index preserved");
}
{
  const round = normalizeInterviewRound({ roundIndex: 0, time: "", location: "线上" });
  eq(round.roundIndex, 0, "roundIndex 0 preserved (?? not ||)");
  eq(round.location, "线上", "round location kept");
}

// ---- C2 regression: re-import merge must not wipe existing data ----
{
  const existing = normalizeInterviewRecord({
    company: "腾讯", role: "PM", jd: "原始 JD 内容",
    rounds: [{ time: "2026-01-15T10:00", location: "腾讯会议", result: "passed", note: "聊得很好" }]
  });
  existing.rounds[0].summaryId = "sum_1"; // simulate an attached review artifact
  // imported row matches but omits result/note/jd (empty fields)
  const incoming = normalizeInterviewRecord({ company: "腾讯", role: "PM", rounds: [{ time: "2026-01-15T10:00" }] });
  const merged = mergeInterviewRecordData(existing, incoming);
  eq(merged.id, existing.id, "merge keeps existing id");
  eq(merged.jd, "原始 JD 内容", "merge preserves existing jd when import omits it");
  eq(merged.rounds[0].result, "passed", "merge preserves existing result when import is pending");
  eq(merged.rounds[0].note, "聊得很好", "merge preserves existing note when import empty");
  eq(merged.rounds[0].summaryId, "sum_1", "merge preserves attached review artifact");
  // incoming non-empty values DO update
  const incoming2 = normalizeInterviewRecord({ company: "腾讯", role: "PM", overallProgress: "已 offer", rounds: [{ time: "2026-01-15T10:00", note: "二面补充" }] });
  const merged2 = mergeInterviewRecordData(existing, incoming2);
  eq(merged2.overallProgress, "已 offer", "merge applies incoming non-empty progress");
  eq(merged2.rounds[0].note, "二面补充", "merge applies incoming non-empty note");
  eq(merged2.rounds[0].result, "passed", "merge still keeps existing result when import pending");
}

// ---- normalizer null / non-array safety (R7) ----
ok(Array.isArray(normalizeRecruiterFacts([null])), "normalizeRecruiterFacts tolerates null element");
{
  const facts = normalizeRecruiterFacts({ "推荐公司/团队": "腾讯", "推荐岗位": "AI产品经理" });
  eq((facts.find(f => f.label === "推荐公司/团队") || {}).value, "腾讯", "recruiter facts as label->value object preserved");
}
{
  // null array elements in model output must not throw — otherwise a valid model
  // response is silently demoted to the rules fallback and the history modal breaks.
  let threw = false;
  try { normalizeResult({ recruiterReport: { risks: [null, "信息不完整"], facts: [null], nextActions: [null] }, risks: [null], tasks: [null], qaCards: [null], questions: [null], improvements: [null], nextSteps: [null] }); }
  catch (error) { threw = true; }
  ok(!threw, "normalizeResult tolerates null array elements throughout");
}

// ---- content routing (spot-check beyond smoke fixtures) ----
eq(detectContentRouting("00:00 面试官：请自我介绍").contentType, "interview", "routing interview");
eq(detectContentRouting("猎头说有个腾讯岗位 base 深圳 年包80万").contentType, "recruiterConversation", "routing recruiter");
// R7: named-speaker interview transcripts that mention interview-internal vocab
// (职业定位/市场/简历) must NOT mis-route to recruiterConversation.
eq(detectContentRouting("张伟：先做个自我介绍吧\n王芳：我是产品经理\n张伟：聊聊你的职业定位和市场判断\n王芳：我会结合简历项目经历来说\n张伟：好的").contentType, "interview", "routing named-speaker interview");
// R7: short labeled transcript (<3 segments) with an overlap word must stay interview.
eq(detectContentRouting("面试官：自我介绍\n候选人：我是PM，聊聊我的简历项目经历和职业定位方向").contentType, "interview", "routing short labeled interview");
// R7: multi-line recruiter prose (no real speaker labels) must stay recruiter.
eq(detectContentRouting("猎头老师好\n这边有个腾讯的AI产品经理岗位\n年包80万，base深圳，问你是否考虑").contentType, "recruiterConversation", "routing multiline recruiter prose");

// ---- text import heuristics regression (labeled token must not pollute 整体进展) ----
{
  const fields = extractInterviewFieldsFromText("面试公司：字节跳动\n岗位JD：负责AI产品\n整体进展：一面通过");
  eq(fields.面试公司, "字节跳动", "text import company");
  eq(fields.整体进展, "一面通过", "text import progress");
  ok(!/JD|岗位描述/.test(String(fields.整体进展 || "")), "labeled JD token not leaked into progress");
}
{
  // R8: a prose label that merely embeds a generic alias substring (公司) must NOT
  // be assigned as a field via the loosened includes() match.
  const fields = extractInterviewFieldsFromText("我对这家公司的整体印象：很好");
  ok(fields.面试公司 !== "很好", "prose embedding alias substring is not assigned as company");
}

// ---- text-import table gate regression (R7) ----
{
  // Ragged comma table (trailing cell omitted on the last row) must still parse as
  // a table, not collapse into a single prose record.
  const rows = buildInterviewRowsFromText("公司,岗位,base,意向\n腾讯,PM,北京,高\n字节,产品,上海");
  eq(rows.length, 2, "ragged comma table yields 2 records");
  eq(rows[0]["公司"], "腾讯", "ragged comma table first company");
}
{
  // Colon-labeled prose (the .txt file-import shape) extracts fields, not a bogus table.
  const rows = buildInterviewRowsFromText("面试公司：字节跳动\n岗位：产品经理\nbase：北京");
  eq(rows.length, 1, "labeled prose yields one record");
  eq(rows[0].面试公司, "字节跳动", "labeled prose extracts company");
}
{
  // A single prose sentence with a comma must NOT be misparsed as a table.
  const rows = buildInterviewRowsFromText("我面了字节跳动的后端岗位,base在北京,联系人是HR小王");
  eq(rows.length, 1, "single prose sentence is not a table");
}
{
  // Pipe-delimited single line with SPACE-FREE company/role (the common Chinese
  // case, and exactly the documented paste format). The mid-line "base 城市" keyword
  // must not let the label swallow the whole prefix and capture the entire tail as
  // the base value. Each field must extract cleanly to its own cell.
  const fields = extractInterviewFieldsFromText("字节跳动｜后端工程师｜base 北京｜HR 小张｜一面 5月20日 14:00 飞书｜已约面");
  eq(fields.面试公司, "字节跳动", "pipe line company");
  eq(fields.面试岗位, "后端工程师", "pipe line role");
  eq(fields.base地点, "北京", "pipe line base is just the city, not the polluted tail");
  eq(fields.联系人微信名, "小张", "pipe line contact");
  ok(!/｜|HR|飞书/.test(String(fields.base地点 || "")), "base must not retain pipe-delimited tail");
}
{
  // The half-width keyword variant must behave the same.
  const fields = extractInterviewFieldsFromText("美团|数据分析师|base 上海|联系人 李雷|二面 待定");
  eq(fields.base地点, "上海", "half-width pipe base is clean");
}

// ---- storage scope integrity (R10): a record id must never duplicate ----
{
  // Repro of the observed corruption: storage held a record id under a stale
  // userId while the active identity differed; re-saving the current user's copy
  // of the same id used to append a second row (same id, two userIds).
  const KEY = "__logic_scope_dup_test__";
  localStorage.setItem(KEY, JSON.stringify([{ id: "DUP_X", company: "旧", userId: "local_stale_other_user" }]));
  saveScopedLocalList(KEY, [{ id: "DUP_X", company: "新" }]);
  const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
  eq(stored.filter(r => r.id === "DUP_X").length, 1, "saveScopedLocalList must not leave a same-id duplicate across userId scopes");
  const scoped = getScopedLocalList(KEY);
  eq(scoped.length, 1, "getScopedLocalList returns one row for the current user after rescope");
  eq(scoped[0].company, "新", "the current scoped copy supersedes the stale one");
}
{
  // getScopedLocalList must self-heal storage already corrupted with the same id
  // twice under the CURRENT user.
  const KEY2 = "__logic_scope_dup_test2__";
  const uid = getCurrentUserId();
  localStorage.setItem(KEY2, JSON.stringify([{ id: "Y", company: "a", userId: uid }, { id: "Y", company: "b", userId: uid }]));
  eq(getScopedLocalList(KEY2).filter(r => r.id === "Y").length, 1, "getScopedLocalList dedupes same-id rows for the current user");
}

// ===== 2026-06-22 ten-round test pass — Round 1 (import & parsing) regressions =====
// All execution-verified against the real inline app code via the sandbox above.

// R1#6/#7/#14: date-only values parse as LOCAL time (no UTC day-roll), bare
// numbers/years are not coerced into phantom dates, and the Excel-serial band is the
// realistic interview era. These are TZ-independent (local component construction).
eq(normalizeDateTimeLocal("2026-05-22"), "2026-05-22T00:00", "date-only ISO -> local midnight, no tz day-drift");
eq(normalizeImportedDateValue("2026/5/22"), "2026-05-22T00:00", "slash date-only stays same day at 00:00");
eq(normalizeDateTimeLocal("2024"), "", "bare 4-digit year not coerced into a phantom date");
eq(normalizeImportedDateValue("100"), "", "bare small number not coerced into a date");
eq(excelSerialToDateTimeLocal("25001"), "", "pre-2015 excel serial rejected (was 1968-era phantom)");
eq(excelSerialToDateTimeLocal("40000"), "", "below-band excel serial rejected");
ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(excelSerialToDateTimeLocal("45000")), "in-band modern excel serial still parses");
eq(sanitizeInterviewLocation("30000"), "30000", "numeric room code outside the serial band is not stripped as a date");

// R1#1/#5: base地点 and 联系人微信名 heuristics must not swallow whole prose / round-address
// / company lines that merely contain a city or HR/猎头 keyword.
eq(extractInterviewFieldsFromText("第1轮地址：北京中关村\n面试公司：字节").base地点 || "", "", "round-address line must not populate base地点");
ok(!/有限公司/.test(String(extractInterviewFieldsFromText("北京字节跳动科技有限公司").base地点 || "")), "company name containing a city must not be captured as base地点");
eq(extractInterviewFieldsFromText("这个岗位是HR直招不走猎头").联系人微信名 || "", "", "prose merely mentioning HR/猎头 must not populate 联系人微信名");

// R1#4: an empty labeled field ("面试公司：") must not let the value capture cross a
// newline and steal the next label line as the company value.
{
  const f = extractInterviewFieldsFromText("面试公司：\n面试岗位：高级前端\n我的意向：高");
  ok(!String(f.面试公司 || "").includes("："), "blank 面试公司 label must not steal the next label line as company");
  eq(f.面试岗位, "高级前端", "the following labeled field still extracts correctly");
}

// R1#3: detectDelimiter ignores delimiters inside quoted cells.
eq(detectDelimiter('"北京, 海淀, 中关村"\t备注\n腾讯\t一面'), "\t", "detect tab ignores commas inside a quoted cell");
eq(detectDelimiter('"甲, 乙, 丙";状态\n腾讯;已约'), ";", "detect semicolon ignores quoted commas");
eq(detectDelimiter('"姓名, 公司","岗位"'), ",", "genuine quoted-comma CSV still detects comma");

// R1#13: CRLF inside a quoted cell normalizes to LF (no stray \r leaks into values).
deep(parseDelimitedText('"l1\r\nl2",b'), [["l1\nl2", "b"]], "CSV CRLF inside quoted cell normalizes to LF");
ok(!JSON.stringify(parseDelimitedText('a,"x\r\ny"')).includes("\\r"), "no stray CR survives in quoted cells");

// R1#12: duplicate header columns are suffixed so neither column's data is dropped.
deep(tableRowsToObjects([["公司", "备注", "备注"], ["腾讯", "A", "B"]]), [{ 公司: "腾讯", 备注: "A", 备注2: "B" }], "tableRowsToObjects keeps both duplicate-header columns");

// R1#2: a self-closing empty shared string <si/> keeps its index slot.
deep(parseSharedStrings('<si><t>A</t></si><si/><si><t>C</t></si>'), ["A", "", "C"], "parseSharedStrings keeps self-closing <si/> as empty slot (no index shift)");
deep(parseWorksheetXml('<row r="1"><c r="A1" t="s"><v>2</v></c></row>', parseSharedStrings('<si><t>A</t></si><si/><si><t>C</t></si>')), [["C"]], "shared-string index alignment survives a self-closing <si/>");

// R1#11: XFE (one past Excel's XFD max) is clamped, not materialized as a 16385-wide row.
eq(parseWorksheetXml('<row r="1"><c r="XFE1" t="s"><v>0</v></c></row>', ["x"])[0].length, 1, "XFE column ref is clamped (off-by-one fixed), not a 16385-wide row");

// R1#8/#9: import merge key separates distinct base pipelines and still dedups blank-company rows.
{
  const a = normalizeInterviewRecord({ company: "腾讯", role: "产品经理", baseLocation: "广州" });
  const b = normalizeInterviewRecord({ company: "腾讯", role: "产品经理", baseLocation: "深圳" });
  ok(getInterviewRecordMergeKey(a) !== getInterviewRecordMergeKey(b), "distinct base pipelines at same company+role do not collide");
  ok(getInterviewRecordMergeKey(a) === getInterviewRecordMergeKey(normalizeInterviewRecord({ company: "腾讯", role: "产品经理", baseLocation: "广州" })), "re-importing the same company/role/base still matches (dedup preserved)");
  const blank = normalizeInterviewRecord({ baseLocation: "上海", rounds: [{ time: "2026-07-01T10:00" }] });
  ok(getInterviewRecordMergeKey(blank) !== "", "blank company/role row still gets a dedupable key from base + first round time");
  ok(getInterviewRecordMergeKey(normalizeInterviewRecord({})) === "", "a record with nothing distinguishing gets an empty (non-dedupable) key");
}

// R1#15: ASCII result tokens are word-bounded so English words containing 'no' are not 'failed'.
eq(normalizeImportedResult("noted"), "pending", "English word containing 'no' is not misclassified as failed");
eq(normalizeImportedResult("normal"), "pending", "'normal' not misclassified as failed");
eq(normalizeImportedResult("no"), "failed", "standalone 'no' still classified failed");
eq(normalizeImportedResult("未通过"), "failed", "CJK fail token still classified");
eq(normalizeImportedResult("offer"), "passed", "offer still classified passed");

// ===== 2026-06-22 R9 storage-resilience (found by adversarial execution probe) =====
// The load path (getScopedLocalList -> normalize*) must tolerate corrupted/tampered
// localStorage: a non-array value, or a null / non-object element, must NOT throw —
// a crash here bricks app boot. `= {}` default params only catch undefined, not null.
ok((() => { try { return normalizeResult(null) && typeof normalizeResult(null) === "object"; } catch { return false; } })(), "normalizeResult(null) must not throw");
ok((() => { try { const r = normalizeInterviewRecord(null); return Array.isArray(r.rounds) && r.rounds.length === 4; } catch { return false; } })(), "normalizeInterviewRecord(null) must not throw and still yields 4 rounds");
ok((() => { try { return normalizeHistoryRecord(null) && typeof normalizeHistoryRecord(null) === "object"; } catch { return false; } })(), "normalizeHistoryRecord(null) must not throw");
ok((() => { try { normalizeInterviewRecord("x"); normalizeInterviewRecord(123); normalizeHistoryRecord([]); normalizeResult("nope"); return true; } catch { return false; } })(), "normalizers tolerate non-object inputs (string/number/array)");
{
  const KEY = "__logic_corrupt_storage__";
  localStorage.setItem(KEY, JSON.stringify([null, "junk", 42, { id: "ok1", userId: getCurrentUserId(), company: "腾讯" }]));
  let res;
  ok((() => { try { res = getScopedLocalList(KEY); return Array.isArray(res); } catch { return false; } })(), "getScopedLocalList tolerates null/non-object elements in a corrupted stored array");
  ok(Array.isArray(res) && res.every(item => item && typeof item === "object"), "getScopedLocalList drops null/non-object junk elements");
  localStorage.setItem(KEY, JSON.stringify({ not: "an array" }));
  ok((() => { try { return Array.isArray(getScopedLocalList(KEY)); } catch { return false; } })(), "getScopedLocalList returns [] when the stored value is not an array (no crash)");
  localStorage.removeItem(KEY);
}

// ===== 2026-06-22 R10 (cross-feature integration) regressions =====
// chip-count == filtered-list invariant: each quick-filter chip's badge count
// (getInterviewDerivedStatusCounts) must equal the number of records matchesInterviewFilter
// accepts for that status — including a record with BOTH an overdue and a future round.
{
  const list = [
    normalizeInterviewRecord({ company: "OverdueAndFuture", rounds: [{ time: "2020-01-01T10:00", result: "pending" }, { time: "2099-01-01T10:00", result: "pending" }] }),
    normalizeInterviewRecord({ company: "FailedOnly", rounds: [{ result: "failed" }] }),
    normalizeInterviewRecord({ company: "Unscheduled" }),
  ];
  const counts = getInterviewDerivedStatusCounts(list);
  const savedSearch = managerState.search, savedStatus = managerState.status;
  managerState.search = "";
  ["upcoming", "needs-update", "unscheduled", "needs-review"].forEach(status => {
    managerState.status = status;
    const filtered = list.filter(matchesInterviewFilter).length;
    eq(filtered, counts[status], `quick-filter '${status}' badge count (${counts[status]}) must equal its filtered list (${filtered})`);
  });
  managerState.search = savedSearch;
  managerState.status = savedStatus;
}

// R2 deep-sweep [3]: a terminally-failed pipeline must expose NO active round, so a
// leftover pending later round can't resurface it under 即将面试 / 已过期待更新 / next-up.
{
  const failedThenFuture = normalizeInterviewRecord({ company: "FailedThenFuture", rounds: [{ result: "failed" }, { time: "2099-01-01T10:00", result: "pending" }] });
  eq(getFutureInterview(failedThenFuture), null, "a failed pipeline exposes no upcoming round even with a later pending round");
  const failedThenPast = normalizeInterviewRecord({ company: "FailedThenPast", rounds: [{ result: "failed" }, { time: "2000-01-01T10:00", result: "pending" }] });
  eq(getOverdueInterview(failedThenPast), null, "a failed pipeline exposes no overdue round even with a stale past pending round");
  const counts = getInterviewDerivedStatusCounts([failedThenFuture]);
  eq(counts.upcoming, 0, "failed-then-future record is not counted as upcoming");
  eq(counts.failed, 1, "failed-then-future record is counted as failed");
  const savedSearch = managerState.search, savedStatus = managerState.status;
  managerState.search = ""; managerState.status = "upcoming";
  ok(!matchesInterviewFilter(failedThenFuture), "failed pipeline must not appear under the 即将面试 filter");
  managerState.search = savedSearch; managerState.status = savedStatus;
  // Positive control: passing early rounds with a real future round still counts.
  const passedThenFuture = normalizeInterviewRecord({ company: "PassedThenFuture", rounds: [{ result: "passed" }, { time: "2099-01-01T10:00", result: "pending" }] });
  ok(getFutureInterview(passedThenFuture) !== null, "passed-then-future still counts as an upcoming interview");
}

// compareInterviewRecords queue ordering: soonest upcoming first, finished last.
{
  const soon = normalizeInterviewRecord({ company: "Soon", rounds: [{ time: "2099-01-01T10:00", result: "pending" }] });
  const later = normalizeInterviewRecord({ company: "Later", rounds: [{ time: "2099-06-01T10:00", result: "pending" }] });
  const done = normalizeInterviewRecord({ company: "Done", rounds: [{ result: "passed" }, { result: "passed" }, { result: "passed" }, { result: "passed" }] });
  ok(compareInterviewRecords(soon, later) < 0, "compareInterviewRecords: sooner upcoming sorts before later");
  ok(compareInterviewRecords(soon, done) < 0, "compareInterviewRecords: an upcoming interview sorts before a finished one");
  eq([done, later, soon].sort(compareInterviewRecords)[0].company, "Soon", "queue sort surfaces the soonest upcoming interview first");
}

// ===== 2026-06-22 R3 deep-sweep (AI review core) regressions =====
// [7] Speaker labels must start with a CJK/letter and exclude year/annotation tokens.
{
  const segs = getTranscriptSegmentsFromText("产品经理：聊增长\n2021年：我加入了公司\n负责人：明白");
  eq(segs.length, 3, "three labeled lines yield three segments");
  ok(/^说话人/.test(segs[1].speaker), "year token '2021年：' is not treated as a speaker name");
  eq(segs[0].speaker, "产品经理", "real speaker label preserved");
  const named = new Set(segs.map(s => s.speaker).filter(s => !/^说话人/.test(s)));
  eq(named.size, 2, "only the two real names count as speakers (year token excluded)");
}
// [0] A labeled single-author recruiter note must route to recruiter, not a fake transcript.
eq(detectContentRouting("猎头推荐：腾讯AI产品岗\n年包：80万\n职级：P7\n建议尽快约时间深聊推进流程。").contentType, "recruiterConversation", "labeled single-author recruiter note routes to recruiter (not fake multi-speaker)");
ok(!detectContentRouting("公司：腾讯\n方向：AI\n规模：三十人\n这个机会值得看推进流程").reason.includes("多人对话"), "no false '多人对话' reason for single-author label notes");
eq(detectContentRouting("张伟：先做个自我介绍吧\n王芳：我是产品经理\n张伟：聊聊职业定位\n王芳：我会结合简历项目经历来说\n张伟：好的").contentType, "interview", "recurring named-speaker dialog still routes to interview");
// [5] inferSourceTime: an in-sentence time range must NOT hijack the segment timestamp.
eq(inferSourceTime("候选人：每天 9:00 到 18:00 加班", 2), "00:00:36-00:00:54", "in-sentence time range falls through to positional index");
eq(inferSourceTime("00:01:00-00:01:18 候选人：你好", 0), "00:01:00-00:01:18", "leading explicit timestamp range still honored");
// [8] getEffectiveInput strips zero-width-only input to empty (no false generate-enable).
eq(getEffectiveInput("​​​"), "", "zero-width-space-only input is treated as empty");
eq(getEffectiveInput("﻿"), "", "BOM-only input is treated as empty");
ok(getEffectiveInput("真实内容").length > 0, "real text still counts as input");
// [4] removeAudioUploadBlocks preserves user notes typed below the transcript.
{
  const cleaned = removeAudioUploadBlocks("[转写稿｜a.mp3]\n台词。\n\n我的额外笔记：保留我");
  ok(cleaned.includes("我的额外笔记"), "user notes below the transcript are preserved on re-upload");
  ok(!cleaned.includes("转写稿"), "the transcript block itself is still stripped");
}
// [10] History list and output panel must agree on the recruiter report name per subtype.
["opportunityRecommendation", "careerAnalysis", "profilePositioning", "interviewStrategy", "compensationNegotiation", "followUpCoordination", "mixed"].forEach(key => {
  eq(getHistoryReportName({ contentType: "recruiterConversation", recruiterSubtype: key }), getActiveReportName("recruiterConversation", key, "interview"), `history vs panel recruiter name agree for ${key}`);
});

// ===== 2026-06-22 R4 deep-sweep (generation engine) regressions =====
// [0] A question card's answer must not merge a LATER question's answer.
{
  const t = ["面试官：项目介绍一下好吗？", "候选人：我做了A，留存提升。", "面试官：最大的挑战是什么？", "候选人：挑战是成本。"].join("\n");
  const cards = buildInterviewQaCards(getTranscriptSegmentsFromText(t), splitSentences(t));
  ok(!cards[0].answer.includes("成本"), "Q0 card answer must not include the answer to a later question");
}
// [1] A candidate turn with a mid-sentence 怎么 must not spawn a role-inverted card.
{
  const t = ["面试官：介绍一下项目好吗？", "候选人：我做了A，那时候我在想怎么平衡体验和商业化，留存提升了。"].join("\n");
  const cards = buildInterviewQaCards(getTranscriptSegmentsFromText(t), splitSentences(t));
  ok(cards.every(card => !/(什么|吗)\s*[？?]?\s*$/.test(card.answer)), "no card whose answer is itself an interviewer question");
  ok(cards.length <= 1, "a mid-sentence keyword in candidate prose does not spawn an extra card");
}
// [5] Interview duration must be 待识别 without real timestamps, real otherwise.
{
  const noTs = Array.from({ length: 10 }, (_, i) => `第${i}句没有时间戳的内容`).join("\n");
  eq(inferInterviewDuration(getTranscriptSegmentsFromText(noTs)), "待识别", "duration is 待识别 without real timestamps");
  ok(/分钟/.test(inferInterviewDuration(getTranscriptSegmentsFromText("[00:00:05] 你好\n[00:02:40] 再见"))), "real leading timestamps still yield a duration");
}
// [3] Language detection by volume (the old run-length threshold was unreachable).
eq(detectSourceLanguage("Hi, could you align on the timeline? Maybe we can confirm the scope by Friday."), "英文", "spaced English detected as 英文");
eq(detectSourceLanguage("我觉得 we should align on the timeline，可能 Friday 之前 confirm scope。"), "中英混合", "CN/EN mix detected as 中英混合");
eq(detectSourceLanguage("我们明天对齐一下排期和范围。"), "中文", "pure Chinese stays 中文");
eq(inferCultureInfo("Hi, could you align on the timeline? Maybe we can confirm the scope by Friday.").round, "跨语言语境", "english culture transcript is a cross-language context");
// [2] Placeholder/negation prose must not become a concrete company/role.
eq(getFactValue(inferRecruiterFacts("猎头说腾讯这边有 HC，具体岗位还没定。"), "推荐岗位"), "", "placeholder role 还没定 not captured");
eq(getFactValue(inferRecruiterFacts("他们公司最近裁员很厉害不太稳定"), "推荐公司/团队"), "", "prose company (裁员/不稳定) not captured");
// [6] The sim opportunity gate and the renderer gate must agree (both AND).
{
  const facts = inferRecruiterFacts("字节这边团队在扩招机会，问我有没有兴趣聊一下。");
  eq(hasConcreteOpportunityFacts(facts), hasConcreteOpportunityReport(normalizeRecruiterReport({ facts }, "opportunityRecommendation")), "sim and renderer opportunity gate agree");
}
// [8] Fractional probability (0–1) is rescaled to a percent, not collapsed to 1%.
eq(normalizePercentValue(0.72), 72, "fractional probability rescaled to percent");
eq(normalizePercentValue(0.85), 85, "fractional 0.85 -> 85");
eq(normalizePercentValue(1), 1, "integer 1 means 1 percent, not 100 (R5: only the open interval (0,1) is a fraction)");
eq(normalizePercentValue(0.999), 100, "a true sub-1 fraction still rescales and clamps");
eq(normalizePercentValue(72), 72, "integer percent unchanged");
eq(normalizePercentValue(0), 0, "zero stays zero");
eq(normalizeQaCard({ score: 0.85 }).score, 85, "fractional qa-card score rescaled");
// [9] Non-object model JSON falls through to the structured fallback (not raw value).
ok(typeof parseModelJson("true") === "object" && parseModelJson("true") !== true, "bare boolean JSON -> structured object fallback");
ok(typeof parseModelJson("42") === "object", "bare number JSON -> structured object fallback");
// [12] Nested-object recruiter string fields flatten (no [object Object]).
{
  const r = normalizeRecruiterReport({ coreConclusion: { text: "实际结论" }, replySuggestion: ["先回复", "再确认"] }, "opportunityRecommendation");
  ok(!/\[object Object\]/.test(r.coreConclusion) && r.coreConclusion === "实际结论", "object coreConclusion flattened to its text");
  ok(!/\[object Object\]/.test(r.replySuggestion) && r.replySuggestion.includes("先回复"), "array replySuggestion flattened");
}
// [13] Duplicate core-label facts retain both values instead of dropping all but last.
{
  const m = mergeRecruiterCoreFacts(normalizeRecruiterFacts([{ label: "推荐岗位", value: "PM-增长" }, { label: "推荐岗位", value: "PM-平台" }]));
  const joined = m.map(f => f.value).join("|");
  ok(joined.includes("PM-增长") && joined.includes("PM-平台"), "both duplicate-label fact values retained");
}
// [11] A lone benign modal must not assert veiled worry; a real concern signal still does.
ok(!inferCultureMisreadRisk("That would be great, thanks for the help!").includes("委婉"), "benign 'would' does not assert veiled worry");
ok(inferCultureMisreadRisk("I have a concern, not sure this would work").includes("委婉"), "modal + concern signal still flags veiled worry");
// [7] A culture card must not blend an adjacent different speaker's words.
{
  const segs = [
    { index: 0, speaker: "对方", text: "Could you confirm the timeline?", time: "00:00:00-00:00:18" },
    { index: 1, speaker: "我", text: "我再确认资源", time: "00:00:18-00:00:36" }
  ];
  const cards = buildCultureCards(segs, []);
  ok(cards[0] && !cards[0].answer.includes("我再确认资源"), "culture card does not merge the next (different) speaker's turn");
}

// ===== 2026-06-22 R5 deep-sweep (result rendering / stats / honesty) regressions =====
// [0] A stored record's engine label must NEVER read as 真实大模型 for an empty modelUsed.
ok(!normalizeStoredModelLabel("").startsWith("真实大模型"), "empty stored modelUsed must not be labeled as a real model");
ok(normalizeStoredModelLabel("").length > 0, "empty stored modelUsed gets a rules/local label");
eq(normalizeStoredModelLabel("claude-opus-4"), "claude-opus-4", "a real stored model name passes through");
// [1] (regression from R4) an integer 1% must not inflate to 100% via double-normalization.
eq(normalizePercentValue(1), 1, "integer 1 stays 1%");
eq(normalizeQaCard({ score: 1 }).score, 1, "qa score of 1 stays 1, not 100");
// [2] value-less model fact objects must not fake a concrete opportunity.
{
  const rep = normalizeRecruiterReport({ facts: [{ label: "推荐公司/团队", value: "" }, { label: "推荐岗位" }] }, "opportunityRecommendation");
  eq(getFactValue(rep.facts, "推荐公司/团队"), "", "value-less / 待确认 fact is not a real value");
  ok(hasConcreteOpportunityReport(rep) === false, "empty model facts do not fake a concrete opportunity");
}
// [3] completeness label must not count placeholder/negation fact values as known.
{
  const rep = normalizeRecruiterReport({ facts: [{ label: "薪资/职级", value: "保密" }, { label: "base/工作方式", value: "还没定" }, { label: "流程/时间点", value: "不太清楚" }] }, "opportunityRecommendation");
  eq(getRecruiterCompletenessLabel(rep), "信息待补齐", "placeholder fact values do not inflate completeness");
}
// [5]/[6] a qa score of 0 is preserved and is consistent with the 需重练 bucket.
eq(normalizeQaCard({ score: 0 }).score, 0, "qa score 0 is preserved (not defaulted to 78)");

// ===== 2026-06-22 R6 deep-sweep (account / cloud / security) regressions =====
// [0] Cloud history round-trip must preserve the manual content-routing override + audio link.
{
  const round = fromCloudHistory(toCloudHistory({ id: "h1", title: "t", contentType: "recruiterConversation", recruiterSubtype: "mixed", contentRoutingManual: true, contentRoutingReason: "用户手动指定", audioFileId: "file-1" }));
  eq(round.contentRoutingManual, true, "cloud round-trip preserves the manual content-routing override");
  eq(round.contentRoutingReason, "用户手动指定", "cloud round-trip preserves the routing reason");
  eq(round.audioFileId, "file-1", "cloud round-trip preserves the uploaded-audio link");
}
// [4] Redaction covers the CloudBase access-key aliases, not just the bare names.
["accessKey", "apiKey", "asrApiKey", "clientId", "client_id", "publishableKey", "anonKey", "secret", "token"].forEach(key => {
  eq(redactSensitiveValue(key, "SECRETVALUE"), "[redacted]", `redactSensitiveValue redacts ${key}`);
});
eq(redactSensitiveValue("displayName", "Alice"), "Alice", "non-sensitive key passes through");
// [5] A non-string sensitive value is fully redacted, never partially masked (no leak).
{
  const out = sanitizeDiagnosticValue({ credential: ["sk-AAAABBBBCCCC1111", "sk-DDDDEEEEFFFF2222"] });
  eq(out.credential, "[redacted]", "array-valued sensitive key is fully redacted");
  ok(!JSON.stringify(out).includes("sk-A") && !JSON.stringify(out).includes("2222"), "no plaintext secret substring leaks");
  // a primitive string sensitive value is still partially masked (unchanged behavior)
  ok(sanitizeDiagnosticValue({ token: "abcdefghijkl" }).token.includes("••••"), "string sensitive value still masked");
}

// ===== 2026-06-22 R7 deep-sweep (model/ASR config + audio/recording) regressions =====
// [0] A plain dropdown pick must not persist a redundant customModel (would survive sync).
eq(resolveCustomModel("gpt-4o", "gpt-4o"), "", "dropdown pick stores empty customModel");
eq(resolveCustomModel("internal-gateway-v2", ""), "internal-gateway-v2", "a real typed custom id is kept");
eq(resolveCustomModel("  gpt-4o  ", "gpt-4o"), "", "whitespace-trimmed echo also drops");
// [5] Numeric model params are clamped to their declared bounds.
eq(clampModelNumber("0", 30000, 1000, 600000), 1000, "timeout 0 clamps to min");
eq(clampModelNumber("-5", 30000, 1000, 600000), 1000, "negative timeout clamps to min");
eq(clampModelNumber("0", 4000, 256, 32000), 256, "max_tokens 0 clamps to min");
eq(clampModelNumber("5", 0.2, 0, 2), 2, "temperature 5 clamps to max");
eq(clampModelNumber("", 0.2, 0, 2), 0.2, "empty falls back to default");
eq(clampModelNumber("0", 0.2, 0, 2), 0, "temperature 0 is in range and kept");
// [6] isAsrProbeReachable distinguishes a reachable-but-rejected probe from a wrong-model 4xx.
ok(isAsrProbeReachable({ status: 400, message: "audio too short, model received no speech" }) === true, "reachable probe (audio too short) is not marked unreachable by the bare word 'model'");
ok(isAsrProbeReachable({ status: 404, message: "model FunAudioLLM/x not found" }) === false, "wrong-model 404 is still unreachable");
ok(isAsrProbeReachable({ status: 401, message: "invalid api key" }) === false, "auth error is unreachable");
// [8]/[9] ASR JSON parsing/error reading is null-safe.
deep(parseJsonOrEmpty("null"), {}, "JSON null body -> {} (no crash on .error/.text)");
deep(parseJsonOrEmpty("123"), {}, "JSON primitive body -> {}");
ok(typeof getAsrResponseErrorMessage(parseJsonOrEmpty("null"), "null", { status: 500, statusText: "X" }) === "string", "getAsrResponseErrorMessage tolerates a null-parsed body");

// ===== 2026-06-22 R8 deep-sweep (history / export / fidelity) regressions =====
// [1] Search query is trimmed only at the use-site, so a trailing/leading space still matches.
{
  const rec = normalizeInterviewRecord({ company: "字节跳动", role: "PM" });
  const savedSearch = managerState.search, savedStatus = managerState.status;
  managerState.status = "all"; managerState.search = "  字节  ";
  ok(matchesInterviewFilter(rec), "a search with surrounding spaces still matches (trim at use-site)");
  managerState.search = savedSearch; managerState.status = savedStatus;
}
// [2] Nested-object recruiter fact value flattens (no [object Object] in report/export).
{
  const r = normalizeRecruiterReport({ facts: [{ label: "薪资/职级", value: { min: "60万", max: "80万" } }] }, "opportunityRecommendation");
  ok(!/\[object Object\]/.test(JSON.stringify(r.facts)), "nested-object fact value flattened, no [object Object]");
}
// [3] Nested-object key-value map (专项分析) flattens.
{
  const r = normalizeRecruiterReport({ career: { direction: { primary: "AI产品" }, market: "偏热" } }, "careerAnalysis");
  ok(!/\[object Object\]/.test(JSON.stringify(r.career)) && r.career.market === "偏热", "key-value map flattens nested objects");
}
// [5] Export filename strips control/bidi chars but keeps CJK.
ok(!/‮/.test(buildExportFileName(`report${String.fromCharCode(0x202e)}gpj.exe`, "md")), "buildExportFileName strips a bidi override");
ok(/字节跳动/.test(buildExportFileName("字节跳动 产品", "md")), "buildExportFileName keeps CJK names");

// ===== 2026-06-22 R9 deep-sweep (security: markdown injection, tamper, key-leak) regressions =====
// [0] Exported Markdown neutralizes image/HTML payloads from model/transcript text.
// escapeMarkdownText backslash-escapes the markers (![ and ]( both get a preceding \) so a
// renderer won't form an image, and HTML angle brackets become entities. The guards below
// look for an UNESCAPED image marker (] ( not preceded by a backslash) and a raw <img>.
eq(escapeMarkdownText("![](https://evil/leak)"), "\\![\\](https://evil/leak)", "markdown image markers are backslash-escaped");
ok(!/<img/.test(escapeMarkdownText("<img src=x onerror=alert(1)>")), "inline HTML is neutralized to entities");
{
  const md = buildMinutesText({ contentType: "interview", qaCards: [{ question: "q", answer: "我的项目 ![](https://evil/leak) <img src=x onerror=alert(1)> 上线了", critique: "c", score: 70 }] }, "interview", "规则快速分析");
  ok(!/[^\\]\]\(https?:/.test(md), "exported interview report has no UNESCAPED auto-loading markdown image");
  ok(!/<img\b/.test(md), "exported interview report has no raw inline <img>");
}
{
  const md = buildRecruiterMinutesText({ recruiterReport: { coreConclusion: "<img src=x onerror=alert(1)>", facts: [{ label: "推荐公司/团队", value: "![](https://evil/p)" }] } }, "规则快速分析", "opportunityRecommendation");
  ok(!/<img\b/.test(md) && !/[^\\]\]\(https?:/.test(md), "exported recruiter report neutralizes injected image/HTML");
}
// [1] Tampered nested-object string fields degrade to text/empty, never "[object Object]".
ok(normalizeInterviewRecord({ company: { zh: "腾讯" }, baseLocation: { city: "SZ" } }).company !== "[object Object]", "interview company never [object Object]");
ok(normalizeHistoryRecord({ title: { a: 1 }, companyName: { x: 1 } }).companyName !== "[object Object]", "history companyName never [object Object]");
ok(!JSON.stringify(normalizeHistoryRecord({ sourceByMode: { text: { n: 1 } }, inputMode: "text" }).sourceByMode).includes("[object Object]"), "sourceByMode never [object Object]");
// [3] redactSensitiveValue covers serviceRole/service_role.
["serviceRole", "service_role"].forEach(k => eq(redactSensitiveValue(k, "SUPERSECRET"), "[redacted]", `redactSensitiveValue redacts ${k}`));

// ===== 2026-06-22 R10 deep-sweep (cross-feature / coverage audit) regressions =====
// [3] A placeholder/negation fact value must not fake a concrete opportunity.
{
  const rep = normalizeRecruiterReport({ facts: [{ label: "推荐公司/团队", value: "腾讯" }, { label: "推荐岗位", value: "还没定" }] }, "opportunityRecommendation");
  eq(getFactValue(rep.facts, "推荐岗位"), "", "placeholder role 还没定 is not a real fact value");
  ok(hasConcreteOpportunityReport(rep) === false, "a placeholder role must not fake a concrete opportunity (parity with completeness label)");
}
// [8] An object-shaped analysis/questions/risks list flattens, no [object Object].
{
  const r = normalizeRecruiterReport({ analysis: { market: "偏热", level: "P7" } }, "careerAnalysis");
  ok(!JSON.stringify(r.analysis).includes("[object Object]"), "object-shaped analysis flattens, not [object Object]");
  ok(r.analysis.some(x => x.includes("偏热")), "object analysis values are preserved");
}
// [9] A value-less 待确认 placeholder is not concatenated in front of a real merged value.
{
  const m = mergeRecruiterCoreFacts(normalizeRecruiterFacts([{ label: "推荐岗位" }, { label: "推荐岗位", value: "PM-增长" }]));
  eq(m.find(f => f.label === "推荐岗位").value, "PM-增长", "待确认 placeholder is dropped, not concatenated");
}

// ===== 2026-07-04 R11 deep-sweep (deployment/first-load) regressions =====
// [7] Browser-unplayable but server-transcribable formats must stay transcribable.
ok(isLikelyTranscribableAudio({ name: "interview.webm", type: "" }) === true, "webm by extension is transcribable");
ok(isLikelyTranscribableAudio({ name: "voice.oga", type: "" }) === true, "oga by extension is transcribable");
ok(isLikelyTranscribableAudio({ name: "clip", type: "audio/ogg" }) === true, "audio/* mime is transcribable");
ok(isLikelyTranscribableAudio({ name: "notes.txt", type: "text/plain" }) === false, "renamed txt is not transcribable");
ok(isLikelyTranscribableAudio({ name: "archive.zip", type: "" }) === false, "zip is not transcribable");
ok(isLikelyTranscribableAudio(null) === false, "null file is not transcribable");

if (failures.length) {
  console.error(`Senlo logic test FAILED (${passCount} passed, ${failures.length} failed):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Senlo logic test passed. assertions=${passCount}`);
