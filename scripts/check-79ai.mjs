/**
 * Kiểm hai API thật của 79AI bằng access token — không cần mở trình duyệt.
 *
 *   node scripts/check-79ai.mjs <ACCESS_TOKEN> [domain]
 *
 * Bước 1  upload  : POST https://v2.api.gommo.net/ai/upload/video  (field video_file)
 * Bước 2  cut     : POST .../ai_spaces/render                      (plan JSON)
 *
 * Bước 2 gọi dịch vụ render thật nên CÓ THỂ TRỪ CREDIT. Thêm --no-cut để chỉ chạy bước 1.
 */

import { buildCutPlan, resolveCutRange } from '../lib/cutVideo.js';

const [token, domainArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const skipCut = process.argv.includes('--no-cut');
const domain = domainArg || '79ai.net';

if (!token) {
  console.error('Thiếu access token. Dùng: node scripts/check-79ai.mjs <ACCESS_TOKEN> [domain]');
  process.exit(1);
}

const V2_API = 'https://v2.api.gommo.net';
const RENDER_API = 'https://api.gommo.net/api/apps/go-mmo/ai_spaces/render';
const GOMMO_API = 'https://api.gommo.net/api/apps/go-mmo';
const SAMPLE =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

function show(label, value) {
  console.log(`\n=== ${label}\n${typeof value === 'string' ? value : JSON.stringify(value, null, 1)}`);
}

async function listProjects() {
  const body = new URLSearchParams({ access_token: token, domain });
  const res = await fetch(`${GOMMO_API}/ai/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.json();
}

async function uploadVideo(buffer, filename) {
  const form = new FormData();
  form.append('access_token', token);
  form.append('domain', domain);
  form.append('video_file', new Blob([buffer], { type: 'video/mp4' }), filename);
  form.append('project_id', 'default');
  form.append('file_name', filename);
  form.append('size', String(buffer.byteLength));

  const res = await fetch(`${V2_API}/ai/upload/video`, { method: 'POST', body: form });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json };
}

async function render(plan, projectId) {
  const body = new URLSearchParams({
    access_token: token,
    domain,
    project_id: projectId || 'default',
    plan: JSON.stringify(plan),
  });
  const res = await fetch(RENDER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json };
}

const projects = await listProjects();
const rows = projects?.data || projects?.items || [];
show('Projects', Array.isArray(rows) ? rows.slice(0, 5) : projects);
const projectId = Array.isArray(rows) && rows[0] ? rows[0].id_base || rows[0].id : 'default';
console.log('→ dùng project_id:', projectId);

console.log('\nĐang tải video mẫu…');
const sample = Buffer.from(await (await fetch(SAMPLE)).arrayBuffer());
console.log(`→ ${(sample.byteLength / 1024).toFixed(0)} KB`);

const up = await uploadVideo(sample, 'check_cut_sample.mp4');
show(`Upload (HTTP ${up.status})`, up.json);

const info = up.json?.data || up.json?.videoInfo || up.json;
const uploadedUrl = info?.url || info?.download_url || info?.file_url || '';
console.log('→ URL sau upload:', uploadedUrl || '(KHÔNG CÓ — upload thất bại)');

if (skipCut) {
  console.log('\n--no-cut: bỏ qua bước render.');
  process.exit(uploadedUrl ? 0 : 1);
}

const source = uploadedUrl || SAMPLE;
const { start, duration } = resolveCutRange({ cut_mode: 'fix', duration: 5 }, 10);
const plan = buildCutPlan({ url: source, start, duration, width: 640, height: 360, keepAudio: true });
console.log(`\nCắt ${start}s → ${(start + duration).toFixed(2)}s từ ${source}`);

const cut = await render(plan, projectId);
show(`Render (HTTP ${cut.status})`, cut.json);
const outUrl = cut.json?.url || cut.json?.data?.url;
console.log('→ URL video đã cắt:', outUrl || '(KHÔNG CÓ)');
process.exit(outUrl ? 0 : 1);
