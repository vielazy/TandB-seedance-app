# Seedance Fashion Studio (TandB-seedance-app)

Ứng dụng studio AI chuyên nghiệp hỗ trợ ghép ảnh nhân vật, ảnh thời trang và video tham chiếu để tạo hàng loạt video Seedance với quản lý phiên, storyboard grid, luồng đồng thời và tích hợp API 79AI / Gommo.

## ✨ Tính năng chính

- **Nhập ảnh nhân vật (@image1):** Khóa diện mạo, đường nét khuôn mặt, kiểu tóc và màu da.
- **Nhập ảnh thời trang (@image2):** Khóa trang phục, phụ kiện, chất liệu vải và giày dép.
- **Nhập video tham chiếu (@video1):** Khóa chuyển động nhân vật, góc quay camera, bối cảnh và nhịp điệu.
- **Tích hợp 79AI:** Hỗ trợ nhập Access Token và kết nối trực tiếp với backend 79AI (`79ai.net` / `api.gommo.net`).
- **Storyboard Grid:** Quản lý hàng loạt tác vụ theo phiên (session) với nhiều luồng song song, theo dõi tiến độ thời gian thực.
- **Chế độ Demo Offline:** Sẵn sàng chạy mô phỏng ngay cả khi chưa nhập token.

## 🚀 Hướng dẫn cài đặt và chạy trên Localhost

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Khởi chạy môi trường phát triển (Dev Server):**
   ```bash
   npm run dev
   ```

3. **Mở trình duyệt:**
   Truy cập `http://localhost:5173/` để sử dụng ứng dụng.

## 🔑 Cấu hình 79AI Access Token

1. Đăng nhập tài khoản trên [79ai.net](https://79ai.net) — chưa đăng nhập thì không có token nào cả.
2. Lấy token theo một trong hai cách:
   - **Nên dùng:** vào `https://79ai.net/settings/tokens` rồi bấm **"Tạo access token"**.
   - Hoặc nhấn `F12` -> tab **Console** -> chạy `localStorage.getItem('gommo_access_token')`.
3. Trên giao diện ứng dụng, bấm nút **"Liên kết 79AI"** ở góc trên bên phải, dán token và bấm **"Lưu & Đồng bộ"**.

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
| `refs[i][type]` + `refs[i][url]` | tham chiếu kèm loại (`image`/`video`/`audio`) — thứ tự quyết định `@image1`, `@video1`… |
| `references[i][url]` | tham chiếu chỉ có URL (app đang dùng) |
| `images[i][url]`, `images[i][id_base]` | ảnh thành phần |
| `video_urls[i][url]`, `audio_urls[i][url]` | media theo URL |
| `video_files[]`, `audio_files[]` | media upload thẳng trong request |
| `start_seconds`, `end_seconds` | cắt video nguồn ngay trong lệnh tạo |
| `video_seconds`, `multi_shots`, `multi_prompt[i][prompt\|duration]`, `cameos`, `remix_url`, `template_id` | tuỳ chọn khác |

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
