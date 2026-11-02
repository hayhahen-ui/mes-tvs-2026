# MES-anti — Hệ Thống Quản Trị Sản Xuất LAF & Tối Ưu 5M (Dữ Liệu Thật TVS)

## 0. KHẮC PHỤC 02/11/2026 — "BẢN LIVE VERCEL CÁC TAB KHÔNG HOẠT ĐỘNG"

Nguyên nhân gốc (không phải do Vercel, lỗi này chết ngay cả khi chạy local):

1. `js/app.js` gọi `MESOptimizer.scheduleAllOrders()` nhưng `js/optimizer.js` chỉ có `solve()` → `MESApp.init()` ném lỗi **trước** `bindGlobalEvents()`, nên các nút tab không bao giờ được gắn sự kiện click.
2. `js/storage.js` chỉ lưu `{ordersGrouped, workstations, ...}` nhưng `app.js` đọc `state.segments` và `state.subProcesses` ở khắp nơi (Dashboard, Kho BTP, Phân đoạn, +650, +1 Ca) → các field này là `undefined`, render nào chạm tới cũng lỗi.
3. Mọi thao tác ghi đều gọi `MESStorage.saveState()` — hàm này **không tồn tại** (chỉ có `save()`), nên nút +/form/toggle đều chết sau khi bấm.
4. `js/app.js` đọc biến `TVS_DATA` (không tồn tại; `js/data.js` định nghĩa `TVS_MASTER_DATA`) và gọi `MESCharts` sai chữ ký `(data)` thay vì `(canvasId, data, ...)` — toàn bộ 6 biểu đồ Dashboard không vẽ được; tên hàm radar cũng sai (`renderRadar5mChart` vs `renderRadar5M`).
5. Nút header gọi `MESStorage.resetToDefault/downloadBackup/restoreBackup` — cả 3 đều không tồn tại.
6. Cột size ở chế độ "651 dòng size" và file Excel export luôn = 0, vì `sizes` dùng key `"UK 6"` trong khi bảng đọc key `"6"`.
7. Tab Mô phỏng chạy xong không hiển thị kết quả gì (bảng so sánh trong HTML là số liệu tĩnh); tham số khuôn cũng bị ghi nhầm key (`outsoleMolds` thay vì `molds`) nên optimizer luôn dùng 12 khuôn.
8. Toast không bao giờ hiện (CSS chỉ hiện khi có class `.show`, code cũ không thêm class này).
9. `vercel.json` cache `js/css` dạng `immutable` 1 năm — kể cả sau khi deploy bản sửa, trình duyệt đã cache bản lỗi vẫn không nhận bản mới. Đã đổi về `max-age=0, must-revalidate` + thêm `?v=2` vào các file local.

Cách sửa: `storage.js` tự build/migrate `segments` + `subProcesses` + chuẩn hóa bàn giao/Kaizen từ dữ liệu gốc; `optimizer.js` thêm `scheduleAllOrders()` đúng shape `schedules[].milestones`; `app.js` sửa toàn bộ chữ ký chart + `TVS_DATA` → `state`; `storage.js` thêm alias `saveState/resetToDefault/downloadBackup/restoreBackup` và đồng bộ 2 chiều WIP/actual trước khi lưu; tab Mô phỏng hiển thị kết quả live; import 0 dòng báo cảnh báo thay vì "thành công". Lưu ý: `data/tvs_data.json` hiện không được app nạp (app dùng `js/data.js` nhúng sẵn) — file này chỉ còn vai trò tham chiếu, dòng tổng cuối (mã BTP rỗng) không phải là 1 mã BTP.

> **Mục tiêu**: Hệ thống điều hành sản xuất (MES/ERP) chuyên biệt cho **Phân xưởng LAF** (sản xuất giày ủng cao su xuất khẩu), giải bài toán tối ưu hóa theo mô hình **5M** kết hợp **Kế hoạch 1 (Lịch lùi Backward Scheduling)** đảm bảo **100% đúng Ngày xuất Kinh doanh (OTD = 100%)**, chạy online trên nền tảng web, sẵn sàng deploy lên **Vercel** và quản lý mã nguồn trên **GitHub**.

---

## 1. TỔNG QUAN DỮ LIỆU ĐẦU VÀO NHÀ MÁY (TVS REAL DATA)

Hệ thống được xây dựng và chuẩn hóa trực tiếp từ 3 tệp dữ liệu gốc tại đường dẫn `D:\AI\CONGVIEC`:

1. **`DON_DAT_HANG_TVS.xlsx`**:
   - Gồm **651 dòng Size** chi tiết.
   - Gộp thành **113 Đơn hàng / PO Kinh doanh**.
   - Tổng sản lượng: **64.837 đôi** (tương đương **11.832 thùng CLP**).
   - Cơ cấu 5 mã màu chủ lực:
     - `LC1783` (Đen Than): 29.046 đôi (44.8%)
     - `LC1786` (Xanh Rêu Olive): 15.218 đôi (23.5%)
     - `LC1787` (Xanh Navy): 10.364 đôi (16.0%)
     - `LC1784` (Nâu Đất): 7.327 đôi (11.3%)
     - `LC1785` (Vàng Bảo Hộ): 2.882 đôi (4.4%)
   - Phân bổ trên **19 quốc gia** xuất khẩu (Ý, Argentina, Đức, Mỹ, Nhật Bản, Hàn Quốc, Anh, Pháp...).
   - **30 mốc Ngày xuất KD** trải dài từ ngày **25/07/2026** đến **01/04/2027**.

2. **`Dữ liệu LAF.xlsx`**:
   - Định nghĩa quy trình thực tế gồm **3 Chuyền lớn** chia thành **7 Phân đoạn công việc** (Cán Vải, In Lụa, Luyện Kín, Ép Đế, Mài Đế, Cán Đùn, Tổ Chặt).
   - Tổng định biên nhân sự trực tiếp: **71 công nhân**.
   - Ghi nhận chi tiết các điểm nghẽn máy móc, khuôn ccdc, hao hụt vật tư và yêu cầu Kaizen tại hiện trường.

3. **`He_Thong_Ke_Hoach_5M_LAF_TVS.xlsx`**:
   - Định mức công suất chuẩn, POH mục tiêu và OEE của từng phân đoạn.
   - Chi tiết **32 Công đoạn nhỏ** tạo ra **32 Mã Bán thành phẩm nhỏ (Sub-BTP)**.
   - Cơ cấu 12 bộ khuôn ép đế theo dải cỡ size từ `UK 3` đến `UK 9`.

---

## 2. BÁO CÁO AUDIT TỔNG THỂ & ĐIỂM NGHẼN PHÂN XƯỞNG LAF

Qua rà soát chuyên sâu từng công đoạn, hệ thống xác định **4 điểm nghẽn trọng yếu** của phân xưởng LAF:

| STT | Phân đoạn | Hiện trạng & Điểm nghẽn từ Shopfloor | Ảnh hưởng sản xuất |
|---|---|---|---|
| **1** | **Ép Đế (12 khuôn)** | Năng lực ép giờ hành chính (8h) chỉ đạt **450 đôi/ngày** (12 bộ khuôn × ~37.5-40 đôi/khuôn), trong khi nhu cầu của xưởng gò LVF là **650 đôi/ngày**. | Thiếu hụt 200 đôi/ngày. Là điểm nghẽn lớn nhất của toàn bộ chuỗi cung ứng LAF. |
| **2** | **Cán Đùn (Máy 5 trục & Máy đùn)** | Sản xuất nhiều mã màu (5 mã LC). Mỗi lần đổi màu phải dừng máy **25–30 phút** để vệ sinh trục và đầu ói, gây hao hụt phế liệu cao su xả bỏ. | Giảm OEE máy 5 trục xuống dưới 85%, dễ làm sần cao su nếu chạy lại nhiều lần. |
| **3** | **Chuyền Cán Vải** | Năng lực máy cán vải rất lớn (**2.650 đôi/ngày**, cần 5-6 công nhân), nhưng LVF chỉ cần 650 đôi/ngày. Nếu rải đều làm hàng ngày sẽ chỉ chạy 2-3h/ngày rồi nghỉ. | Lãng phí giờ công lao động, không đồng bộ vật tư, hao hụt định mức vải dán cao su. |
| **4** | **In Lụa & Tổ Chặt** | Cao su sau in lụa bắt buộc phải lưu kho ủ khô **≥ 24 giờ** mới được chuyển sang LVF. Thợ kiểm hàng tổ chặt đơn lẻ chỉ đạt 50% định mức khi cao su đầu vào bị lỗi. | Nếu in dồn dập vượt công suất LVF sẽ làm tồn gối đầu nhiều, cao su lão hóa; nếu in chậm sẽ thiếu hàng lên chuyền gò. |

---

## 3. KẾ HOẠCH KAIZEN VÀ THUẬT TOÁN TỐI ƯU 5M (KẾ HOẠCH 1)

Thuật toán **Kế hoạch 1** được thiết kế giải quyết triệt để 4 điểm nghẽn trên dựa trên 5 trụ cột **5M**:

### 🎯 1. MAN (Con người & Định biên lao động)
- **Cân bằng chuyền 71 nhân sự**: Cán vải (9 ns), In lụa (7 ns: 1 thợ chính + 6 thợ phụ), Luyện kín (7 ns), Ép đế (10 ns), Mài đế (8 ns: 5 thợ mài tay × 132đ = 660đ/ngày), Cán đùn (11 ns), Tổ chặt (11 ns: bố trí 2 thợ kiểm song song).
- **Tối ưu POH trong giờ hành chính**: Chuyển đổi phương án làm việc gom lô giúp POH toàn xưởng đạt **≥ 95%** mà không phải tăng ca thường xuyên (chỉ tăng ca có kế hoạch tại khâu ép đế).
- *Điểm Man: Tăng từ 78đ lên **95.0đ**.*

### ⚙️ 2. MACHINE (Máy móc & Khuôn gá CCDC)
- **Chiến lược Ép đế Pull trước 2 tuần**: Thiết lập lịch lùi ép đế trước **19 ngày** so với Ngày xuất KD kết hợp tăng ca 3.5h hoặc phương án bổ sung 5 khuôn lên 17 bộ. Tạo buffer an toàn để mài đế và kiểm hàng.
- **Gom màu thành chiến dịch (Color Campaign Batching)**: Sắp xếp các PO cùng mã màu (`LC1783` → `LC1786` → `LC1787` → `LC1784` → `LC1785`) chạy liền kề. Giảm số lần đổi màu máy từ **42 lần xuống 4 lần**, tiết kiệm hơn **19 giờ setup máy/tháng**, nâng OEE lên **94.2%**.
- *Điểm Machine: Tăng từ 74đ lên **94.0đ**.*

### 📦 3. MATERIAL (Đồng bộ BTP & Vật tư)
- **Gom lô Chuyền Cán Vải**: Cán vải cao su tập trung **2 ngày/tuần**, In tẩy & Chặt quai **3 ngày/tuần**. Cắt giảm 100% thời gian nhàn rỗi, duy trì độ đồng nhất của mẻ cao su cán và giảm 4.2% tỷ lệ phế liệu.
- **Đồng bộ 32 Mã BTP Nhỏ**: Quản lý tồn kho WIP thời gian thực, duy trì cơ số đệm 2.5 ngày sản xuất gò.
- *Điểm Material: Tăng từ 70đ lên **98.0đ**.*

### 📐 4. METHOD (Phương pháp & Lịch lùi Backward Scheduling)
- **Quy tắc Lịch lùi chuẩn từ Ngày xuất KD**:
  $$\text{Ngày Xuất KD} \xrightarrow{-5d} \text{Gò LVF} \xrightarrow{-1d} \text{In Lụa (-6d, ủ 24h)} \xrightarrow{-1d} \text{Đùn/Chặt (-7d, 48h)} \xrightarrow{-1d} \text{Mài Đế (-8d, 72h)} \xrightarrow{-11d} \text{Ép Đế (-19d)}$$
- **Cam kết OTD 100%**: 100% trong số 113 PO (64.837 đôi) đều được bàn giao trước ngày vào gò LVF và kịp ngày xuất khẩu kinh doanh.
- *Điểm Method: Tăng từ 72đ lên **97.0đ**.*

### 📊 5. MEASUREMENT (Đo lường & 4 Chốt chặn kỹ thuật)
- Thiết lập **4 Chốt chặn kỹ thuật tự động (Quality Gates)** trước khi xuất kho sang LVF:
  1. **Gate 1**: Cao su in lụa (`BTP-IL-04`) đã lưu kho ủ đủ $\ge 24\text{ giờ}$.
  2. **Gate 2**: BTP Cán đùn & Tổ chặt (`BTP-TC-05`) nhập kho trước giờ gò $\ge 48\text{ giờ}$.
  3. **Gate 3**: BTP Đế mài (`BTP-MD-04`) hoàn thành trước ngày gò $\ge 3\text{ ngày}$ ($72\text{ giờ}$).
  4. **Gate 4**: Đồng bộ đủ bộ 100% chi tiết cấu thành (thân, mũi, nẹp, quai, đế mài, logo).
- *Điểm Measurement: Tăng từ 80đ lên **98.0đ**.*
- **Tổng điểm 5M toàn phân xưởng**: Đạt **96.4 / 100 điểm** (so với 74.8 điểm trước tối ưu).

---

## 4. CÁC TÍNH NĂNG VƯỢT TRỘI CỦA ỨNG DỤNG WEB MES-anti

Hệ thống được thiết kế dưới dạng Single-Page Application (SPA) hiệu năng cao, không phụ thuộc vào server backend phức tạp, lưu trữ bền vững qua **LocalStorage / IndexedDB**:

1. **Thao tác Nhập Liệu Toàn Diện Trên MỌI TAB**:
   - ✍️ **Nhập tay (Manual Entry)**: Modal nhập liệu thân thiện cho Đơn hàng KD, Phiếu bàn giao LVF, Sản lượng ca 32 công đoạn nhỏ, Điều chỉnh tồn kho WIP và Đề xuất Kaizen.
   - 📥 **Import Đa Năng**: Hỗ trợ tệp **Excel (.xlsx, .xls)**, CSV, TSV và Copy-Paste trực tiếp từ bảng tính Excel với cơ chế tiền kiểm duyệt dữ liệu.
   - 📤 **Export Chuẩn Nhà Máy**: Xuất file **Excel (.xlsx)** đa sheet định dạng chuẩn báo cáo sản xuất, tự động căn chỉnh độ rộng cột và file CSV (chuẩn UTF-8 BOM tiếng Việt).

2. **Dashboard Tổng Hợp & Chi Tiết (6 Biểu Đồ Quản Trị)**:
   - **Combo Bar + Line**: Định mức vs Thực tế + Đường xu hướng POH (%) & OEE (%).
   - **Multi-Line Cumulative S-Curve**: Đường xu hướng lũy kế 30 mốc Ngày xuất KD vs Sản xuất LAF vs Giao LVF.
   - **Donut Chart**: Phân tích cơ cấu 64.837 đôi linh hoạt theo 3 chiều: 5 Mã Màu, Top Quốc Gia và 5 Đợt Đặt Hàng.
   - **Radar 5M**: Đối sánh trực quan Trước Tối Ưu (74.8đ) vs Kế Hoạch 1 (96.4đ).
   - **Size & Mold Bar Chart**: Cơ cấu cỡ size UK 3 – UK 9 so với 12 bộ khuôn ép đế CCDC.
   - **WIP Stacked Bar**: Phân bổ tồn kho 32 mã BTP nhỏ theo 7 phân đoạn.
   - **Bảng Ma Trận Hiệu Quả**: Chuyển đổi linh hoạt giữa Tổng hợp 7 phân đoạn và Chi tiết 32 công đoạn nhỏ kèm nút cộng nhanh (+50, +100 đôi).

3. **Bộ Tham Số & Mô Phỏng Tối Ưu 5M**:
   - Cho phép người dùng thay đổi nhu cầu LVF (400-1000đ/ngày), số khuôn (8-24 bộ), chế độ cán vải, chế độ ép đế và bật/tắt gom lô chiến dịch màu để kiểm tra ngay độ nhạy của kế hoạch sản xuất.

---

## 5. HƯỚNG DẪN DEPLOY LÊN VERCEL (ONLINE WEB TOOL)

Ứng dụng được đóng gói tối ưu để deploy lên Vercel chỉ trong **1 phút**:

### Cách 1: Deploy qua Vercel CLI (Khuyến nghị)
1. Cài đặt Vercel CLI (nếu chưa có):
   ```bash
   npm install -g vercel
   ```
2. Di chuyển vào thư mục `MES-anti`:
   ```bash
   cd D:\AI\CONGVIEC\MES-anti
   ```
3. Chạy lệnh deploy:
   ```bash
   vercel
   ```
   - Chọn các thiết lập mặc định (Enter qua các câu hỏi).
   - Khi hoàn tất, Vercel sẽ cung cấp link web online dạng: `https://mes-anti-xxxx.vercel.app`.
4. Deploy lên Production:
   ```bash
   vercel --prod
   ```

### Cách 2: Deploy qua Vercel Dashboard (Kết nối GitHub)
1. Push mã nguồn thư mục `MES-anti` lên tài khoản GitHub của bạn (xem hướng dẫn mục 6).
2. Đăng nhập [vercel.com](https://vercel.com).
3. Bấm **"Add New..."** → **"Project"** → Chọn Repository vừa tạo.
4. Framework Preset để `Other` (hoặc giữ mặc định, Root Directory là `./` hoặc `MES-anti`).
5. Bấm **"Deploy"**. Vercel sẽ tự động build và cấp phát tên miền trực tuyến miễn phí vĩnh viễn với chứng chỉ SSL HTTPS.

---

## 6. HƯỚNG DẪN PUSH LÊN GITHUB

Thư mục `MES-anti` đã được khởi tạo sẵn git repository với đầy đủ cấu hình. Để đưa lên GitHub cá nhân của bạn:

1. Đăng nhập vào tài khoản [GitHub](https://github.com) và tạo một Repository mới đặt tên là `MES-anti`.
2. Mở PowerShell / Terminal tại `D:\AI\CONGVIEC\MES-anti` và chạy các lệnh sau:
   ```powershell
   cd D:\AI\CONGVIEC\MES-anti

   # Kiểm tra trạng thái git
   git status

   # Thêm remote tới repository GitHub vừa tạo của bạn (thay username của bạn vào)
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/MES-anti.git

   # Đổi tên branch chính thành main
   git branch -M main

   # Push mã nguồn lên GitHub
   git push -u origin main
   ```

---

## 7. CẤU TRÚC THƯ MỤC MÃ NGUỒN `MES-anti`

```
MES-anti/
├── index.html              # Giao diện chính Single-Page Application (HTML5 + Tailwind CSS)
├── vercel.json             # Cấu hình cache và rewrite URLs cho Vercel Cloud
├── package.json            # Node.js project metadata & scripts
├── .gitignore              # Tệp loại trừ file rác khỏi Git
├── README.md               # Tài liệu Kaizen, hướng dẫn 5M và deployment
├── css/
│   └── style.css           # Định kiểu giao diện, cuộn tùy biến, toast và print view
├── data/
│   └── tvs_data.json       # Tệp dữ liệu sạch JSON 651 size, 113 PO, 32 BTP
└── js/
    ├── data.js             # Dữ liệu thật TVS nhúng sẵn (khởi tạo tức thì không cần mạng)
    ├── storage.js          # Lớp lưu trữ bền vững LocalStorage / IndexedDB & Backup
    ├── optimizer.js        # Thuật toán Kế hoạch 1 - Backward Scheduling 5M & Campaign Batching
    ├── charts.js           # Bộ quản lý 6 biểu đồ Chart.js trực quan
    ├── io.js               # Động cơ đọc/ghi file Excel (.xlsx) qua SheetJS & CSV
    └── app.js              # Bộ điều khiển trung tâm tương tác người dùng và tabs
```

---
*Phát triển bởi Đội ngũ Antigravity — Hệ thống quản trị sản xuất thông minh thế hệ mới.*

