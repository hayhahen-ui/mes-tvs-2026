# APS — Lập kế hoạch sản xuất tối ưu (CP-SAT) đấu nối vào MES TVS 2026

Thư mục `tools/` chứa bộ giải **Advanced Production Planning & Scheduling (APS)**
bằng Google OR-Tools CP-SAT, chạy **offline bằng Python**, tách biệt với web app
tĩnh (HTML/JS) chạy trên Vercel. Vercel không chạy được code Python này, và
web app cũng không gọi được solver từ trình duyệt — đây là công cụ chạy tay
trên máy tính, kết quả của nó dùng để ra quyết định xếp lịch, không tự động
ghi đè lịch trong web app.

## Chạy nhanh

```bash
pip install ortools pandas matplotlib openpyxl

# 1. Chạy dữ liệu mẫu (12 lệnh, 3 chuyền, 4 nhóm hàng)
python tools/aps_scheduler.py

# 2. Chuyển dữ liệu thật TVS sang Excel APS
python tools/tvs_to_aps.py

# 3. Chạy solver trên dữ liệu thật TVS (mặc định 30 giây, 8 luồng)
python tools/aps_scheduler.py tools/aps_inputs.xlsx

# Dữ liệu lớn (113 lệnh) muốn chắc chắn hơn thì nới thời gian giải:
python tools/aps_scheduler.py tools/aps_inputs.xlsx --time-limit 120
```

Kết quả chạy ra (cùng thư mục `tools/`):

- `kehoach_sanxuat_toiuu.csv` — bảng lịch: Mã đơn, Nhóm hàng, Chuyền,
  Giờ bắt đầu, Giờ đổi mã, Giờ kết thúc, Hạn giao, Trễ (giờ), Trạng thái.
- `kehoach_gantt.png` — biểu đồ Gantt: màu theo nhóm hàng, khối xám gạch
  là thời gian đổi mã, viền đỏ là lệnh trễ hạn, dấu thoi đen là hạn giao.

Các file sinh ra khi chạy (`aps_inputs.xlsx`, `kehoach_sanxuat_toiuu.csv`,
`kehoach_gantt.png`) không commit lên GitHub — chúng tạo lại được bất cứ lúc
nào từ `js/data.js` và code trong thư mục này.

## Kết quả chạy thử trên dữ liệu thật TVS (02/11/2026, đã kiểm chứng)

- Chuyển đổi: 113 lệnh, tổng 64.837 đôi, 5 mã màu, ngày xuất
  25/07/2026 → 01/04/2027, ngày bắt đầu kế hoạch 25/06/2026.
- Chạy 30 giây: `FEASIBLE`, Z = 874 (setup 62 giờ, makespan 254 giờ,
  trễ 0 giờ), MIP Gap 91,2% — solver chưa kịp gom màu tốt.
- Chạy 120 giây: `FEASIBLE`, Z = 742 (setup 49 giờ, makespan 252 giờ,
  trễ 0 giờ), MIP Gap 70,6% — tốt hơn rõ rệt nhưng vẫn chưa chứng minh
  tối ưu. Lịch CSV đã kiểm chứng lại độc lập: không chồng lấn, đúng
  thời gian gia công theo tốc độ chuyền, đúng setup theo màu trước đó,
  đúng trễ theo hạn giao, tổng đôi khớp 64.837.
- Kết luận thực tế: với 113 lệnh, đừng lấy kết quả 30 giây làm lịch
  chính thức; chạy `--time-limit 120` trở lên, và coi gap còn lớn là
  dấu hiệu solver vẫn có thể gom màu tốt hơn nữa nếu cho thêm thời gian.

## Bảng đấu nối dữ liệu TVS → APS

| Dữ liệu APS | Lấy từ đâu trong dự án | Ghi chú |
|---|---|---|
| Lệnh (`order_id`) | `js/data.js` → `rawGrouped[].o` (ví dụ `AE2607131`) | 113 lệnh |
| Nhóm hàng (`product_family`) | `rawGrouped[].m` — mã màu `LC1783/84/85/86/87` | 5 nhóm, gom màu để giảm đổi mã |
| Số lượng (`quantity`) | Tổng số đôi trong `rawGrouped[].s` | Tổng 113 lệnh = 64.837 đôi |
| Hạn giao (`due_date`, giờ) | Ngày xuất `rawGrouped[].d` quy đổi: `(ngày xuất − ngày bắt đầu KH) × 8 giờ/ngày` | Ngày bắt đầu KH mặc định = ngày xuất sớm nhất trừ 30 ngày |
| Vật tư sẵn sàng (`release_date`) | **Không có trong `data.js` → mẫu = 0** | Sửa cột này trong Excel nếu có ngày vật tư thật |
| Trọng số trễ (`priority_weight`) | **Không có trong `data.js` → mẫu = 1** | Đổi thành 10 cho lệnh VIP trong Excel |
| Chuyền (`Machines`) | **Mẫu 3 chuyền song song** (không phải 7 phân đoạn tuần tự của MES) | Sửa theo chuyền thật trước khi chạy |
| Đổi mã (`Setup`) | **Mẫu: cùng màu 0 giờ, khác màu 1 giờ** | README MES ghi đổi màu máy đùn mất 25–30 phút, làm tròn lên 1 giờ vì APS tính theo giờ nguyên |

## Giới hạn phải nói rõ — APS không thay thế lịch 5M của MES

- **APS trong thư mục này là mô hình 1 công đoạn, nhiều chuyền song song:**
  mỗi lệnh được gán vào đúng 1 chuyền và chạy xong là xong. Nó **không**
  mô hình được chuỗi 7 phân đoạn tuần tự của MES (Cán Vải → In Lụa →
  Luyện Kín → Ép Đế → Mài Đế → Cán Đùn → Tổ Chặt → LVF), không có lịch lùi
  backward 19/8/7/6/5 ngày, không có ủ in lụa 24 giờ, không có khuôn ép đế.
- **Dùng APS vào việc gì thì đúng:** xếp 113 PO vào 3 chuyền song song
  của **một công đoạn** (ví dụ chuyền gò, hoặc chuyền ép đế nếu coi mỗi
  chuyền là một tổ máy song song), gom màu để giảm số lần đổi mã, và xem
  chuyền nào là nút thắt theo tải. Kết quả này là đầu vào tham khảo cho
  lịch 5M trong web app, không phải lịch 5M hoàn chỉnh.
- **Muốn mô hình đa công đoạn thật** thì phải mở rộng solver thành flow-shop
  (mỗi lệnh đi qua nhiều công đoạn theo thứ tự, có thời gian chờ ủ giữa
  các công đoạn) — đó là một bài toán khác, chưa có trong file này, và
  không nên giả vờ là file này đã làm được.

## Thuật toán trong `aps_scheduler.py` (tóm tắt)

1. **Ràng buộc cứng:** mỗi lệnh đúng 1 chuyền được phép
   (`NewOptionalIntervalVar` + `AddExactlyOne`), không chồng lấn trên
   cùng chuyền (`AddNoOverlap`), bắt đầu ≥ `release_date`, thời gian đổi
   mã phụ thuộc thứ tự (SDST) bằng `AddCircuit` trên từng chuyền.
2. **Ràng buộc mềm:** `tardiness = max(0, end − due_date)` nên quá tải thì
   solver không báo `INFEASIBLE` mà tìm phương án ít trễ nhất theo trọng số.
3. **Warm-start:** heuristic EDD (hạn giao sớm nhất) + gom nhóm, nạp bằng
   `AddHint`, kèm bước dồn lịch sang trái sau khi giải để lịch không còn
   khoảng trống vô cớ mà vẫn giữ nguyên giá trị hàm mục tiêu.
4. **Hàm mục tiêu:** `min Z = 100 × Σ(priority_weight × tardiness)
   + 10 × Total_Setup_Time + 1 × Makespan`.
5. **Báo cáo:** trạng thái `OPTIMAL`/`FEASIBLE`, MIP Gap
   `|Objective − BestBound| / |Objective|`, makespan, tổng setup, tổng
   trễ, % tải từng chuyền và nút thắt.

Dùng dữ liệu riêng (không phải TVS): tạo file Excel 3 sheet `Orders`,
`Machines`, `Setup` theo đúng tên cột trong `load_from_excel()`, rồi chạy
`python tools/aps_scheduler.py <file-excel>`. Các hàm
`orders_from_dataframe()` / `machines_from_dataframe()` /
`setup_from_dataframe()` cũng dùng được trực tiếp từ code Python khác.
