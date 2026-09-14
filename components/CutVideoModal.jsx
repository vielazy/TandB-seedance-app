import React from 'react';
import { Chip, Ghost, Cta, NumberField, Toggle } from './Ui.jsx';
import {
  CUT_MODES,
  DEFAULT_CUT_DATA,
  REFERENCE_MAX_SECONDS,
  cutVideo,
  probeVideoMeta,
  resolveCutRange,
} from '../lib/cutVideo.js';
import { formatSeconds } from '../utils/format.js';

/**
 * Cắt video tham chiếu trước khi đưa vào @video1.
 * onDone({ url, seconds }) — video đã cắt, thay thế hoặc thêm vào danh sách.
 */
export default function CutVideoModal({ isOpen, onClose, video, onDone }) {
  const [data, setData] = React.useState(DEFAULT_CUT_DATA);
  const [meta, setMeta] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [logs, setLogs] = React.useState([]);

  const sourceUrl = video?.url || '';

  React.useEffect(() => {
    if (!isOpen || !sourceUrl) return undefined;
    let alive = true;
    setMeta(null);
    setError('');
    setLogs([]);
    probeVideoMeta(sourceUrl).then((m) => {
      if (!alive) return;
      const total = m.duration || Number(video?.seconds) || 0;
      setMeta({ ...m, duration: total });
      setData((prev) => ({
        ...prev,
        duration: Math.min(REFERENCE_MAX_SECONDS, total || REFERENCE_MAX_SECONDS),
        end_time: Math.min(REFERENCE_MAX_SECONDS, total || REFERENCE_MAX_SECONDS),
        rand_range_end: total || 0,
      }));
    });
    return () => {
      alive = false;
    };
  }, [isOpen, sourceUrl, video?.seconds]);

  if (!isOpen) return null;

  const total = meta?.duration || Number(video?.seconds) || 0;
  const preview = total > 0 ? resolveCutRange(data, total) : null;
  const tooLong = preview ? preview.duration > REFERENCE_MAX_SECONDS : false;
  const patch = (key) => (value) => setData((prev) => ({ ...prev, [key]: value }));

  const run = async () => {
    setBusy(true);
    setError('');
    setLogs([]);
    try {
      const res = await cutVideo({
        url: sourceUrl,
        data,
        knownSeconds: total,
        onLog: (level, message) => setLogs((prev) => [...prev, { level, message }]),
      });
      onDone({
        url: res.url,
        seconds: res.seconds,
        name: `cut_${data.cut_mode}_${res.seconds}s.mp4`,
      });
      onClose();
    } catch (e) {
      setError(e?.message || 'Cắt video thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="ph ph-scissors text-[#c7ff44]" />
            Cắt video tham chiếu
          </h2>
          <Ghost icon="ph-x" onClick={onClose} ariaLabel="Đóng" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto sb-scroll space-y-4">
          <div className="flex gap-3">
            <video
              src={sourceUrl}
              className="h-28 w-48 rounded-xl bg-black object-contain"
              preload="metadata"
              muted
              controls
            />
            <div className="text-xs text-[#b0b0b0] space-y-1">
              <p className="truncate max-w-[320px]" title={video?.name}>
                {video?.name || 'video.mp4'}
              </p>
              <p>
                Gốc:{' '}
                {total > 0
                  ? `${formatSeconds(total)}${meta?.width ? ` · ${meta.width}×${meta.height}` : ''}`
                  : 'đang đo…'}
              </p>
              <p className="text-[#777777]">Seedance 2.0 nhận video ref tối đa {REFERENCE_MAX_SECONDS}s.</p>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {CUT_MODES.map((m) => (
                <Chip
                  key={m.type}
                  active={data.cut_mode === m.type}
                  onClick={() => setData((prev) => ({ ...prev, cut_mode: m.type }))}
                >
                  {m.name}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-[#777777]">
              {CUT_MODES.find((m) => m.type === data.cut_mode)?.hint}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {data.cut_mode === 'fix' || data.cut_mode === 'last' ? (
              <NumberField label="Thời lượng (s)" value={data.duration} onChange={patch('duration')} min={0.1} />
            ) : null}
            {data.cut_mode === 'range' ? (
              <>
                <NumberField label="Bắt đầu (s)" value={data.start_time} onChange={patch('start_time')} min={0} />
                <NumberField label="Kết thúc (s)" value={data.end_time} onChange={patch('end_time')} min={0} />
              </>
            ) : null}
            {data.cut_mode === 'trim' ? (
              <>
                <NumberField label="Cắt đầu (s)" value={data.trim_start} onChange={patch('trim_start')} min={0} />
                <NumberField label="Cắt cuối (s)" value={data.trim_end} onChange={patch('trim_end')} min={0} />
              </>
            ) : null}
            {data.cut_mode === 'random' ? (
              <>
                <NumberField
                  label="Khoảng từ (s)"
                  value={data.rand_range_start}
                  onChange={patch('rand_range_start')}
                  min={0}
                />
                <NumberField
                  label="Khoảng đến (s)"
                  value={data.rand_range_end}
                  onChange={patch('rand_range_end')}
                  min={0}
                />
                <NumberField
                  label="Dài tối thiểu (s)"
                  value={data.rand_dur_min}
                  onChange={patch('rand_dur_min')}
                  min={0.1}
                />
                <NumberField
                  label="Dài tối đa (s)"
                  value={data.rand_dur_max}
                  onChange={patch('rand_dur_max')}
                  min={0.1}
                />
              </>
            ) : null}
          </div>

          <Toggle
            label="Giữ âm thanh"
            checked={data.keep_audio !== false}
            onChange={(v) => setData((prev) => ({ ...prev, keep_audio: v }))}
          />

          {preview ? (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                tooLong ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-black text-[#c7ff44]'
              }`}
            >
              Sẽ lấy {preview.start.toFixed(2)}s → {(preview.start + preview.duration).toFixed(2)}s (
              {preview.duration.toFixed(2)}s)
              {tooLong ? ` — vượt ${REFERENCE_MAX_SECONDS}s, model có thể từ chối.` : ''}
              {data.cut_mode === 'random' ? ' — mỗi lần bấm ra đoạn khác.' : ''}
            </div>
          ) : null}

          {logs.length ? (
            <div className="rounded-xl bg-black p-3 text-[11px] font-mono space-y-0.5">
              {logs.map((l, i) => (
                <p key={i} className={l.level === 'success' ? 'text-[#c7ff44]' : 'text-[#b0b0b0]'}>
                  {l.message}
                </p>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">{error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
          <Ghost onClick={onClose} disabled={busy}>
            Huỷ
          </Ghost>
          <Cta icon="ph-scissors" onClick={run} disabled={busy || !(total > 0)}>
            {busy ? 'Đang cắt…' : 'Cắt video'}
          </Cta>
        </div>
      </div>
    </div>
  );
}
