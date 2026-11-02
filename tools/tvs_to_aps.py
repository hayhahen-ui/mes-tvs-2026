#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chuyển dữ liệu thật TVS (js/data.js) sang file Excel đầu vào cho APS.

Đọc gì từ dữ liệu thật:
  - Mỗi phần tử trong `rawGrouped` thành 1 lệnh APS (113 lệnh).
  - Mã đơn (order_id) = trường `o` (ví dụ AE2607131).
  - Nhóm hàng (product_family) = mã màu `m` (LC1783, LC1784, LC1785,
    LC1786, LC1787).
  - Số lượng (quantity) = tổng số đôi trong các dòng size `s`
    (tổng 113 lệnh = 64.837 đôi, khớp đúng số liệu MES).
  - Hạn giao (due_date) = ngày xuất `d` quy đổi sang giờ làm việc,
    tính từ ngày bắt đầu kế hoạch (xem dưới).

Quy đổi ngày xuất sang giờ:
  - Ngày bắt đầu kế hoạch mặc định = ngày xuất sớm nhất trừ đi
    `--lead-days` ngày (mặc định 30 ngày) để các lệnh xuất sớm nhất
    vẫn có thời gian sản xuất, thay vì due = 0.
  - 1 ngày = `--working-hours-per-day` giờ làm việc (mặc định 8 giờ,
    theo ca hành chính của xưởng; không phải 24 giờ lịch).
  - due_date (giờ) = (ngày xuất - ngày bắt đầu kế hoạch) * giờ/ngày.

Những gì KHÔNG có trong js/data.js nên dùng giá trị mẫu để sửa tay
trong file Excel sau khi sinh (đã ghi rõ trong README_APS.md):
  - release_date: mặc định 0 cho mọi lệnh (coi như vật tư sẵn sàng
    từ đầu kế hoạch). Anh sửa cột này nếu có ngày vật tư thật.
  - priority_weight: mặc định 1 cho mọi lệnh. Đổi thành 10 cho lệnh VIP.
  - Machines: mẫu 3 chuyền song song, làm được cả 5 mã màu, hệ số
    năng suất 1.0 / 1.2 / 0.9, tối đa 8 giờ/ngày. Sửa theo chuyền thật
    của xưởng trước khi chạy solver.
  - Setup: cùng màu = 0 giờ, khác màu = 1 giờ. Con số thật theo
    README của MES là đổi màu máy đùn mất 25-30 phút, làm tròn lên
    1 giờ vì APS tính theo giờ nguyên; sửa lại nếu có định mức khác.

Cách chạy (từ thư mục gốc của repo):
    python tools/tvs_to_aps.py
    python tools/tvs_to_aps.py --lead-days 45 --out tools/aps_inputs.xlsx
    python tools/aps_scheduler.py tools/aps_inputs.xlsx

File Excel sinh ra KHÔNG commit lên GitHub theo mặc định (nó tạo lại
được bất cứ lúc nào từ js/data.js); chỉ commit code và tài liệu.
"""

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd


def parse_raw_grouped(data_js_path):
    """Đọc mảng rawGrouped trong js/data.js, trả về list dict."""
    text = Path(data_js_path).read_text(encoding="utf-8")
    match = re.search(r"rawGrouped:\s*(\[.*?\])\s*,\s*workstations:", text, re.S)
    if not match:
        raise ValueError(
            f"Không tìm thấy rawGrouped trong {data_js_path}. "
            "File data.js có thể đã đổi cấu trúc."
        )
    entries = json.loads(match.group(1))
    if not entries:
        raise ValueError("rawGrouped rỗng, không có lệnh nào để chuyển.")
    return entries


def parse_date(text):
    """Chuyển 'DD/MM/YYYY' thành datetime.date."""
    return datetime.strptime(text.strip(), "%d/%m/%Y").date()


def build_aps_inputs(entries, lead_days, working_hours_per_day):
    """Chuyển 113 lệnh TVS thành 3 DataFrame Orders / Machines / Setup."""
    dates = [parse_date(e["d"]) for e in entries]
    plan_start = min(dates) - timedelta(days=lead_days)

    order_rows = []
    for entry in entries:
        total_pairs = sum(int(item[1]) for item in entry.get("s", []))
        due_hours = (parse_date(entry["d"]) - plan_start).days * working_hours_per_day
        order_rows.append({
            "order_id": str(entry["o"]),
            "product_family": str(entry["m"]),
            "quantity": total_pairs,
            "release_date": 0,
            "due_date": due_hours,
            "priority_weight": 1,
            # Các cột tham chiếu (solver bỏ qua, chỉ để người đọc đối chiếu):
            "po_code": str(entry.get("p", "")),
            "country": str(entry.get("c", "")),
            "export_date": str(entry["d"]),
        })
    orders_df = pd.DataFrame(order_rows)

    families = sorted({str(e["m"]) for e in entries})
    all_families = ";".join(families)
    machines_df = pd.DataFrame([
        {"machine_id": "CHUYEN_1", "eligible_families": all_families,
         "speed_factor": 1.0, "max_working_hours": working_hours_per_day},
        {"machine_id": "CHUYEN_2", "eligible_families": all_families,
         "speed_factor": 1.2, "max_working_hours": working_hours_per_day},
        {"machine_id": "CHUYEN_3", "eligible_families": all_families,
         "speed_factor": 0.9, "max_working_hours": working_hours_per_day},
    ])

    setup_rows = []
    for fam_from in families:
        row = {"product_family": fam_from}
        for fam_to in families:
            row[fam_to] = 0 if fam_from == fam_to else 1
        setup_rows.append(row)
    setup_df = pd.DataFrame(setup_rows)

    info = {
        "num_orders": len(order_rows),
        "total_pairs": int(orders_df["quantity"].sum()),
        "families": families,
        "family_counts": dict(Counter(orders_df["product_family"])),
        "date_min": str(min(dates)),
        "date_max": str(max(dates)),
        "plan_start": str(plan_start),
        "due_min": int(orders_df["due_date"].min()),
        "due_max": int(orders_df["due_date"].max()),
    }
    return orders_df, machines_df, setup_df, info


def main():
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Chuyển dữ liệu TVS (js/data.js) sang Excel đầu vào APS.")
    parser.add_argument("--data", default=str(repo_root / "js" / "data.js"),
                        help="Đường dẫn js/data.js (mặc định: js/data.js).")
    parser.add_argument("--out", default=str(repo_root / "tools" / "aps_inputs.xlsx"),
                        help="File Excel đầu ra (mặc định: tools/aps_inputs.xlsx).")
    parser.add_argument("--lead-days", type=int, default=30,
                        help="Số ngày sản xuất trước ngày xuất sớm nhất (mặc định 30).")
    parser.add_argument("--working-hours-per-day", type=int, default=8,
                        help="Giờ làm việc mỗi ngày để quy đổi ngày sang giờ (mặc định 8).")
    args = parser.parse_args()

    entries = parse_raw_grouped(args.data)
    orders_df, machines_df, setup_df, info = build_aps_inputs(
        entries, args.lead_days, args.working_hours_per_day)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(out_path) as writer:
        orders_df.to_excel(writer, sheet_name="Orders", index=False)
        machines_df.to_excel(writer, sheet_name="Machines", index=False)
        setup_df.to_excel(writer, sheet_name="Setup", index=False)

    print("=" * 68)
    print("CHUYỂN DỮ LIỆU TVS SANG APS - HOÀN TẤT")
    print("=" * 68)
    print(f"Nguồn            : {args.data}")
    print(f"Số lệnh          : {info['num_orders']} (tổng {info['total_pairs']:,} đôi)")
    print(f"Nhóm màu         : {info['family_counts']}")
    print(f"Ngày xuất        : {info['date_min']} -> {info['date_max']}")
    print(f"Ngày bắt đầu KH  : {info['plan_start']} "
          f"(sớm hơn ngày xuất đầu {args.lead_days} ngày)")
    print(f"Hạn giao (giờ)   : {info['due_min']} -> {info['due_max']} "
          f"({args.working_hours_per_day} giờ/ngày)")
    print(f"File Excel       : {out_path}")
    print("Bước tiếp theo   : python tools/aps_scheduler.py tools/aps_inputs.xlsx")
    print("Lưu ý             : sửa release_date, priority_weight, Machines, "
          "Setup trong Excel trước khi chạy nếu có số liệu thật.")
    print("=" * 68)
    return 0


if __name__ == "__main__":
    sys.exit(main())
