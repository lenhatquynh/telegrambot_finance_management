# Hướng dẫn cài đặt và sử dụng Telegram Bot quản lý tài chính

## 1. Giới thiệu

Telegram bot giúp bạn quản lý tài chính cá nhân, lưu trữ dữ liệu trên Google Sheets và cung cấp báo cáo theo thời gian.

Bạn có thể:

- Thêm giao dịch thu/chi.
- Xem báo cáo theo tuần, tháng.
- Xóa giao dịch gần nhất hoặc toàn bộ dữ liệu.

---

## 2. Cài đặt

### 2.1. Tạo Telegram Bot

1. Mở ứng dụng Telegram, tìm kiếm **BotFather**.
2. Gửi lệnh `/newbot` và làm theo hướng dẫn để tạo bot mới.
3. Sau khi hoàn tất, bạn sẽ nhận được **TOKEN** để kết nối bot.

### 2.2. Tạo Google Sheets

1. Truy cập Google Sheets và tạo một bảng tính mới.
2. Đổi tên sheet (ví dụ: Finance Data).
3. Tạo các cột: **Thời gian**, **Id**, **Tên**, **Loại**, **Số tiền**, **Mô tả**.
4. Lấy Sheet ID từ URL

   Ví dụ URL:

https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit#gid=0

Sheet ID là phần: **1A2B3C4D5E6F7G8H9I0J**

### 2.3. Triển khai Google Apps Script

1. Mở Google Sheets > Extensions > Apps Script.
2. Copy/paste code trong code.gs

### 2.4 Thay thế:

- `YOUR_TELEGRAM_BOT_TOKEN` bằng token bot Telegram.
- `YOUR_SHEET_ID` bằng ID Google Sheets.

### 2.5 Triển khai

**Deploy** → **New deployment** → **Web app**:

- **Thực thi bằng tên**: Tôi
- **Người có quyền truy cập**: Bất kỳ ai
- Sau đó nhấn triển khai và cấp quyền

#### Lấy **Web App URL** sau khi triển khai(copy cả đoạn link nhé).

### 2.6 Cấu Hình Webhook\*\*

Truy cập URL sau để kết nối webhook:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEB_APP_URL>
```

**Ví dụ:**

```
https://api.telegram.org/bot123456789:ABCdefGhIJKlmNoPQRstuVWxyZ/setWebhook?url=https://script.google.com/macros/s/AKfycbxEXAMPLE/exec
```

---

---

## 3. Sử dụng

### 3.1. Bắt đầu sử dụng bot

Gửi lệnh `/start` để nhận hướng dẫn cơ bản.

### 3.2. Thêm giao dịch

Nhập giao dịch theo cú pháp:

```
<số tiền> <thu/chi> <mô tả>
```

#### Ví dụ:

- **Thu nhập:** `10tr thu Lương tháng 1`
- **Chi tiêu:** `256k chi Mua sách giáo khoa`

### 3.3. Xem báo cáo

- **Báo cáo tổng:** `/report`
- **Báo cáo tháng:** `/report 01/2025`
- **Báo cáo tuần:** `/report 04/01/2025`
- **Sắp xếp tăng/giảm:** Thêm `az` (tăng) hoặc `za` (giảm).
  - Ví dụ: `/report az`, `/report 01/2025 za`.

#### Ví dụ chi tiết:

1. Xem toàn bộ giao dịch, sắp xếp tăng dần: `/report az`
2. Báo cáo chi tiêu tháng 1 năm 2025: `/report 01/2025`
3. Báo cáo tuần chứa ngày 04/01/2025: `/report 04/01/2025 za`.

### 3.4. Xóa giao dịch

- **Xóa giao dịch gần nhất:** Gửi lệnh `/undo`.
- **Xóa toàn bộ dữ liệu:** Gửi lệnh `/reset`.

---

## 4. Ví dụ cụ thể

### Thêm giao dịch

- Thu nhập: `13058k thu Tiền thưởng cuối năm`
- Chi tiêu: `69k chi mua dầu ăn`

### Báo cáo chi tiết

1. Báo cáo tổng, sắp xếp theo thứ tự giảm dần:

   ```
   /report za
   ```

   Kết quả:

   ```
   Báo cáo tổng:
   Tổng thu: 1,000,000 VND
   Tổng chi: 300,000 VND
   Cân đối: 700,000 VND

   Giao dịch thu nhập cụ thể:
   + 1,000,000 VND: Tiền thưởng cuối năm (01/01/2025 10:00)

   Giao dịch chi tiêu cụ thể:
   - 300,000 VND: Mua thực phẩm (01/01/2025 14:00)
   ```

2. Báo cáo tháng 1/2025:
   ```
   /report 01/2025
   ```

### Xóa giao dịch

- Xóa giao dịch gần nhất: `/undo`.
- Xóa tất cả dữ liệu: `/reset`.

---

## 5. Lưu ý

_Quy ước: 1k = 1000VND, 1tr = 1000000VND_

_Không nhập 5tr2 hoặc lẻ, nếu lẻ thì nhập 5200k_

_Google Sheets không được xóa hoặc thay đổi ID._

_Tài khoản Gmail cần cấp quyền cho Google Sheets khi cài Webhook._

_Đảm bảo bot Telegram đã được kết nối đúng Webhook._

- **Webhook không hoạt động:** Kiểm tra lại TOKEN và URL.
- **Không lưu dữ liệu:** Kiểm tra Sheet ID và quyền truy cập.

**_Cần tư vấn liên hệ t.me/nothing3272_**

---
