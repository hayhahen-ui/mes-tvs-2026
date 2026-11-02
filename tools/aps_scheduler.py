#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Thiết lập Kế hoạch & Điều độ Sản xuất Tối ưu (APS)
===================================================

Module Python hoàn chỉnh, cấu trúc hướng đối tượng, giải bài toán
lập kế hoạch sản xuất trên nhiều chuyền/máy bằng Google OR-Tools CP-SAT.

Cách chạy (chỉ cần 1 lệnh, chạy là ra kết quả + biểu đồ):
    pip install ortools pandas matplotlib openpyxl
    python scheduler.py

Sau khi chạy, trong cùng thư mục sẽ có:
    kehoach_sanxuat_toiuu.csv   : bảng lịch sản xuất chi tiết
    kehoach_gantt.png            : biểu đồ Gantt

Quy ước dữ liệu (toàn bộ thời gian tính bằng GIỜ, mốc 0 là đầu ca kế hoạch):
  - Orders (lệnh sản xuất): mỗi lệnh có nhóm hàng (product_family),
    số lượng, giờ vật tư sẵn sàng (release_date), hạn giao (due_date)
    và trọng số phạt trễ (priority_weight: VIP = 10, thường = 1).
  - Machines (chuyền/máy): mỗi chuyền chỉ làm được một số nhóm hàng
    (eligible_families), có hệ số năng suất (speed_factor) và số giờ
    làm việc tối đa mỗi ngày (max_working_hours).
  - Setup_Matrix: setup_time[f1][f2] là số giờ đổi mã/khuôn khi trên
    cùng một chuyền, lệnh nhóm f1 đứng ngay trước lệnh nhóm f2.
    Cùng nhóm thì setup = 0.

Cách tính thời gian gia công:
    processing_time = ceil(quantity / (100 * speed_factor))
  Nghĩa là chuyền có speed_factor = 1.0 làm được 100 đơn vị/giờ,
  speed_factor = 1.2 làm được 120 đơn vị/giờ, speed_factor = 0.9
  làm được 90 đơn vị/giờ. Công thức này nằm gọn trong một hàm duy
  nhất (processing_time) nên muốn đổi định mức chỉ cần sửa ở đó.

Kiến trúc thuật toán (Hybrid Matheuristic Engine) - 4 tầng:
  1. Ràng buộc cứng: mỗi lệnh đúng 1 chuyền được phép, không chồng
     lấn trên cùng chuyền, bắt đầu >= release_date, thời gian đổi mã
     phụ thuộc thứ tự (SDST) mô hình bằng AddCircuit.
  2. Ràng buộc mềm: biến bù tardiness = max(0, end - due_date) nên
     khi quá tải, solver không báo INFEASIBLE mà tìm phương án ít
     trễ nhất (theo trọng số ưu tiên).
  3. Mồi nghiệm khởi tạo: heuristic EDD (hạn giao sớm nhất) kết hợp
     gom nhóm product_family, nạp vào CP-SAT bằng AddHint.
  4. Hàm mục tiêu đa tiêu chí:
         min Z = 100 * sum(priority_weight * tardiness)
               +  10 * Total_Setup_Time
               +   1 * Makespan
"""

import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

try:
    from ortools.sat.python import cp_model
except ImportError:  # Thông báo rõ ràng thay vì để traceback khó hiểu.
    print(
        "Thiếu thư viện ortools. Hãy cài đặt trước bằng lệnh:\n"
        "    pip install ortools pandas matplotlib openpyxl",
        file=sys.stderr,
    )
    sys.exit(1)

import matplotlib

matplotlib.use("Agg")  # Vẽ ra file PNG, không phụ thuộc màn hình.
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

# ---------------------------------------------------------------------------
# Hằng số cấu hình chung
# ---------------------------------------------------------------------------
BASE_RATE_PER_HOUR = 100  # Đơn vị/giờ của chuyền có speed_factor = 1.0.
W_TARDINESS = 100         # Trọng số phạt trễ trong hàm mục tiêu.
W_SETUP = 10              # Trọng số phạt tổng thời gian đổi mã.
W_MAKESPAN = 1            # Trọng số phạt makespan.
SOLVER_WORKERS = 8        # Số luồng tìm kiếm song song.
SOLVER_TIME_LIMIT = 30    # Giới hạn thời gian giải (giây).
CSV_FILENAME = "kehoach_sanxuat_toiuu.csv"
GANTT_FILENAME = "kehoach_gantt.png"


# ---------------------------------------------------------------------------
# 1. ĐẦU VÀO DỮ LIỆU (DATA SCHEMA)
# ---------------------------------------------------------------------------
@dataclass
class Order:
    """Một lệnh sản xuất."""

    order_id: str
    product_family: str
    quantity: int
    release_date: int  # Giờ vật tư sẵn sàng (mốc 0 = đầu ca kế hoạch).
    due_date: int      # Hạn giao hàng (giờ).
    priority_weight: int = 1  # VIP = 10, thường = 1.


@dataclass
class Machine:
    """Một chuyền/máy sản xuất."""

    machine_id: str
    eligible_families: list = field(default_factory=list)
    speed_factor: float = 1.0
    max_working_hours: int = 16  # Số giờ làm việc tối đa mỗi ngày.


def processing_time(order: Order, machine: Machine) -> int:
    """Thời gian gia công (giờ, làm tròn lên) của một lệnh trên một chuyền."""
    rate = BASE_RATE_PER_HOUR * machine.speed_factor
    return max(1, math.ceil(order.quantity / rate))


def generate_sample_data():
    """Tạo bộ dữ liệu mẫu: 12 lệnh, 3 chuyền, 4 nhóm hàng.

    Dữ liệu mẫu cố tình tạo ra xung đột thật: nhiều lệnh VIP có hạn
    giao sớm, các chuyền không làm được mọi nhóm hàng, và đổi nhóm
    hàng tốn 2-5 giờ, nên solver buộc phải cân nhắc giữa trễ hạn,
    đổi mã và makespan thay vì xếp bừa cũng đúng.
    """
    orders = [
        Order("DH01", "A", 800, 0, 48, 10),
        Order("DH02", "A", 600, 0, 56, 1),
        Order("DH03", "B", 500, 8, 48, 10),
        Order("DH04", "B", 700, 0, 72, 1),
        Order("DH05", "C", 900, 16, 80, 1),
        Order("DH06", "C", 400, 0, 56, 10),
        Order("DH07", "D", 600, 8, 72, 1),
        Order("DH08", "A", 500, 24, 80, 1),
        Order("DH09", "B", 800, 16, 96, 1),
        Order("DH10", "D", 500, 0, 64, 10),
        Order("DH11", "C", 700, 24, 96, 1),
        Order("DH12", "D", 900, 16, 88, 1),
    ]
    machines = [
        Machine("CHUYEN_1", ["A", "B", "C", "D"], 1.0, 16),
        Machine("CHUYEN_2", ["A", "B", "C"], 1.2, 16),
        Machine("CHUYEN_3", ["B", "C", "D"], 0.9, 16),
    ]
    # Ma trận đổi mã: hàng = nhóm trước, cột = nhóm sau (giờ).
    setup_matrix = {
        "A": {"A": 0, "B": 3, "C": 4, "D": 5},
        "B": {"A": 3, "B": 0, "C": 2, "D": 4},
        "C": {"A": 4, "B": 2, "C": 0, "D": 3},
        "D": {"A": 5, "B": 4, "C": 3, "D": 0},
    }
    return orders, machines, setup_matrix


def _split_families(value):
    """Chuyển ô eligible_families (list hoặc chuỗi 'A;B;C') thành list."""
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    text = str(value).strip()
    if not text:
        return []
    for sep in (";", "|"):
        if sep in text:
            return [part.strip() for part in text.split(sep) if part.strip()]
    return [part.strip() for part in text.split(",") if part.strip()]


def orders_from_dataframe(df: pd.DataFrame):
    """Đọc danh sách lệnh từ pandas DataFrame.

    Các cột bắt buộc: order_id, product_family, quantity,
    release_date, due_date. Cột priority_weight không có thì mặc định 1.
    """
    required = ["order_id", "product_family", "quantity", "release_date", "due_date"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Thiếu cột lệnh sản xuất: {missing}")
    orders = []
    for _, row in df.iterrows():
        orders.append(
            Order(
                order_id=str(row["order_id"]),
                product_family=str(row["product_family"]),
                quantity=int(row["quantity"]),
                release_date=int(row["release_date"]),
                due_date=int(row["due_date"]),
                priority_weight=int(row.get("priority_weight", 1)),
            )
        )
    return orders


def machines_from_dataframe(df: pd.DataFrame):
    """Đọc danh sách chuyền từ pandas DataFrame.

    Các cột bắt buộc: machine_id, eligible_families.
    Cột speed_factor, max_working_hours không có thì mặc định 1.0 và 16.
    """
    required = ["machine_id", "eligible_families"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Thiếu cột chuyền/máy: {missing}")
    machines = []
    for _, row in df.iterrows():
        machines.append(
            Machine(
                machine_id=str(row["machine_id"]),
                eligible_families=_split_families(row["eligible_families"]),
                speed_factor=float(row.get("speed_factor", 1.0)),
                max_working_hours=int(row.get("max_working_hours", 16)),
            )
        )
    return machines


def setup_from_dataframe(df: pd.DataFrame):
    """Đọc ma trận đổi mã từ pandas DataFrame.

    DataFrame có cột đầu là nhóm hàng (tên cột product_family hoặc
    family), các cột còn lại là nhóm hàng đích, giá trị là giờ đổi mã.
    """
    work = df.copy()
    if "product_family" in work.columns:
        work = work.set_index("product_family")
    elif "family" in work.columns:
        work = work.set_index("family")
    matrix = {}
    for fam_from, row in work.iterrows():
        matrix[str(fam_from)] = {str(col): int(row[col]) for col in work.columns}
    return matrix


def load_from_excel(path):
    """Đọc toàn bộ dữ liệu từ file Excel.

    File cần có 3 sheet: Orders, Machines, Setup. Nếu tên sheet khác,
    hàm tự nhận 3 sheet đầu tiên theo đúng thứ tự đó.
    Trả về (orders, machines, setup_matrix).
    """
    sheets = pd.read_excel(path, sheet_name=None)
    names = list(sheets.keys())

    def pick(candidates, fallback_index):
        """Chọn sheet theo tên ưu tiên, nếu không có thì lấy theo vị trí."""
        for name in candidates:
            if name in sheets:
                return sheets[name]
        return sheets[names[fallback_index]]

    orders_sheet = pick(["Orders", "DonHang"], 0)
    machines_sheet = pick(["Machines", "Chuyen"], 1)
    setup_sheet = pick(["Setup", "Setup_Matrix"], 2)
    return (
        orders_from_dataframe(orders_sheet),
        machines_from_dataframe(machines_sheet),
        setup_from_dataframe(setup_sheet),
    )


# ---------------------------------------------------------------------------
# 2. KIẾN TRÚC THUẬT TOÁN (HYBRID MATHEURISTIC ENGINE)
# ---------------------------------------------------------------------------
class ProductionSchedulerSolver:
    """Solver APS bằng CP-SAT: hard + soft + warm-start + đa mục tiêu."""

    def __init__(self, orders, machines, setup_matrix,
                 time_limit=SOLVER_TIME_LIMIT, workers=SOLVER_WORKERS):
        self.orders = list(orders)
        self.machines = list(machines)
        self.setup = setup_matrix
        self.time_limit = time_limit
        self.workers = workers
        self._validate_inputs()

        # Thời gian gia công của từng cặp (lệnh, chuyền được phép).
        self.proc = {
            (o.order_id, m.machine_id): processing_time(o, m)
            for o in self.orders
            for m in self.machines
            if o.product_family in m.eligible_families
        }
        # Chân trời lập kế hoạch: đủ lớn để mọi lịch khả thi đều chứa
        # được, nhưng không quá lớn làm solver tìm kiếm vô ích.
        max_due = max(o.due_date for o in self.orders)
        max_proc_sum = sum(
            max(self.proc[(o.order_id, m.machine_id)]
                for m in self.machines
                if o.product_family in m.eligible_families)
            for o in self.orders
        )
        max_setup = max(v for row in self.setup.values() for v in row.values())
        self.horizon = max_due + max_proc_sum + max_setup * len(self.orders) + 1
        # Số ngày kế hoạch (làm tròn lên theo ca 24 giờ) để quy đổi
        # max_working_hours (giờ/ngày) thành tổng công suất của chuyền.
        span = max_due - min(o.release_date for o in self.orders)
        self.num_days = max(1, math.ceil(span / 24)) if span > 0 else 1

        self.model = None
        self.solver = None
        self.status = None
        self.solution = []  # List dict, một phần tử cho mỗi lệnh.

    # -- Kiểm tra đầu vào -------------------------------------------------
    def _validate_inputs(self):
        families = {o.product_family for o in self.orders}
        for fam in families:
            if fam not in self.setup:
                raise ValueError(f"Thiếu hàng đổi mã cho nhóm hàng '{fam}'.")
            for other in families:
                if other not in self.setup[fam]:
                    raise ValueError(
                        f"Thiếu setup_time[{fam}][{other}] trong ma trận đổi mã."
                    )
        for order in self.orders:
            eligible = [m for m in self.machines
                        if order.product_family in m.eligible_families]
            if not eligible:
                raise ValueError(
                    f"Lệnh {order.order_id} (nhóm {order.product_family}) "
                    "không có chuyền nào được phép gia công."
                )

    def setup_time(self, fam_from, fam_to):
        """Giờ đổi mã khi đổi từ nhóm fam_from sang nhóm fam_to."""
        return int(self.setup[fam_from][fam_to])

    # -- Tầng 3: Heuristic Warm-Start (EDD + gom nhóm) --------------------
    def build_edd_warmstart(self):
        """Xếp lịch tham lam làm mồi cho CP-SAT.

        Quy tắc: duyệt lệnh theo hạn giao sớm nhất (EDD); với mỗi lệnh,
        chọn chuyền được phép cho thời điểm kết thúc sớm nhất, trong đó
        thời gian bắt đầu đã cộng setup từ nhóm hàng trước đó trên chuyền
        đó. Vì setup cùng nhóm = 0, quy tắc này tự động gom các lệnh cùng
        nhóm lại với nhau trên cùng một chuyền mà không cần bước gom riêng.

        Trả về: (assignment, sequences)
          assignment: {order_id: (machine_id, start, end)}
          sequences:  {machine_id: [order_id theo thứ tự chạy]}
        """
        # Trạng thái từng chuyền: giờ rảnh và nhóm hàng chạy gần nhất.
        available = {m.machine_id: 0 for m in self.machines}
        last_family = {m.machine_id: None for m in self.machines}
        load = {m.machine_id: 0 for m in self.machines}
        assignment = {}
        sequences = {m.machine_id: [] for m in self.machines}

        ordered = sorted(self.orders,
                         key=lambda o: (o.due_date, o.product_family, o.order_id))
        machines_by_id = {m.machine_id: m for m in self.machines}
        for order in ordered:
            best = None  # (end, start, machine_id)
            for machine in self.machines:
                if order.product_family not in machine.eligible_families:
                    continue
                setup = 0
                if last_family[machine.machine_id] is not None:
                    setup = self.setup_time(last_family[machine.machine_id],
                                            order.product_family)
                start = max(order.release_date,
                            available[machine.machine_id] + setup)
                end = start + self.proc[(order.order_id, machine.machine_id)]
                # Ưu tiên kết thúc sớm nhất, sau đó là chuyền đang rảnh tải thấp.
                key = (end, load[machine.machine_id])
                if best is None or key < best[0]:
                    best = (key, start, end, machine.machine_id, setup)
            _, start, end, machine_id, _ = best
            assignment[order.order_id] = (machine_id, start, end)
            sequences[machine_id].append(order.order_id)
            machine = machines_by_id[machine_id]
            available[machine_id] = end
            last_family[machine_id] = order.product_family
            load[machine_id] += end - start
        return assignment, sequences

    # -- Tầng 1 + 2: Xây mô hình CP-SAT -----------------------------------
    def build_model(self):
        """Xây mô hình: biến, ràng buộc cứng, biến bù trễ, hàm mục tiêu."""
        model = cp_model.CpModel()
        self.model = model
        n = len(self.orders)
        order_index = {o.order_id: i for i, o in enumerate(self.orders)}

        # --- Biến thời gian của từng lệnh (dùng chung cho mọi chuyền) ---
        starts, ends = [], []
        for order in self.orders:
            starts.append(model.NewIntVar(order.release_date, self.horizon,
                                          f"start_{order.order_id}"))
            ends.append(model.NewIntVar(order.release_date, self.horizon,
                                        f"end_{order.order_id}"))
            # Ràng buộc cứng: chỉ sản xuất khi đủ nguyên vật liệu.
            model.Add(starts[-1] >= order.release_date)
        self.starts, self.ends = starts, ends

        # --- Gán chuyền: optional interval + đúng 1 chuyền được phép ----
        self.present = {}    # (order_id, machine_id) -> BoolVar
        self.intervals = {}  # (order_id, machine_id) -> IntervalVar
        for order in self.orders:
            presents = []
            for machine in self.machines:
                if order.product_family not in machine.eligible_families:
                    continue
                j = order_index[order.order_id]
                pres = model.NewBoolVar(f"present_{order.order_id}_{machine.machine_id}")
                interval = model.NewOptionalIntervalVar(
                    starts[j], self.proc[(order.order_id, machine.machine_id)],
                    ends[j], pres,
                    f"interval_{order.order_id}_{machine.machine_id}")
                self.present[(order.order_id, machine.machine_id)] = pres
                self.intervals[(order.order_id, machine.machine_id)] = interval
                presents.append(pres)
            model.AddExactlyOne(presents)  # Mỗi lệnh đúng 1 chuyền.

        # --- Không chồng lấn + SDST bằng AddCircuit (theo từng chuyền) --
        # Mỗi chuyền là một "mạch": nút 0 là nút giả (đầu/cuối), các nút
        # còn lại là các lệnh. Cung i -> j được chọn nghĩa là lệnh j chạy
        # ngay sau lệnh i trên chuyền đó, và khi đó bắt buộc phải chừa
        # đủ giờ đổi mã: start_j >= end_i + setup(f_i, f_j).
        # Lệnh không gán vào chuyền thì tự khoá (self-loop); nút giả tự
        # khoá khi chuyền không có lệnh nào.
        self.arc_vars = {}       # (machine_id, tail, head) -> BoolVar
        self.dummy_self = {}     # machine_id -> BoolVar
        setup_terms = []
        for machine in self.machines:
            jobs = [o for o in self.orders
                    if o.product_family in machine.eligible_families]
            if not jobs:
                continue
            node_of = {o.order_id: k + 1 for k, o in enumerate(jobs)}
            dummy_self = model.NewBoolVar(f"dummy_self_{machine.machine_id}")
            self.dummy_self[machine.machine_id] = dummy_self
            presents = [self.present[(o.order_id, machine.machine_id)]
                        for o in jobs]
            model.Add(sum(presents) == 0).OnlyEnforceIf(dummy_self)
            model.Add(sum(presents) >= 1).OnlyEnforceIf(dummy_self.Not())
            arcs = [(0, 0, dummy_self)]
            for order in jobs:
                node = node_of[order.order_id]
                pres = self.present[(order.order_id, machine.machine_id)]
                arcs.append((node, node, pres.Not()))
                arc_start = model.NewBoolVar(
                    f"arc_{machine.machine_id}_start_{order.order_id}")
                arc_end = model.NewBoolVar(
                    f"arc_{machine.machine_id}_end_{order.order_id}")
                self.arc_vars[(machine.machine_id, 0, node)] = arc_start
                self.arc_vars[(machine.machine_id, node, 0)] = arc_end
                arcs.append((0, node, arc_start))
                arcs.append((node, 0, arc_end))
            for first in jobs:
                for second in jobs:
                    if first.order_id == second.order_id:
                        continue
                    arc = model.NewBoolVar(
                        f"arc_{machine.machine_id}_{first.order_id}_{second.order_id}")
                    tail, head = node_of[first.order_id], node_of[second.order_id]
                    self.arc_vars[(machine.machine_id, tail, head)] = arc
                    arcs.append((tail, head, arc))
                    setup = self.setup_time(first.product_family,
                                            second.product_family)
                    if setup:
                        setup_terms.append(setup * arc)
                    # Ràng buộc SDST: chỉ áp khi cung này được chọn.
                    model.Add(starts[order_index[second.order_id]]
                              >= ends[order_index[first.order_id]] + setup
                              ).OnlyEnforceIf(arc)
            model.AddCircuit(arcs)
            # Không chồng lấn trên cùng chuyền.
            model.AddNoOverlap(
                [self.intervals[(o.order_id, machine.machine_id)] for o in jobs])

            # Công suất chuyền: tổng giờ gia công + đổi mã không vượt
            # quá max_working_hours * số ngày kế hoạch.
            capacity = machine.max_working_hours * self.num_days
            load_terms = [self.proc[(o.order_id, machine.machine_id)]
                          * self.present[(o.order_id, machine.machine_id)]
                          for o in jobs]
            model.Add(sum(load_terms) <= capacity)

        # --- Tầng 2: Biến bù trễ hạn (soft constraint) -------------------
        # tardiness = max(0, end - due_date). Dùng biến hiệu + AddMaxEquality
        # để giá trị luôn chính xác, không chỉ là cận dưới.
        zero = model.NewConstant(0)
        self.tardiness = []
        for order, end in zip(self.orders, ends):
            diff = model.NewIntVar(-self.horizon, self.horizon,
                                   f"diff_{order.order_id}")
            model.Add(diff == end - order.due_date)
            tardy = model.NewIntVar(0, self.horizon, f"tardy_{order.order_id}")
            model.AddMaxEquality(tardy, [diff, zero])
            self.tardiness.append(tardy)

        # --- Makespan và tổng thời gian đổi mã ---------------------------
        self.makespan = model.NewIntVar(0, self.horizon, "makespan")
        model.AddMaxEquality(self.makespan, ends)
        self.total_setup = model.NewIntVar(0, self.horizon * n, "total_setup")
        model.Add(self.total_setup == sum(setup_terms))

        # --- Tầng 4: Hàm mục tiêu đa tiêu chí ----------------------------
        weighted_tardy = sum(o.priority_weight * t
                             for o, t in zip(self.orders, self.tardiness))
        model.Minimize(W_TARDINESS * weighted_tardy
                       + W_SETUP * self.total_setup
                       + W_MAKESPAN * self.makespan)
        return model

    def _add_hints(self, assignment, sequences):
        """Nạp nghiệm EDD vào CP-SAT bằng AddHint để hội tụ nhanh."""
        model = self.model
        order_index = {o.order_id: i for i, o in enumerate(self.orders)}
        for order in self.orders:
            machine_id, start, end = assignment[order.order_id]
            j = order_index[order.order_id]
            model.AddHint(self.starts[j], start)
            model.AddHint(self.ends[j], end)
            model.AddHint(self.tardiness[j], max(0, end - order.due_date))
            for machine in self.machines:
                key = (order.order_id, machine.machine_id)
                if key in self.present:
                    model.AddHint(self.present[key],
                                  1 if machine.machine_id == machine_id else 0)
        model.AddHint(self.makespan, max(end for _, _, end in assignment.values()))
        # Gợi ý cung mạch: dummy -> lệnh đầu -> ... -> lệnh cuối -> dummy.
        for machine in self.machines:
            seq = sequences[machine.machine_id]
            node_of = {}
            jobs = [o for o in self.orders
                    if o.product_family in machine.eligible_families]
            for k, order in enumerate(jobs):
                node_of[order.order_id] = k + 1
            if machine.machine_id in self.dummy_self:
                model.AddHint(self.dummy_self[machine.machine_id],
                              0 if seq else 1)
            for (mid, tail, head), var in self.arc_vars.items():
                if mid != machine.machine_id:
                    continue
                value = 0
                if seq:
                    nodes = [0] + [node_of[oid] for oid in seq] + [0]
                    pairs = set(zip(nodes, nodes[1:]))
                    if (tail, head) in pairs:
                        value = 1
                model.AddHint(var, value)

    # -- Giải -------------------------------------------------------------
    def solve(self):
        """Xây mô hình, nạp warm-start, giải và trích xuất lịch."""
        self.build_model()
        assignment, sequences = self.build_edd_warmstart()
        self._add_hints(assignment, sequences)

        solver = cp_model.CpSolver()
        solver.parameters.num_search_workers = self.workers
        solver.parameters.max_time_in_seconds = float(self.time_limit)
        solver.parameters.random_seed = 42
        self.solver = solver
        self.status = solver.Solve(self.model)
        if self.status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError(
                f"Không tìm được lịch khả thi (trạng thái: "
                f"{solver.StatusName(self.status)}). Hãy kiểm tra lại "
                "công suất chuyền (max_working_hours) và ma trận đổi mã."
            )
        self.solution = self._extract_solution()
        return self.status

    def _extract_solution(self):
        """Đọc nghiệm: gán chuyền, giờ chạy, giờ đổi mã, độ trễ."""
        solver = self.solver
        assigned = {}
        for order, start, end, tardy in zip(self.orders, self.starts,
                                            self.ends, self.tardiness):
            machine_id = next(
                m.machine_id for m in self.machines
                if (order.order_id, m.machine_id) in self.present
                and solver.Value(self.present[(order.order_id, m.machine_id)]) == 1
            )
            assigned[order.order_id] = {
                "order_id": order.order_id,
                "product_family": order.product_family,
                "quantity": order.quantity,
                "machine_id": machine_id,
                "start": solver.Value(start),
                "end": solver.Value(end),
                "due_date": order.due_date,
                "tardiness": solver.Value(tardy),
                "setup_time": 0,  # Điền ở bước dưới, theo lệnh đứng trước.
            }
        # Giờ đổi mã của mỗi lệnh = setup từ lệnh đứng ngay trước nó
        # trên cùng chuyền (lệnh đầu tiên trên chuyền: setup = 0).
        by_machine = {}
        for row in assigned.values():
            by_machine.setdefault(row["machine_id"], []).append(row)
        orders_by_id = {o.order_id: o for o in self.orders}
        for machine_id, rows in by_machine.items():
            rows.sort(key=lambda r: (r["start"], r["order_id"]))
            previous_family = None
            for row in rows:
                if previous_family is None:
                    row["setup_time"] = 0
                else:
                    row["setup_time"] = self.setup_time(
                        previous_family, row["product_family"])
                previous_family = row["product_family"]
        # Dồn lịch sang trái (left-shift): với cùng thứ tự chạy trên mỗi
        # chuyền, kéo mỗi lệnh về sớm nhất có thể (kẹt bởi release_date
        # và lệnh trước + setup). Việc này không đổi thứ tự, không đổi
        # setup, không tăng end/makespan/trễ của bất kỳ lệnh nào, nên
        # giá trị hàm mục tiêu giữ nguyên, nhưng lịch không còn khoảng
        # trống vô cớ (ví dụ solver để một lệnh bắt đầu muộn chỉ vì
        # bắt đầu muộn cũng không làm tăng makespan).
        for machine_id, rows in by_machine.items():
            rows.sort(key=lambda r: (r["start"], r["order_id"]))
            prev_end = 0  # Lệnh đầu tiên: setup = 0 nên bắt đầu tại release.
            for row in rows:
                order = orders_by_id[row["order_id"]]
                new_start = max(order.release_date, prev_end + row["setup_time"])
                new_end = new_start + self.proc[(row["order_id"], machine_id)]
                row["start"], row["end"] = new_start, new_end
                row["tardiness"] = max(0, new_end - row["due_date"])
                prev_end = new_end
        for row in assigned.values():
            row["status"] = "Trễ" if row["tardiness"] > 0 else "Đúng hạn"
        return [assigned[o.order_id] for o in self.orders]

    # -- 3. ĐẦU RA & CHẨN ĐOÁN ---------------------------------------------
    @property
    def status_name(self):
        return self.solver.StatusName(self.status) if self.solver else "CHƯA GIẢI"

    def solution_objective(self):
        """Hàm mục tiêu tính lại từ lịch đã dồn trái.

        Với nghiệm OPTIMAL thì bằng đúng ObjectiveValue() của solver.
        Với nghiệm FEASIBLE (chưa tối ưu), dồn trái có thể cải thiện
        makespan/trễ thêm 1-2 đơn vị so với nghiệm thô của solver, nên
        giá trị này mới là giá trị khớp với CSV/Gantt đã xuất.
        """
        if not self.solution:
            return None
        weighted_tardy = sum(
            next(o.priority_weight for o in self.orders
                 if o.order_id == r["order_id"]) * r["tardiness"]
            for r in self.solution)
        return (W_TARDINESS * weighted_tardy
                + W_SETUP * sum(r["setup_time"] for r in self.solution)
                + W_MAKESPAN * max(r["end"] for r in self.solution))

    @property
    def mip_gap_percent(self):
        """MIP Gap (%) = |Objective - BestBound| / |Objective| * 100."""
        if self.solver is None:
            return 0.0
        objective = self.solution_objective()
        if objective is None:
            objective = self.solver.ObjectiveValue()
        if objective == 0:
            return 0.0
        bound = self.solver.BestObjectiveBound()
        return abs(objective - bound) / abs(objective) * 100.0

    def machine_loads(self):
        """Thống kê tải từng chuyền để nhận diện nút thắt (bottleneck)."""
        rows = []
        for machine in self.machines:
            jobs = [r for r in self.solution if r["machine_id"] == machine.machine_id]
            orders_by_id = {o.order_id: o for o in self.orders}
            proc_hours = sum(
                self.proc[(r["order_id"], machine.machine_id)] for r in jobs)
            setup_hours = sum(r["setup_time"] for r in jobs)
            capacity = machine.max_working_hours * self.num_days
            rows.append({
                "machine_id": machine.machine_id,
                "num_orders": len(jobs),
                "proc_hours": proc_hours,
                "setup_hours": setup_hours,
                "load_hours": proc_hours + setup_hours,
                "capacity_hours": capacity,
                "utilization_pct": (proc_hours + setup_hours) / capacity * 100.0
                if capacity else 0.0,
            })
        return rows

    def report(self):
        """In báo cáo console chuyên nghiệp."""
        solver = self.solver
        total_tardy = sum(r["tardiness"] for r in self.solution)
        late_count = sum(1 for r in self.solution if r["tardiness"] > 0)
        # Lấy makespan/setup từ lịch đã dồn trái (bằng đúng giá trị
        # solver trong nghiệm tối ưu, nhưng khớp 100% với CSV/Gantt).
        makespan = max(r["end"] for r in self.solution)
        total_setup = sum(r["setup_time"] for r in self.solution)
        loads = self.machine_loads()
        bottleneck = max(loads, key=lambda r: r["utilization_pct"])

        print("=" * 72)
        print("BÁO CÁO LỊCH SẢN XUẤT TỐI ƯU (CP-SAT)")
        print("=" * 72)
        print(f"Trạng thái nghiệm      : {self.status_name}")
        print(f"Hàm mục tiêu Z         : {self.solution_objective():,.0f}")
        if solver.ObjectiveValue() != self.solution_objective():
            print(f"  (Z solver trước dồn trái: {solver.ObjectiveValue():,.0f} "
                  f"— dồn trái cải thiện "
                  f"{solver.ObjectiveValue() - self.solution_objective():,.0f})")
        print(f"Best Bound             : {solver.BestObjectiveBound():,.0f}")
        print(f"MIP Gap                : {self.mip_gap_percent:.2f}%")
        print(f"Thời gian giải         : {solver.WallTime():.2f} giây "
              f"(giới hạn {self.time_limit} giây, {self.workers} luồng)")
        print("-" * 72)
        print(f"Tổng thời gian hoàn thành (Makespan) : {makespan} giờ")
        print(f"Tổng giờ mất do đổi mã (Total Setup) : {total_setup} giờ")
        print(f"Tổng giờ trễ hạn                    : {total_tardy} giờ "
              f"({late_count}/{len(self.solution)} lệnh trễ)")
        print("-" * 72)
        print("TẢI TỪNG CHUYỀN (nhận diện nút thắt):")
        for row in loads:
            mark = "  <-- NÚT THẮT" if row["machine_id"] == bottleneck["machine_id"] else ""
            print(f"  {row['machine_id']:<12} {row['num_orders']:>2} lệnh | "
                  f"gia công {row['proc_hours']:>3} giờ + đổi mã "
                  f"{row['setup_hours']:>2} giờ = {row['load_hours']:>3} giờ / "
                  f"công suất {row['capacity_hours']} giờ "
                  f"({row['utilization_pct']:.1f}%){mark}")
        print("=" * 72)

    def to_dataframe(self):
        """Xuất lịch sản xuất ra pandas DataFrame theo đúng cột yêu cầu."""
        df = pd.DataFrame(self.solution)
        df = df[["order_id", "product_family", "quantity", "machine_id",
                 "start", "setup_time", "end", "due_date", "tardiness", "status"]]
        df.columns = ["Mã đơn", "Nhóm hàng", "Số lượng", "Chuyền",
                      "Giờ bắt đầu", "Giờ đổi mã", "Giờ kết thúc",
                      "Hạn giao", "Trễ (giờ)", "Trạng thái"]
        return df.sort_values(["Chuyền", "Giờ bắt đầu"]).reset_index(drop=True)

    def save_csv(self, path):
        """Lưu lịch sản xuất ra file CSV (UTF-8, đọc tốt bằng Excel)."""
        df = self.to_dataframe()
        df.to_csv(path, index=False, encoding="utf-8-sig")
        return Path(path)

    def plot_gantt(self, path):
        """Vẽ biểu đồ Gantt: màu theo nhóm hàng, khối xám = setup,
        viền đỏ = lệnh trễ hạn, dấu thoi đen = hạn giao."""
        machines = [m.machine_id for m in self.machines]
        y_of = {mid: i for i, mid in enumerate(machines)}
        families = sorted({r["product_family"] for r in self.solution})
        cmap = plt.get_cmap("tab10")
        color_of = {fam: cmap(i % 10) for i, fam in enumerate(families)}

        fig, ax = plt.subplots(figsize=(13, 5.5))
        for row in self.solution:
            y = y_of[row["machine_id"]]
            # Khối xám: khoảng đổi mã đứng ngay trước giờ bắt đầu.
            if row["setup_time"] > 0:
                ax.barh(y, row["setup_time"],
                        left=row["start"] - row["setup_time"],
                        height=0.55, color="#b0b0b0", edgecolor="white",
                        hatch="///")
            # Khối gia công: màu theo nhóm hàng, viền đỏ nếu trễ hạn.
            edge = "red" if row["tardiness"] > 0 else "white"
            width = "2.0" if row["tardiness"] > 0 else "1.0"
            ax.barh(y, row["end"] - row["start"], left=row["start"],
                    height=0.55, color=color_of[row["product_family"]],
                    edgecolor=edge, linewidth=float(width))
            if row["end"] - row["start"] >= 3:
                ax.text((row["start"] + row["end"]) / 2, y, row["order_id"],
                        ha="center", va="center", fontsize=8, color="white",
                        fontweight="bold")
            # Dấu thoi đen tại hạn giao của lệnh đó.
            ax.plot(row["due_date"], y, marker="D", color="black",
                    markersize=4, linestyle="None")
        ax.set_yticks(list(y_of.values()))
        ax.set_yticklabels(machines)
        ax.invert_yaxis()
        ax.set_xlabel("Giờ (mốc 0 = đầu ca kế hoạch)")
        ax.set_ylabel("Chuyền / Máy")
        ax.set_title("Lịch sản xuất tối ưu - Gantt Chart "
                     "(xám gạch = đổi mã, viền đỏ = trễ hạn, thoi đen = hạn giao)")
        ax.grid(axis="x", linestyle="--", alpha=0.4)
        legend = [Patch(facecolor=color_of[f], label=f"Nhóm {f}") for f in families]
        legend.append(Patch(facecolor="#b0b0b0", hatch="///", label="Đổi mã (setup)"))
        legend.append(Patch(facecolor="white", edgecolor="red",
                            label="Lệnh trễ hạn (viền đỏ)"))
        ax.legend(handles=legend, loc="upper right", fontsize=8, ncol=3)
        fig.tight_layout()
        fig.savefig(path, dpi=150)
        plt.close(fig)
        return Path(path)


# ---------------------------------------------------------------------------
# CHẠY CHƯƠNG TRÌNH
# ---------------------------------------------------------------------------
def main():
    """Chạy chương trình.

    Không tham số: chạy dữ liệu mẫu (12 lệnh, 3 chuyền, 4 nhóm hàng).
    Có tham số Excel: chạy dữ liệu thật trong file đó, ví dụ dữ liệu
    TVS do tools/tvs_to_aps.py sinh ra:
        python tools/aps_scheduler.py tools/aps_inputs.xlsx
        python tools/aps_scheduler.py tools/aps_inputs.xlsx --time-limit 120
    """
    import argparse

    parser = argparse.ArgumentParser(description="APS - Lập kế hoạch sản xuất tối ưu (CP-SAT)")
    parser.add_argument("excel", nargs="?", default=None,
                        help="File Excel đầu vào (3 sheet Orders, Machines, Setup). "
                             "Không truyền thì chạy dữ liệu mẫu.")
    parser.add_argument("--time-limit", type=float, default=SOLVER_TIME_LIMIT,
                        help=f"Giới hạn thời gian giải, giây (mặc định {SOLVER_TIME_LIMIT}).")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent
    if args.excel:
        orders, machines, setup_matrix = load_from_excel(args.excel)
        print(f"Dữ liệu Excel {args.excel}: {len(orders)} lệnh, "
              f"{len(machines)} chuyền, {len(setup_matrix)} nhóm hàng.")
    else:
        orders, machines, setup_matrix = generate_sample_data()
        print(f"Dữ liệu mẫu: {len(orders)} lệnh, {len(machines)} chuyền, "
              f"{len(setup_matrix)} nhóm hàng.")
    solver = ProductionSchedulerSolver(orders, machines, setup_matrix,
                                       time_limit=args.time_limit)
    solver.solve()
    solver.report()

    df = solver.to_dataframe()
    print("\nLỊCH SẢN XUẤT CHI TIẾT:")
    print(df.to_string(index=False))

    csv_path = solver.save_csv(base_dir / CSV_FILENAME)
    gantt_path = solver.plot_gantt(base_dir / GANTT_FILENAME)
    print(f"\nĐã lưu lịch sản xuất: {csv_path}")
    print(f"Đã lưu biểu đồ Gantt: {gantt_path}")


if __name__ == "__main__":
    main()
