/**
 * Cắt video tham chiếu — port từ node "Cut Video" của 79ai.net.
 *
 * Luồng giống hệt bản gốc:
 *   1. Đo metadata video bằng thẻ <video> (fallback qua media-proxy nếu vướng CORS).
 *   2. Từ cut_mode + tham số → tính (start, duration).
 *   3. Dựng render plan rồi POST ai_spaces/render, nhận URL video đã cắt.
 */

import { bridgeCall } from './api.js';
import { getApiProjectId } from './projectState.js';

const MEDIA_PROXY = 'https://media-proxy.gommo.net/?url=';

/** Giới hạn video tham chiếu của Seedance 2.0 Omni (configs.reference.constraints.video). */
export const REFERENCE_MAX_SECONDS = 15.2;

export const CUT_MODES = [
  { type: 'fix', name: 'N giây đầu', hint: 'Lấy từ giây 0 đến N.' },
  { type: 'range', name: 'Từ A → B', hint: 'Lấy đoạn giữa hai mốc thời gian.' },
  { type: 'last', name: 'N giây cuối', hint: 'Lấy N giây cuối cùng.' },
  { type: 'trim', name: 'Bỏ đầu / bỏ cuối', hint: 'Cắt bớt ở hai đầu, giữ phần giữa.' },
  {
    type: 'random',
    name: 'Ngẫu nhiên',
    hint: 'Cắt ngẫu nhiên trong khoảng [Range Start → End], thời lượng random [Min → Max]. Mỗi lần chạy ra kết quả khác.',
  },
];

export const DEFAULT_CUT_DATA = {
  cut_mode: 'fix',
  duration: 15,
  start_time: 0,
  end_time: 10,
  trim_start: 0,
  trim_end: 0,
  rand_range_start: 0,
  rand_range_end: 0,
  rand_dur_min: 1,
  rand_dur_max: 5,
  keep_audio: true,
};

function probeElement(src) {
  return new Promise((resolve) => {
    try {
      const el = document.createElement('video');
      el.preload = 'metadata';
      el.muted = true;
      const cleanup = () => {
        try {
          el.src = '';
          el.load();
        } catch {
          /* noop */
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 6000);
      el.onloadedmetadata = () => {
        clearTimeout(timer);
        const seconds = el.duration && Number.isFinite(el.duration) ? el.duration : 0;
        const meta =
          seconds > 0
            ? { duration: seconds, width: el.videoWidth || 0, height: el.videoHeight || 0 }
            : null;
        cleanup();
        resolve(meta);
      };
      el.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve(null);
      };
      el.src = src;
    } catch {
      resolve(null);
    }
  });
}

/** Đo duration + kích thước video. Vướng CORS thì tải qua media-proxy rồi đo lại. */
export async function probeVideoMeta(url) {
  const direct = await probeElement(url);
  if (direct) return direct;
  try {
    const res = await fetch(MEDIA_PROXY + encodeURIComponent(url), { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const viaProxy = await probeElement(objUrl);
      URL.revokeObjectURL(objUrl);
      if (viaProxy) return viaProxy;
    }
  } catch {
    /* noop */
  }
  return { duration: 0, width: 0, height: 0 };
}

/**
 * cut_mode + tham số + tổng thời lượng → { start, duration }.
 * Giữ nguyên công thức của node gốc, kể cả các cận 0.1s.
 */
export function resolveCutRange(data, totalSeconds) {
  const mode = data?.cut_mode || 'fix';
  const total = Number(totalSeconds) || 0;
  const num = (key, fallback) => Number(data?.[key]) || fallback;

  if (mode === 'range') {
    const start = Math.max(0, Math.min(num('start_time', 0), total));
    const end = Math.max(start + 0.1, Math.min(num('end_time', 10), total));
    return { start, duration: end - start };
  }

  if (mode === 'last') {
    const want = Math.min(Math.max(0.1, num('duration', 5)), total);
    return { start: Math.max(0, total - want), duration: want };
  }

  if (mode === 'trim') {
    const head = Math.max(0, num('trim_start', 0));
    const tail = Math.max(0, num('trim_end', 0));
    return {
      start: Math.min(head, total - 0.1),
      duration: Math.max(0.1, total - head - tail),
    };
  }

  if (mode === 'random') {
    const rangeStart = Math.max(0, Math.min(num('rand_range_start', 0), total));
    const rangeEnd = Math.min(total, Math.max(rangeStart + 0.1, num('rand_range_end', total)));
    const wantMin = Math.max(0.1, num('rand_dur_min', 1));
    const wantMax = Math.max(wantMin, num('rand_dur_max', 5));
    const span = rangeEnd - rangeStart;
    const durMax = Math.min(wantMax, span);
    const durMin = Math.min(wantMin, durMax);
    let duration = durMin + Math.random() * (durMax - durMin);
    duration = Math.round(duration * 100) / 100;
    const latestStart = rangeEnd - duration;
    let start = rangeStart + Math.random() * Math.max(0, latestStart - rangeStart);
    start = Math.round(start * 100) / 100;
    return { start, duration };
  }

  // 'fix' — mặc định
  return { start: 0, duration: Math.min(Math.max(0.1, num('duration', 5)), total) };
}

/** Dựng render plan cho ai_spaces/render (schema version 1). */
export function buildCutPlan({ url, start, duration, width, height, keepAudio = true }) {
  const w = width || 1080;
  const h = height || 1920;
  const isPortrait = h > w;
  const isSquare = w === h;
  // Bản gốc dùng đúng hai hằng số này: dọc = 256/81, vuông/ngang = 1.
  const scale = isPortrait ? 256 / 81 : isSquare ? 1 : 1;
  const ss = Number(start.toFixed(3));
  const t = Number(duration.toFixed(3));

  return {
    version: 1,
    selection: null,
    out: {
      width: w,
      height: h,
      fps: 30,
      duration,
      resolution: `${Math.min(w, h)}p`,
      ratio: isPortrait ? '9:16' : isSquare ? '1:1' : '16:9',
    },
    export: {
      type: 'video',
      mode: 'custom',
      profile: 'high',
      scaler: 'bicubic',
      shadowQuality: 'high',
      shadowAlg: 'gaussian',
      supersample2x: false,
    },
    inputs: [{ key: 'video_0', type: 'video', url }],
    videoClips: [
      {
        inKey: 'video_0',
        at: 0,
        ss,
        t,
        volume: keepAudio ? 1 : 0,
        speed: 1,
        order: 0,
        pos: { x: 50, y: 50 },
        scale,
        rotation: 0,
        opacity: 1,
      },
    ],
    audioClips: keepAudio
      ? [{ inKey: 'video_0', at: 0, ss, t, volume: 1, fromVideoAudio: true, speed: 1, type: 'VIDEO' }]
      : [],
    imageClips: [],
    textClips: [],
    filterClips: [],
  };
}

/**
 * Cắt một video theo cấu hình. onLog(level, message) để hiện tiến trình.
 * Trả { url, seconds, start, sizeMB } — URL đã cắt dùng ngay làm @video1.
 */
export async function cutVideo({ url, data, knownSeconds = 0, onLog }) {
  const log = (level, message) => onLog?.(level, message);
  const src = String(url || '').trim();
  if (!src) throw new Error('Chưa có video đầu vào');

  log('info', '✂ Đang đọc metadata video…');
  const meta = await probeVideoMeta(src);
  const total = meta.duration || Number(knownSeconds) || 0;
  if (total <= 0) throw new Error('Không đọc được thời lượng video — thử "Dán link" rồi nhập tay.');
  const width = meta.width || 1080;
  const height = meta.height || 1920;
  log('info', `✂ Video: ${total.toFixed(1)}s, ${width}×${height}`);

  const { start, duration } = resolveCutRange(data, total);
  if (!(duration > 0)) throw new Error('Khoảng cắt không hợp lệ — kiểm tra lại các mốc thời gian.');
  log(
    'info',
    `✂ Mode ${data?.cut_mode || 'fix'}: ${start.toFixed(2)}s → ${(start + duration).toFixed(2)}s (${duration.toFixed(2)}s)`,
  );

  const plan = buildCutPlan({
    url: src,
    start,
    duration,
    width,
    height,
    keepAudio: data?.keep_audio !== false,
  });

  const res = await bridgeCall('media.cut_video', {
    plan,
    project_id: getApiProjectId() || 'default',
  });
  const outUrl = res?.url || res?.data?.url || '';
  if (!outUrl) throw new Error(res?.message || 'Cắt video thất bại (không có URL)');
  log('success', `✅ Cắt xong — ${res?.sizeMB || '?'} MB`);

  return { url: outUrl, seconds: Math.round(duration * 100) / 100, start, sizeMB: res?.sizeMB ?? null };
}

export default { CUT_MODES, DEFAULT_CUT_DATA, cutVideo, resolveCutRange, buildCutPlan, probeVideoMeta };
