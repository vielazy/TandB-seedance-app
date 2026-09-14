# Seedance Fashion Studio

Ứng dụng tạo hàng loạt video AI trên 79AI: đưa vào **ảnh nhân vật**, **ảnh trang phục** và **video mẫu**, app sẽ dựng ra video mới giữ nguyên khuôn mặt, mặc đúng bộ đồ và chuyển động theo video mẫu.

---

# Hướng dẫn cho người mới

Phần này viết cho người chưa từng dùng terminal. Làm đúng thứ tự, mất khoảng 10 phút cho lần đầu.

## Bước 1 — Cài Node.js

App cần Node.js mới chạy được. Máy chưa có thì tải về:

👉 **https://nodejs.org** — bấm nút tải bản **LTS**, cài như mọi phần mềm khác (Next → Next → Finish).

> Cần Node.js phiên bản **20.19 trở lên**. Bản LTS trên trang chủ luôn thoả điều kiện này.

Kiểm tra đã cài xong chưa: mở **Command Prompt** (bấm phím Windows, gõ `cmd`, Enter), gõ:

```
node --version
```

Hiện ra một dãy số kiểu `v22.11.0` là được. Báo lỗi "không phải là lệnh" thì cài lại và **khởi động lại máy**.

## Bước 2 — Tải app về

Vào trang app trên GitHub, bấm nút xanh **`Code`** → **`Download ZIP`**.

Giải nén file ZIP ra một thư mục dễ tìm, ví dụ `D:\seedance`. Sau khi giải nén, bên trong thư mục phải nhìn thấy file `package.json`.

## Bước 3 — Mở Command Prompt tại đúng thư mục

Mở thư mục vừa giải nén trong File Explorer. Bấm vào **thanh địa chỉ** ở trên cùng (chỗ hiện đường dẫn), gõ đè lên đó chữ:

```
cmd
```

rồi Enter. Một cửa sổ đen hiện ra, và nó đang đứng sẵn ở đúng thư mục app.

## Bước 4 — Cài đặt (chỉ làm 1 lần)

Trong cửa sổ đen đó, gõ:

```
npm install
```

Chờ khoảng 30 giây. Chạy xong sẽ thấy dòng kiểu `added 402 packages`. Có vài dòng chữ vàng `warn` là bình thường, không phải lỗi.

## Bước 5 — Chạy app

```
npm run dev
```

Màn hình hiện ra:

```
➜  Local:   http://localhost:5173/
```

Mở trình duyệt (Chrome, Edge đều được) vào địa chỉ **http://localhost:5173**

⚠️ **Giữ nguyên cửa sổ đen, đừng đóng.** Đóng nó là app tắt. Muốn dùng lại sau này thì chỉ cần làm lại **Bước 3 và Bước 5**, không phải cài lại nữa.

## Bước 6 — Nhập Access Token 79AI

App cần token để nối vào tài khoản 79AI.

1. Mở **https://79ai.net** và **đăng nhập**. Chưa đăng nhập thì không có token nào cả.
2. Vào **https://79ai.net/settings/tokens** → bấm **Tạo access token** → copy chuỗi vừa tạo.
3. Quay lại app, bấm nút **`Liên kết 79AI (Nhập Token)`** ở góc trên bên phải.
4. Dán token vào ô → bấm **`Lưu & Đồng bộ`**.

Nút ở góc phải chuyển thành **`79AI: Đã kết nối`** màu xanh là xong.

---

# Cách dùng

Các panel bên trái, làm từ trên xuống:

| Panel | Việc cần làm |
|---|---|
| **0 · Project** | Chọn dự án để chứa video. Dùng chung tài khoản với người khác thì nên chọn project riêng cho khỏi lẫn. |
| **1 · Ảnh nhân vật** | Tải lên 1 ảnh — app lấy **khuôn mặt và kiểu tóc** từ đây (`@image1`). |
| **2 · Ảnh thời trang** | Tải lên 1 hoặc nhiều ảnh — app lấy **bộ đồ** từ đây (`@image2`). |
| **3 · Video tham chiếu** | Tải lên video mẫu — app bắt chước **chuyển động, góc quay, bối cảnh** (`@video1`). |
| **4 · Model video** | Chọn model và chất lượng. Góc phải panel hiện **giá credit cho mỗi video**. |
| **5 · Cấu hình chạy** | Thời lượng, random ảnh, thông báo Telegram. |

Xong thì sang cột phải, đặt **Số video tối đa** rồi bấm **`Tạo phiên mới`**.

## ✂️ Cắt video tham chiếu

Model **chỉ nhận video mẫu tối đa 15,2 giây**. Video dài hơn phải cắt trước.

Ở panel 3, di chuột lên video → bấm **biểu tượng cái kéo**. Chọn một trong 5 kiểu:

| Kiểu | Dùng khi |
|---|---|
| **N giây đầu** | Lấy đoạn mở đầu |
| **Từ A → B** | Biết chính xác cần đoạn từ giây nào tới giây nào |
| **N giây cuối** | Lấy đoạn kết |
| **Bỏ đầu / bỏ cuối** | Cắt bớt hai đầu, giữ khúc giữa |
| **Ngẫu nhiên** | Mỗi lần bấm lấy một đoạn khác nhau |

Bấm **`Cắt video`**, chờ vài giây. Video trong panel 3 sẽ được thay bằng bản đã cắt.

---

# Gặp lỗi thì làm gì

### "Vi phạm chính sách bản quyền IP"

**Bấm `Tạo lại` trên thẻ video đó.** Bộ lọc của 79AI thỉnh thoảng chặn nhầm — cùng một nội dung, lúc chạy lúc không. **Job lỗi được hoàn lại credit**, thử lại không mất tiền. Thử 2–3 lần vẫn lỗi thì mới đổi ảnh hoặc rút ngắn prompt.

### "Media job timeout"

Video render lâu hơn thời gian chờ. Vào panel 5, tăng **Timeout tạo video** lên (mặc định 3600 giây = 1 tiếng).

### Nút "Tạo phiên mới" bị mờ, không bấm được

Bên dưới nút có dòng chữ vàng nói còn thiếu gì — thường là chưa có ảnh nhân vật ở panel 1.

### App không mở được ở localhost:5173

Kiểm tra cửa sổ đen còn đang chạy không. Lỡ đóng thì làm lại Bước 3 và Bước 5.

### Chưa nhập token thì sao?

App vẫn mở được và xem được danh sách model, nhưng **không tạo được video thật**.

---

# Lưu ý khi dùng chung tài khoản

Nhiều người dùng chung một access token nghĩa là **chung một tài khoản 79AI**:

- **Chung túi credit** — mỗi video bất kỳ ai tạo đều trừ vào cùng một số dư.
- **Chung thư viện** — ảnh và video của mọi người nằm lẫn nhau. Nên mỗi người chọn một project riêng ở panel 0.
- **Không thu hồi riêng lẻ được** — muốn cắt quyền một người thì phải đổi token cho tất cả. Trang `79ai.net/settings/tokens` cho tạo nhiều token, mỗi người một cái, thu hồi riêng được.

⚠️ **Token giống như mật khẩu.** Đừng gửi qua nơi công khai, đừng chụp màn hình đăng lên mạng.

---

# Dành cho người đọc code

Hợp đồng API thật của 79AI (upload, render/cắt video, tạo video), ràng buộc của model và cách kiểm bằng dòng lệnh: xem [`docs/API.md`](docs/API.md).
