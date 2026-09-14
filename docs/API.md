# Ghi chú kỹ thuật

Phần này dành cho người đọc code. Người dùng bình thường xem [README](../README.md).

## 📡 API 79AI — hợp đồng thật

Dò trực tiếp từ bundle của `79ai.net` và kiểm lại bằng request thật (09/2026).

### Upload media — Files Manager

```
POST https://v2.api.gommo.net/ai/upload/{image|video|audio}
Content-Type: multipart/form-data
  access_token, domain
  file        ← CHỈ cho ảnh
  video_file  ← cho video và audio
  project_id, file_name, size
  category    ← tuỳ chọn, chỉ ảnh
```

- HTTP `413` = *"File quá to vượt quá 50MB hệ thống cho phép"*.
- Phản hồi: URL nằm ở `data.url` / `imageInfo.url` / `videoInfo.url` — hoặc `download_url`, `file_url`, `resolutions[0].url`.
- Endpoint mở CORS cho mọi origin (kể cả `null` của Electron) nên gọi thẳng, không cần proxy.

### Cắt / render video

```
POST https://api.gommo.net/api/apps/go-mmo/ai_spaces/render
Content-Type: application/x-www-form-urlencoded
  access_token, domain, project_id
  plan = JSON.stringify(<render plan>)
```

Plan do `lib/cutVideo.js` dựng (schema `version: 1`, gồm `out`, `export`, `inputs`, `videoClips`, `audioClips`). Trả `{ url, sizeMB }`.

### Tạo video

```
POST https://api.gommo.net/api/apps/go-mmo/ai/create-video
```

Gửi `multipart/form-data` khi có `video_file` / `video_files[]` / `audio_files[]`, còn lại dùng `x-www-form-urlencoded`. Các field media:

| Field | Ý nghĩa |
|---|---|
| ✅ `refs[i][type]` + `refs[i][url]` | **cách duy nhất chạy được.** `type` = `image`/`video`/`audio`; thứ tự trong mảng quyết định `@image1`, `@image2`, `@video1`… |
| ❌ `references[i][url]` + `video_urls[i][url]` | backend nhận job rồi **luôn báo lỗi** `#vid_input_or_prompt` — *"Input hoặc prompt không được chấp nhận. Vui lòng đổi file tham chiếu"* |
| `images[i][url]`, `images[i][id_base]` | ảnh thành phần |
| `video_files[]`, `audio_files[]` | media upload thẳng trong request (multipart) |
| `start_seconds`, `end_seconds` | cắt video nguồn ngay trong lệnh tạo |
| `video_seconds`, `multi_shots`, `multi_prompt[i][prompt\|duration]`, `cameos`, `remix_url`, `template_id` | tuỳ chọn khác |

Kết luận rút ra từ hai lần chạy A/B thật (`seedance_20_pro_edit` và `seedance_20_mini`, hai bộ
media khác nhau): định dạng cũ hỏng **cả hai lần**, `refs[]` thành công và trả về video hoàn chỉnh.

### Ràng buộc của Seedance 2.0 - Omni

Đọc từ `configs.reference` trong `/ai/models`:

- Tối đa 10 tham chiếu: 6 ảnh, 2 video, 2 audio (notices khuyến nghị 3 ảnh + 1 video + 1 audio).
- **Video tham chiếu tối đa 15.200 ms**, audio tối đa 15.000 ms → video dài hơn phải cắt trước.

## ✂️ Cắt video tham chiếu

Panel *3 · Video tham chiếu* → nút kéo trên mỗi video. Năm chế độ port nguyên từ node "Cut Video" của 79ai.net:

| Chế độ | Tham số |
|---|---|
| `fix` — N giây đầu | `duration` |
| `range` — từ A → B | `start_time`, `end_time` |
| `last` — N giây cuối | `duration` |
| `trim` — bỏ đầu / bỏ cuối | `trim_start`, `trim_end` |
| `random` — ngẫu nhiên | `rand_range_start/end`, `rand_dur_min/max` |

Thời lượng video đo phía client bằng thẻ `<video>`; vướng CORS thì tải qua `media-proxy.gommo.net` rồi đo lại.

### Kiểm API bằng dòng lệnh

```bash
node scripts/check-79ai.mjs <ACCESS_TOKEN>          # upload + cắt thật
node scripts/check-79ai.mjs <ACCESS_TOKEN> --no-cut # chỉ kiểm upload
```
