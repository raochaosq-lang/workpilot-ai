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
  "normalizeInterviewRecord", "normalizeInterviewRound", "mergeInterviewRecordData",
  "normalizeResult", "normalizeRecruiterFacts",
  "detectContentRouting", "detectRecruiterSubtype",
  "escapeHtml", "escapeAttr", "escapeRegExp",
  "clampPercent", "formatPercent", "normalizePercentValue",
  "parseTimeRange", "formatClock", "formatDuration", "normalizeTime",
  "formatFileSize", "buildExportFileName", "sanitizeCompanyName", "normalizeSensitiveName",
  "inferCompanyLocally", "isGenericMeetingLocation",
  "buildInterviewRowsFromText", "extractInterviewFieldsFromText",
  "uniqueList", "uniqueBy"
];

let fns;
try {
  fns = new Function(`${sandbox}\n${script}\nreturn { ${exposed.join(", ")} };`)();
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
  normalizeInterviewRecord, normalizeInterviewRound, mergeInterviewRecordData,
  normalizeResult, normalizeRecruiterFacts,
  detectContentRouting, detectRecruiterSubtype,
  escapeHtml, escapeAttr, escapeRegExp,
  clampPercent, formatPercent, normalizePercentValue,
  parseTimeRange, formatClock, formatDuration, normalizeTime,
  formatFileSize, buildExportFileName, sanitizeCompanyName, normalizeSensitiveName,
  inferCompanyLocally, isGenericMeetingLocation,
  buildInterviewRowsFromText, extractInterviewFieldsFromText,
  uniqueList, uniqueBy
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

if (failures.length) {
  console.error(`Senlo logic test FAILED (${passCount} passed, ${failures.length} failed):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Senlo logic test passed. assertions=${passCount}`);
