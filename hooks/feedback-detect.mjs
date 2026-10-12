#!/usr/bin/env node
// Design-automation plugin: opt-in, local-only feedback notes.
//
// Runs on every user prompt (UserPromptSubmit hook) but does NOTHING unless ALL of these hold:
//   1. the user opted in (~/.claude/design-automation/feedback-optin.json has "enabled": true),
//   2. a design pipeline run is active in the working folder (design-pipeline-state.json exists),
//   3. the message is short (long pastes such as briefs and BRDs are never touched),
//   4. the message matches a confusion / frustration pattern.
// When it does match, it appends ONE short, redacted line to a local file. It never sends anything
// anywhere and never prints anything to the model. The user reviews and sends with /design-feedback.
//
// Output: nothing on stdout except an optional one-line notice to the user (systemMessage).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const DIR = path.join(HOME, '.claude', 'design-automation');
const OPTIN = path.join(DIR, 'feedback-optin.json');
const LOG = path.join(DIR, 'feedback', 'feedback.jsonl');
const THROTTLE = path.join(DIR, 'feedback', '.last-notice');
const MAX_LEN = 600;      // longer messages are treated as pasted content, never as feedback
const KEEP = 300;         // characters kept of a matching message
const NOTICE_EVERY_MS = 10 * 60 * 1000;

const PATTERNS = [
  ['lost', /\b(i'?m|i am|im|we'?re|we are)\s+(so\s+|really\s+|totally\s+|completely\s+)?(lost|confused|stuck)\b|\bi (don'?t|do not|dont) (understand|get (it|this|what))|\bi (have no|got no) idea\b|\bwhat (is|does) (this|that|it) (mean|do)\b|\bwhere (am i|do i|should i)\b|\bhow (do|am) i (supposed|meant) to\b|\bnot sure what (to do|this|that)\b/i],
  ['confusing', /\b(this|that|it)\s+(is|was|seems|feels|looks)\s+(very\s+|really\s+|so\s+|too\s+)?(confusing|unclear|weird|strange|illogical|messy|overwhelming|complicated)\b|\b(doesn'?t|does not|don'?t|do not|didn'?t|did not|dont|doesnt)\s+make\s+(any\s+)?sense\b|\bmakes?\s+no\s+sense\b|\bmakes?\s+(any\s+)?sense\?|\bwhy (is|does|did|are|would) (it|this|that|you)\b.*\?|\bwhat'?s the point\b/i],
  ['frustration', /\b(frustrat\w*|annoy\w*|ridiculous|useless|waste of (time|tokens)|terrible|awful|hate (this|it)|fed up|sick of|give up|so slow|too slow|takes (forever|too long))\b|\bfor the (second|third|fourth|last) time\b|\bi (already|just) (told|said|asked|gave)\b|\bnot what i (asked|wanted|meant|expected)\b|\bi (didn'?t|did not) (ask|want|say)\b|\bagain\?!|\?!{1,}|!{3,}/i],
  ['bug', /\b(not working|doesn'?t work|does not work|didn'?t work|isn'?t working|won'?t (load|open|start|run)|broken|crashed|stuck on|keeps? (failing|crashing|asking|repeating)|error again|same (error|problem|issue))\b/i],
  ['asking-too-much', /\bwhy (are you|do you keep|is it) (asking|repeating)\b|\btoo many questions\b|\bstop asking\b|\bjust (do|build|make) it\b/i],
  ['lost-ar', /مش فاهم|مفهمتش|مش عارف|ما فهمت|لا أفهم|لا افهم|تايه|ضايع|محتار|محير|مش منطقي|غير منطقي|مش مفهوم|ايه ده|إيه ده|ما معنى|مش واضح|غير واضح/],
  ['frustration-ar', /زهقت|زهق|تعبت|مستفز|سيء جدا|سيئ جدا|ضيعت وقتي|مضيعة للوقت|كام مرة|قلتلك|قلت لك|مش ده اللي|ليس هذا ما|ليه بتسأل|لماذا تسأل/],
  ['bug-ar', /مش شغال|لا يعمل|لا تعمل|مش بيشتغل|معلق|هنج|تعطل|بيقف|نفس الخطأ|نفس المشكلة|غلط/],
];

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function readJson(p) { const t = read(p); if (!t) return null; try { return JSON.parse(t); } catch { return null; } }

export function redact(s) {
  return s
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+/gi, '[url]')
    .replace(/\b[A-Za-z]:\\[^\s"'<>|]*/g, '[path]')
    .replace(/(^|\s)\/(?:[\w.-]+\/){1,}[\w.-]*/g, '$1[path]')
    .replace(/\b(sk|pk|ghp|gho|xox[abp]|AIza|AKIA)[-_A-Za-z0-9]{12,}\b/g, '[secret]')
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, '[secret]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classify(text) {
  const hits = [];
  for (const [name, re] of PATTERNS) {
    const m = text.match(re);
    if (m) hits.push({ category: name.replace(/-ar$/, ''), phrase: m[0].slice(0, 60) });
  }
  return hits;
}

function main(input) {
  const opt = readJson(OPTIN);
  if (!opt || opt.enabled !== true) return null;                       // 1. opt-in
  const cwd = input.cwd || process.cwd();
  const stateFile = path.join(cwd, 'design-pipeline-state.json');
  if (!fs.existsSync(stateFile)) return null;                          // 2. pipeline active here
  const prompt = typeof input.prompt === 'string' ? input.prompt : '';
  if (!prompt || prompt.length > MAX_LEN) return null;                 // 3. short messages only
  if (/^\s*\//.test(prompt)) return null;                              // slash commands are not feedback
  const hits = classify(prompt);
  if (!hits.length) return null;                                       // 4. matches a pattern

  const state = readJson(stateFile) || {};
  let version = null;
  try { version = JSON.parse(read(path.join(process.env.CLAUDE_PLUGIN_ROOT || '', '.claude-plugin', 'plugin.json')) || '{}').version || null; } catch {}
  const entry = {
    time: new Date().toISOString(),
    plugin_version: version,
    stage: state.stage || null,
    review_round: state.review_round ?? null,
    platforms: state.scope && Array.isArray(state.scope.platforms) ? state.scope.platforms : null,
    categories: [...new Set(hits.map(h => h.category))],
    matched: hits.map(h => h.phrase),
    message: redact(prompt).slice(0, KEEP),
    sent: false,
  };
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n', 'utf8');

  // At most one visible notice every ten minutes, so it is never noisy.
  let notify = true;
  try { const last = Number(read(THROTTLE)); if (last && Date.now() - last < NOTICE_EVERY_MS) notify = false; } catch {}
  if (notify) {
    try { fs.writeFileSync(THROTTLE, String(Date.now())); } catch {}
    return { systemMessage: 'Design-automation: that sounded like something wasn\'t clear. A short note was saved on this computer only. Review or send it with /design-feedback, or turn this off with /design-feedback disable.' };
  }
  return null;
}

// Run as a hook only when executed directly (so the tests can import the helpers).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    try {
      const out = main(JSON.parse(raw || '{}'));
      if (out) process.stdout.write(JSON.stringify(out));
    } catch { /* a feedback helper must never break the user's session */ }
    process.exit(0);
  });
}
