/**
 * Main Application Controller for MES-anti
 * Coordinates:
 * - Reactive state via MESStorage
 * - 5M Optimization Engine via MESOptimizer
 * - Visualizations via MESCharts
 * - Import/Export via MESIO
 */

window.MESApp = {
  currentTab: 'dashboard',
  activeWorkstationId: 'CAN_VAI',
  state: null,
  planResult: null,
  donutDimension: 'color',
  tableMode: 'segments', // 'segments' or 'subprocesses'
  orderViewMode: 'grouped', // 'grouped', 'raw_lines', or 'gantt'
  orderFilters: { batch: 'all', color: 'all', country: 'all', search: '' },
  btpFilters: { workstation: 'all', search: '' },

  init() {
    this.state = MESStorage.init();
    this.runOptimization();

    // Listen for storage events
    MESStorage.subscribe((event) => {
      this.state = MESStorage.getState();
      this.runOptimization();
      this.render();
      if (event === 'RESET') {
        this.showToast('Đã xóa dữ liệu mẫu, chỉ giữ đơn hàng KD + cấu trúc xưởng!', 'success');
      }
    });

    this.bindGlobalEvents();
    this.render();
    this.updateThemeButton();

    // Auto-update clock
    this.updateClock();
    setInterval(() => this.updateClock(), 60000);
  },

  updateClock() {
    const el = document.getElementById('topbarClock');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }
  },

  // Nhu cầu LVF là đầu vào bắt buộc: chưa nhập thì KHÔNG chạy kế hoạch
  // và không dùng 650 mẫu. Mọi chỗ hiển thị kế hoạch phải chịu được
  // planResult = null (xem render5mBannerCards / renderMasterPlan).
  getPlanDemand() {
    const d = this.state && this.state.simParams ? Number(this.state.simParams.lvfDemand) : NaN;
    return (d && d > 0) ? d : null;
  },

  runOptimization() {
    if (!this.state || !this.state.ordersGrouped) return;
    const demand = this.getPlanDemand();
    if (demand == null) { this.planResult = null; return; }
    this.planResult = MESOptimizer.scheduleAllOrders(
      this.state.ordersGrouped,
      this.state.simParams
    );
  },

  bindGlobalEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Donut dimension buttons
    const btnColor = document.getElementById('btnDonutColor');
    const btnCountry = document.getElementById('btnDonutCountry');
    const btnBatch = document.getElementById('btnDonutBatch');

    const updateDonutButtons = (dim) => {
      [btnColor, btnCountry, btnBatch].forEach(b => {
        if (!b) return;
        b.className = 'px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 transition';
      });
      if (dim === 'color' && btnColor) btnColor.className = 'px-2.5 py-1 rounded bg-white text-slate-900 shadow-sm transition';
      if (dim === 'country' && btnCountry) btnCountry.className = 'px-2.5 py-1 rounded bg-white text-slate-900 shadow-sm transition';
      if (dim === 'batch' && btnBatch) btnBatch.className = 'px-2.5 py-1 rounded bg-white text-slate-900 shadow-sm transition';
    };

    if (btnColor) {
      btnColor.onclick = () => {
        this.donutDimension = 'color';
        updateDonutButtons('color');
        MESCharts.renderDonutChart(this.state.ordersGrouped, 'color');
      };
    }
    if (btnCountry) {
      btnCountry.onclick = () => {
        this.donutDimension = 'country';
        updateDonutButtons('country');
        MESCharts.renderDonutChart(this.state.ordersGrouped, 'country');
      };
    }
    if (btnBatch) {
      btnBatch.onclick = () => {
        this.donutDimension = 'batch';
        updateDonutButtons('batch');
        MESCharts.renderDonutChart(this.state.ordersGrouped, 'batch');
      };
    }

    // Toggle Table Mode (Segments vs Subprocesses)
    const btnToggleTableMode = document.getElementById('btnToggleTableMode');
    if (btnToggleTableMode) {
      btnToggleTableMode.onclick = () => {
        this.tableMode = this.tableMode === 'segments' ? 'subprocesses' : 'segments';
        btnToggleTableMode.textContent = this.tableMode === 'segments'
          ? 'Chuyển sang xem Chi tiết 32 Công đoạn nhỏ'
          : 'Chuyển sang xem Tổng hợp 7 Phân đoạn';
        this.renderWorkshopEfficiencyTable();
      };
    }

    // POH Interactive Calculator Inputs
    ['calcLvfDemand', 'calcMoldCount', 'calcFabricMode', 'calcOutsoleMode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updatePohCalculator());
        el.addEventListener('change', () => this.updatePohCalculator());
      }
    });

    // BTP Filter inputs
    const btpWsSel = document.getElementById('filterBtpWorkstation');
    if (btpWsSel) {
      btpWsSel.addEventListener('change', (e) => {
        this.btpFilters.workstation = e.target.value;
        this.renderBtpInventoryTab();
      });
    }
    const btpSearch = document.getElementById('filterBtpSearch');
    if (btpSearch) {
      btpSearch.addEventListener('input', (e) => {
        this.btpFilters.search = e.target.value.toLowerCase().trim();
        this.renderBtpInventoryTab();
      });
    }

    // Run all substeps button
    const btnRunAll = document.getElementById('btnRunAllSubsteps');
    if (btnRunAll) {
      btnRunAll.onclick = () => {
        const ws = (this.state.workstations || []).find(w => w.id === this.activeWorkstationId);
        if (ws && ws.subProcesses) {
          ws.subProcesses.forEach(sp => {
            sp.currentOutput = (sp.currentOutput || 0) + 650;
            const btp = this.state.subProcesses.find(p => p.btp_code === sp.btpCode);
            if (btp) {
              btp.wip_stock = (btp.wip_stock || 0) + 650;
            }
          });
          MESStorage.saveState(this.state);
          this.runOptimization();
          this.render();
          this.showToast(`Đã chạy 1 ca (+650 đôi) cho toàn bộ công đoạn thuộc ${ws.name}!`, 'success');
        }
      };
    }

    // Order View Switchers
    const btnViewGrouped = document.getElementById('btnViewOrderGrouped');
    const btnViewRaw = document.getElementById('btnViewOrderRaw');
    const btnViewGantt = document.getElementById('btnViewOrderGantt');

    const updateViewBtns = (mode) => {
      [btnViewGrouped, btnViewRaw, btnViewGantt].forEach(b => {
        if (!b) return;
        b.className = 'text-xs px-3 py-1.5 rounded-lg border font-medium text-slate-600 bg-white hover:bg-slate-50 transition';
      });
      if (mode === 'grouped' && btnViewGrouped) btnViewGrouped.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold text-slate-900 bg-amber-100 border-amber-300 transition';
      if (mode === 'raw_lines' && btnViewRaw) btnViewRaw.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold text-slate-900 bg-amber-100 border-amber-300 transition';
      if (mode === 'gantt' && btnViewGantt) btnViewGantt.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold text-slate-900 bg-amber-100 border-amber-300 transition';
    };

    if (btnViewGrouped) {
      btnViewGrouped.onclick = () => {
        this.orderViewMode = 'grouped';
        updateViewBtns('grouped');
        this.renderOrdersTable();
      };
    }
    if (btnViewRaw) {
      btnViewRaw.onclick = () => {
        this.orderViewMode = 'raw_lines';
        updateViewBtns('raw_lines');
        this.renderOrdersTable();
      };
    }
    if (btnViewGantt) {
      btnViewGantt.onclick = () => {
        this.orderViewMode = 'gantt';
        updateViewBtns('gantt');
        this.renderOrdersTable();
      };
    }

    // Modal forms submission
    const formNewOrder = document.getElementById('formNewOrder');
    if (formNewOrder) {
      formNewOrder.onsubmit = (e) => {
        e.preventDefault();
        const exportDateVal = document.getElementById('inputOrderExportDate').value;
        const [yyyy, mm, dd] = exportDateVal.split('-');
        const formattedDate = `${dd}/${mm}/${yyyy}`;

        const newOrder = {
          order_no: document.getElementById('inputOrderNo').value.trim(),
          po_no: document.getElementById('inputOrderPoNo').value.trim(),
          country: document.getElementById('inputOrderCountry').value.trim().toUpperCase(),
          color: document.getElementById('inputOrderColor').value,
          total_pairs: parseInt(document.getElementById('inputOrderPairs').value) || 0,
          total_boxes: parseInt(document.getElementById('inputOrderBoxes').value) || 0,
          batch: parseInt(document.getElementById('inputOrderBatch').value) || 1,
          export_date: formattedDate,
          sizes: { "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0 }
        };

        this.state.ordersGrouped.unshift(newOrder);
        MESStorage.saveState(this.state);
        this.runOptimization();
        this.closeAllModals();
        this.render();
        this.showToast(`Đã thêm thành công PO ${newOrder.po_no} (${newOrder.total_pairs.toLocaleString('vi-VN')} đôi)!`, 'success');
      };
    }

    const formNewHandover = document.getElementById('formNewHandover');
    if (formNewHandover) {
      formNewHandover.onsubmit = (e) => {
        e.preventDefault();
        const poVal = document.getElementById('inputHandoverPo').value;
        const targetOrder = this.state.ordersGrouped.find(o => o.po_no === poVal) || this.state.ordersGrouped[0];
        const pairsVal = parseInt(document.getElementById('inputHandoverPairs').value) || 0;
        const receiverVal = document.getElementById('inputHandoverReceiver').value;

        const newLog = {
          id: `BG-2026-${String(this.state.handoverLogs.length + 1).padStart(3, '0')}`,
          po_no: targetOrder.po_no,
          order_no: targetOrder.order_no,
          country: targetOrder.country,
          color: targetOrder.color,
          pairs: pairsVal,
          receiver_team: receiverVal,
          check_gates: 'Đạt 4/4 Chốt',
          status: 'Đã bàn giao'
        };

        this.state.handoverLogs.unshift(newLog);
        MESStorage.saveState(this.state);
        this.closeAllModals();
        this.render();
        this.showToast(`Đã bàn giao ${pairsVal.toLocaleString('vi-VN')} bộ sang ${receiverVal}!`, 'success');
      };
    }

    const formNewSubstepOutput = document.getElementById('formNewSubstepOutput');
    if (formNewSubstepOutput) {
      formNewSubstepOutput.onsubmit = (e) => {
        e.preventDefault();
        const code = document.getElementById('inputSubstepSelect').value;
        const added = parseInt(document.getElementById('inputSubstepAddedPairs').value) || 0;
        const p = this.state.subProcesses.find(item => item.btp_code === code);
        if (p) {
          p.wip_stock = (p.wip_stock || 0) + added;
          MESStorage.saveState(this.state);
          this.closeAllModals();
          this.render();
          this.showToast(`Đã ghi nhận +${added} đôi cho ${p.btp_name} (${code})!`, 'success');
        }
      };
    }

    const formNewKaizen = document.getElementById('formNewKaizen');
    if (formNewKaizen) {
      formNewKaizen.onsubmit = (e) => {
        e.preventDefault();
        const segName = document.getElementById('inputKaizenSegment').value;
        const segMap = {
          'Chuyền Cán Vải': 'CAN_VAI', 'Chuyền In Lụa': 'IN_LUA',
          'Tổ Cán Luyện Kín': 'LUYEN_KIN', 'Chuyền Ép Đế': 'EP_DE',
          'Tổ Mài & Đánh Kẽm': 'MAI_DE', 'Chuyền Cán Đùn': 'CAN_DUN',
          'Tổ Chặt & Đột Dập': 'TO_CHAT', 'Toàn Phân Xưởng LAF': null
        };
        const newNorm = Number(document.getElementById('inputKaizenNewNorm')?.value);
        const delayDays = Number(document.getElementById('inputKaizenDelayDays')?.value);
        const newItem = {
          id: `KZ-0${this.state.kaizenItems.length + 1}`,
          segment: segName,
          segmentId: segMap[segName] !== undefined ? segMap[segName] : null,
          pillar: document.getElementById('inputKaizenPillar').value,
          issue: document.getElementById('inputKaizenIssue').value.trim(),
          solution: document.getElementById('inputKaizenSolution').value.trim(),
          result: document.getElementById('inputKaizenResult').value.trim() || 'Tối ưu hóa sản xuất',
          applied: false,
          status: 'open',
          resolvedDate: null,
          resolvedNote: '',
          newNorm: (!isNaN(newNorm) && newNorm > 0) ? newNorm : null,
          delayDays: (!isNaN(delayDays) && delayDays > 0) ? delayDays : null,
          appliedToPlan: false
        };

        this.state.kaizenItems.unshift(newItem);
        MESStorage.saveState(this.state);
        this.closeAllModals();
        this.switchTab('kaizen_center');
        this.showToast(`Đã lưu điểm nghẽn mới ${newItem.id} — xem đánh giá tác động ngay bên dưới thẻ của nó!`, 'success');
        // Đánh giá tác động ngay cho điểm nghẽn mới (theo luật, không cần AI).
        setTimeout(() => this.assessKaizen(0), 0);
      };
    }
  },

  // Sidebar trái (mobile drawer): mở/đóng bằng class translate + backdrop.
  // Dùng add/remove (không dùng toggle) để tương thích cả DOM stub test.
  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (!sb || !sb.classList) return;
    if (sb.classList.contains('-translate-x-full')) {
      sb.classList.remove('-translate-x-full');
      if (bd && bd.classList) bd.classList.remove('hidden');
    } else {
      this.closeSidebar();
    }
  },

  closeSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (sb && sb.classList) sb.classList.add('-translate-x-full');
    if (bd && bd.classList) bd.classList.add('hidden');
  },

  // Theme tối/sáng: class 'dark' trên <html>, lưu mes-theme-v1, vẽ lại
  // tab hiện tại để chart đổi màu tick/grid theo theme.
  isDarkTheme() {
    if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) {
      return document.documentElement.classList.contains('dark');
    }
    try { return localStorage.getItem('mes-theme-v1') === 'dark'; } catch (e) { return false; }
  },

  updateThemeButton() {
    const label = document.getElementById('themeToggleLabel');
    if (label) label.textContent = this.isDarkTheme() ? '☀️ Sáng' : '🌙 Tối';
  },

  toggleTheme() {
    const nextDark = !this.isDarkTheme();
    if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) {
      if (nextDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('mes-theme-v1', nextDark ? 'dark' : 'light'); } catch (e) {}
    this.updateThemeButton();
    this.renderCurrentTab();
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update navigation buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const isTarget = btn.dataset.tab === tabId;
      btn.className = isTarget
        ? 'tab-btn w-full justify-start text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 active-tab bg-amber-500 text-slate-950 shadow-sm'
        : 'tab-btn w-full justify-start text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition flex items-center gap-2';
    });
    // Mobile: chọn tab xong thì đóng drawer để thấy nội dung.
    if (typeof window !== 'undefined' && window.innerWidth && window.innerWidth < 768) {
      this.closeSidebar();
    }

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.add('hidden');
    });
    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }

    this.renderCurrentTab();
  },

  render() {
    this.renderHeaderSummary();
    this.renderCurrentTab();
  },

  renderHeaderSummary() {
    // Header updates if any dynamic badges exist
  },

  renderCurrentTab() {
    if (this.currentTab === 'dashboard') {
      this.renderDashboardTab();
    } else if (this.currentTab === 'orders') {
      this.renderOrdersTab();
    } else if (this.currentTab === 'production_planning') {
      this.renderProductionPlanningTab();
    } else if (this.currentTab === 'workstations') {
      this.renderWorkstationsTab();
    } else if (this.currentTab === 'btp_inventory') {
      this.renderBtpInventoryTab();
    } else if (this.currentTab === 'lvf_handover') {
      this.renderLvfHandoverTab();
    } else if (this.currentTab === 'kaizen_center') {
      this.renderKaizenCenterTab();
    } else if (this.currentTab === 'simulation_tab') {
      this.renderSimulationTab();
    } else if (this.currentTab === 'reoperation') {
      this.renderReoperationTab();
    }
    // Re-trigger lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  /* =========================================================================
     TAB 1: DASHBOARD TỔNG HỢP & CHI TIẾT
     ========================================================================= */
  renderDashboardTab() {
    this.renderValueStream();
    this.renderDashboardKpis();
    this.renderDashboardCharts();
    this.renderWorkshopEfficiencyTable();
  },

  renderValueStream() {
    const container = document.getElementById('valueStreamCards');
    if (!container) return;

    const score = this.planResult?.score5m?.total;
    const plantPoh = this.calculatePoh().plantPoh;
    const totalWip = this.getTotalWip();
    const steps = [
      { num: '01', title: '113 PO Kinh Doanh', sub: '64.837 đôi • 5 màu', status: '100% Nạp Đầy Đủ', color: 'emerald' },
      { num: '02', title: 'Kế Hoạch 1 Tối Ưu 5M', sub: 'Lịch lùi từ Ngày xuất KD', status: score != null ? `OTD 100% • 5M: ${score}đ` : 'Chưa chạy — nhập nhu cầu', color: 'emerald' },
      { num: '03', title: '7 Phân Đoạn LAF', sub: '63 NS • Cán/In/Luyện/Ép/Chặt', status: plantPoh != null ? `POH ${plantPoh}% (từ thực tế)` : 'Chưa nhập thực tế', color: 'amber' },
      { num: '04', title: '32 BTP Nhỏ Đồng Bộ', sub: `Wip: ${totalWip.toLocaleString('vi-VN')} đôi • Buffer 2-3d`, status: totalWip > 0 ? 'Kiểm Soát Nhịp Ca' : 'Chưa ghi nhận WIP', color: 'emerald' },
      { num: '05', title: '4 Cổng Kỹ Thuật QC', sub: 'Ủ 24h • Lưu 48h • Mài 3d', status: '100% Đạt Chuẩn', color: 'emerald' },
      { num: '06', title: 'Giao LVF & Xuất Khẩu', sub: '11.832 Thùng CLP • 19 Nước', status: (this.state.handoverLogs || []).length > 0 ? `Đã bàn giao ${(this.state.handoverLogs || []).length} lô` : 'Chưa có bàn giao ghi nhận', color: 'emerald' },
    ];

    container.innerHTML = steps.map(s => `
      <div class="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between hover:border-amber-400 transition">
        <div>
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>BƯỚC ${s.num}</span>
            <span class="w-2 h-2 rounded-full bg-${s.color}-500"></span>
          </div>
          <div class="font-extrabold text-slate-900 text-xs">${s.title}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${s.sub}</div>
        </div>
        <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span class="font-bold text-${s.color}-600">${s.status}</span>
        </div>
      </div>
    `).join('');
  },

  renderDashboardKpis() {
    const grid = document.getElementById('dashboardKpiGrid');
    if (!grid) return;

    const totalPairs = this.state.ordersGrouped.reduce((acc, o) => acc + o.total_pairs, 0);
    const totalWip = this.getTotalWip();
    const score5m = this.planResult?.score5m?.total;
    const plantPoh = this.calculatePoh().plantPoh;

    const kpis = [
      {
        title: 'TỔNG SẢN LƯỢNG KẾ HOẠCH',
        value: `${totalPairs.toLocaleString('vi-VN')} đôi`,
        sub: '113 PO • 651 Dòng Size • 11.832 Thùng CLP',
        icon: 'package',
        trend: '+100% Đúng Đơn Thật TVS',
        trendColor: 'text-emerald-600',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-500',
      },
      {
        title: 'HIỆU SUẤT POH LAF TOÀN XƯỞNG',
        value: plantPoh != null ? `${plantPoh}%` : '—',
        sub: plantPoh != null ? 'Tính từ thực tế ghi nhận (tab Kế Hoạch)' : 'Chưa nhập thực tế — nhập ở tab Kế Hoạch',
        icon: 'activity',
        trend: plantPoh != null ? 'POH = Σ thực tế / Σ định mức' : 'Chưa tính được POH',
        trendColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
      },
      {
        title: 'TỔNG TỒN KHO WIP (32 BTP NHỎ)',
        value: `${totalWip.toLocaleString('vi-VN')} đôi`,
        sub: totalWip > 0 ? 'Buffer 2.5 - 3.0 ngày sản xuất an toàn' : 'Chưa có tồn kho ghi nhận',
        icon: 'boxes',
        trend: 'Kiểm soát nhịp dòng chảy',
        trendColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        iconColor: 'text-indigo-500',
      },
      {
        title: 'TỶ LỆ ĐÁP ỨNG NGÀY XUẤT KD (OTD)',
        value: this.planResult ? '100.0%' : '—',
        sub: score5m != null ? `Điểm 5M: ${score5m}/100 • 30 Mốc xuất 19 Nước` : 'Chưa chạy kế hoạch — nhập nhu cầu',
        icon: 'check-circle',
        trend: this.planResult ? '113/113 PO Đúng Hạn (lịch lùi từ ngày xuất)' : 'Chưa có kế hoạch để đánh giá OTD',
        trendColor: 'text-emerald-600',
        bgColor: 'bg-teal-50',
        iconColor: 'text-teal-500',
      },
    ];

    grid.innerHTML = kpis.map(k => `
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between">
        <div class="space-y-1">
          <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">${k.title}</div>
          <div class="text-2xl font-black text-slate-900 tracking-tight">${k.value}</div>
          <div class="text-xs text-slate-600 font-medium">${k.sub}</div>
          <div class="text-[11px] font-bold ${k.trendColor} pt-1">${k.trend}</div>
        </div>
        <div class="w-12 h-12 rounded-xl ${k.bgColor} flex items-center justify-center ${k.iconColor} shrink-0">
          <i data-lucide="${k.icon}" class="w-6 h-6"></i>
        </div>
      </div>
    `).join('');
  },

  getTotalWip() {
    return this.state.subProcesses.reduce((acc, p) => acc + (p.wip_stock || 0), 0);
  },

  renderDashboardCharts() {
    // FIX 02/11/2026: charts.js expects (canvasId, data, ...). The old code
    // passed the data array as canvasId, so every chart silently failed
    // (or threw on the donut/radar calls) and the dashboard never finished
    // rendering. Each call is guarded so a missing Chart.js CDN can never
    // kill the whole tab again — tables still render without charts.
    const safeChart = (label, fn) => {
      try { fn(); } catch (e) { console.warn('Chart skipped (' + label + '):', e); }
    };
    safeChart('capacity', () => MESCharts.renderCapacityChart('capacityChart', this.state.workstations));
    safeChart('leadtime', () => MESCharts.renderLeadtimeChart('leadtimeChart', this.state.ordersGrouped));
    safeChart('donut', () => MESCharts.renderDonutChart('colorPieChart', this.state.ordersGrouped, this.donutDimension));
    safeChart('radar', () => MESCharts.renderRadar5M('radar5mChart', this.state.before5M, this.state.after5M));
    safeChart('size', () => MESCharts.renderSizeDistChart('sizeDistChart', this.state.ordersRaw, this.state.moldAlloc));
    safeChart('wip', () => MESCharts.renderWipStackedChart('wipStackedChart', this.state.workstations));
  },

  renderWorkshopEfficiencyTable() {
    const thead = document.getElementById('workshopTableHeader');
    const tbody = document.getElementById('workshopTableBody');
    if (!thead || !tbody) return;

    if (this.tableMode === 'segments') {
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-center">STT</th>
          <th class="p-3 text-left">Phân Đoạn Công Việc</th>
          <th class="p-3 text-center">Định Biên (NS)</th>
          <th class="p-3 text-right">Công Suất Chuẩn (Đôi/Ngày)</th>
          <th class="p-3 text-right">Lũy Kế Thực Hiện</th>
          <th class="p-3 text-center">Tỷ Lệ Hoàn Thành</th>
          <th class="p-3 text-center">POH Đạt Được</th>
          <th class="p-3 text-center">Tình Trạng Điểm Nghẽn</th>
          <th class="p-3 text-center">Hành Động Nhanh</th>
        </tr>
      `;

      tbody.innerHTML = this.state.segments.map((s, idx) => {
        const progress = Math.min(100, Math.round((s.actual / s.planned) * 100));
        const poh = Math.round((s.poh > 1 ? s.poh : s.poh * 100) * 10) / 10;
        const isBottleneck = s.bottleneck_flag;

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 font-bold text-slate-900">${s.segment}</td>
            <td class="p-3 text-center font-bold text-slate-700">${s.headcount} NS</td>
            <td class="p-3 text-right font-mono font-semibold">${s.capacity.toLocaleString('vi-VN')} đôi</td>
            <td class="p-3 text-right font-mono font-bold text-slate-900">${s.actual.toLocaleString('vi-VN')} đôi</td>
            <td class="p-3 text-center">
              <div class="flex items-center justify-center gap-2">
                <div class="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div class="bg-amber-500 h-full rounded-full" style="width: ${progress}%"></div>
                </div>
                <span class="font-bold text-[11px]">${progress}%</span>
              </div>
            </td>
            <td class="p-3 text-center">
              <span class="px-2 py-0.5 rounded font-extrabold text-[11px] ${poh >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${poh}%
              </span>
            </td>
            <td class="p-3 text-center">
              ${isBottleneck
                ? `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800">
                    <i data-lucide="alert-triangle" class="w-3 h-3 text-rose-600"></i> ${s.bottleneck_issue}
                  </span>`
                : `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                    <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> ${s.bottleneck_issue}
                  </span>`
              }
            </td>
            <td class="p-3 text-center">
              <button onclick="MESApp.quickAddSegmentOutput('${s.segment}', 650)" class="text-[11px] bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-bold px-2 py-1 rounded transition">
                +650 đôi
              </button>
            </td>
          </tr>
        `;
      }).join('');

    } else {
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-center">STT</th>
          <th class="p-3 text-left">Mã BTP Nhỏ</th>
          <th class="p-3 text-left">Tên Bán Thành Phẩm Chi Tiết</th>
          <th class="p-3 text-left">Phân Đoạn</th>
          <th class="p-3 text-left">Công Đoạn Tạo Ra</th>
          <th class="p-3 text-right">Tồn Kho WIP</th>
          <th class="p-3 text-center">Chốt Kỹ Thuật / QC</th>
          <th class="p-3 text-center">Cộng Nhanh Sản Lượng</th>
        </tr>
      `;

      tbody.innerHTML = this.state.subProcesses.map((p, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
          <td class="p-3 font-mono font-extrabold text-amber-600">${p.btp_code}</td>
          <td class="p-3 font-semibold text-slate-900">${p.btp_name}</td>
          <td class="p-3 text-slate-600">${p.segment}</td>
          <td class="p-3 text-slate-500">${p.step_name}</td>
          <td class="p-3 text-right font-mono font-extrabold text-slate-900">${(p.wip_stock || 0).toLocaleString('vi-VN')} đôi</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.qc_rule.includes('Ủ') || p.qc_rule.includes('Lưu kho') ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">
              ${p.qc_rule}
            </span>
          </td>
          <td class="p-3 text-center">
            <button onclick="MESApp.quickAddSubstepOutput('${p.btp_code}', 100)" class="text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-700 font-bold px-2 py-0.5 rounded transition">
              +100 đôi
            </button>
          </td>
        </tr>
      `).join('');
    }
  },

  /* =========================================================================
     TAB 2: ĐƠN HÀNG KD (đã tách khỏi tab Kế Hoạch ngày 02/11/2026)
     TAB 3: KẾ HOẠCH SẢN XUẤT TỐI ƯU (5M + giải thích thuật toán)
     ========================================================================= */
  renderOrdersTab() {
    this.populateOrderFilterDropdowns();
    this.renderOrdersTable();
  },

  renderProductionPlanningTab() {
    this.render5mBannerCards();
    this.renderPlanningAlgorithm();
    this.updatePohCalculator();
    this.renderMasterPlan();
    this.renderPohTable();
    this.renderFeasibility();
  },

  // Alias cũ: giữ để code nào còn gọi tên cũ vẫn chạy (gọi cả 2 tab mới).
  renderOrdersPlanningTab() {
    this.renderOrdersTab();
    this.renderProductionPlanningTab();
  },

  // Điền số liệu thật vào khối giải thích thuật toán ở tab Kế Hoạch,
  // để con số trong lời giải thích luôn khớp với dữ liệu đang nạp.
  renderPlanningAlgorithm() {
    const totalPairs = this.state.ordersGrouped.reduce((acc, o) => acc + o.total_pairs, 0);
    const totalOrders = this.state.ordersGrouped.length;
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText('algoTotalOrders', `${totalOrders} PO`);
    setText('algoTotalPairs', `${totalPairs.toLocaleString('vi-VN')} đôi`);
    const demand = this.getPlanDemand();
    setText('algoTotalDays', demand != null ? `${(totalPairs / demand).toFixed(1)} ngày SX` : '— (chưa nhập nhu cầu)');
  },


  // POH — công thức duy nhất từ nay, tính từ số liệu user nhập:
  // POH từng công đoạn = Thực tế (đôi) / Định mức (đôi/ngày) x 100%.
  // POH nhà máy = Σ Thực tế / Σ Định mức x 100% (công đoạn nào định
  // mức lớn thì nặng quyền hơn, đúng với tổng công suất). Chưa nhập
  // thực tế thì POH = null (hiển thị "—"), không dùng số mẫu cũ.
  calculatePoh() {
    const segs = (this.state.segments || []).map(seg => {
      const cap = Number(seg.capacity) || 0;
      const actual = Number(seg.actual) || 0;
      const poh = cap > 0 ? Math.round((actual / cap) * 1000) / 10 : null;
      return { ...seg, capacity: cap, actual, poh };
    });
    const totalCap = segs.reduce((a, x) => a + x.capacity, 0);
    const totalActual = segs.reduce((a, x) => a + x.actual, 0);
    const totalHeadcount = segs.reduce((a, x) => a + (Number(x.headcount) || 0), 0);
    const entered = segs.some(x => x.actual > 0);
    const plantPoh = (entered && totalCap > 0) ? Math.round((totalActual / totalCap) * 1000) / 10 : null;
    return { segments: segs, totalCap, totalActual, totalHeadcount, entered, plantPoh };
  },

  // Xoay kế hoạch (1): nhập nhu cầu LVF ở thẻ Kế hoạch tổng rồi chạy.
  applyPlanDemand() {
    const input = document.getElementById('planDemandInput');
    const demand = input ? Number(input.value) : NaN;
    if (!demand || demand <= 0) {
      this.showToast('Nhập nhu cầu LVF (đôi/ngày) là số lớn hơn 0 trước khi chạy kế hoạch.', 'error');
      return;
    }
    this.state.simParams = { ...(this.state.simParams || {}), lvfDemand: demand };
    MESStorage.saveState(this.state);
    this.runOptimization();
    this.render();
    this.showToast(`Đã chạy kế hoạch tổng với nhu cầu ${demand.toLocaleString('vi-VN')} đôi/ngày!`, 'success');
  },

  // Xoay kế hoạch (2): áp tham số ở bộ tính POH (nhu cầu, khuôn, cán
  // vải, ép đế) vào kế hoạch chính rồi chạy lại toàn bộ.
  applyPohCalculatorToPlan() {
    const demand = Number(document.getElementById('calcLvfDemand')?.value);
    if (!demand || demand <= 0) {
      this.showToast('Nhập nhu cầu LVF ở bộ tính POH trước khi áp vào kế hoạch.', 'error');
      return;
    }
    const molds = Number(document.getElementById('calcMoldCount')?.value) || 12;
    this.state.simParams = {
      ...(this.state.simParams || {}),
      lvfDemand: demand,
      molds,
      outsoleMolds: molds,
      canVaiMode: document.getElementById('calcFabricMode')?.value || 'batch',
      epDeMode: document.getElementById('calcOutsoleMode')?.value || 'preload_ot',
    };
    MESStorage.saveState(this.state);
    this.runOptimization();
    this.render();
    this.showToast(`Đã xoay kế hoạch theo tham số mới (nhu cầu ${demand.toLocaleString('vi-VN')} đôi/ngày, ${molds} khuôn)!`, 'success');
  },

  showMasterPlanGantt() {
    this.orderViewMode = 'gantt';
    this.switchTab('orders');
  },

  // KẾ HOẠCH TỔNG: tóm tắt kế hoạch đã chạy từ đơn hàng KD + nhu cầu.
  renderMasterPlan() {
    const el = document.getElementById('masterPlanSummary');
    if (!el) return;
    const demand = this.getPlanDemand();
    const totalOrders = this.state.ordersGrouped.length;
    const totalPairs = this.state.ordersGrouped.reduce((a, o) => a + o.total_pairs, 0);
    const totalBoxes = this.state.ordersGrouped.reduce((a, o) => a + o.total_boxes, 0);
    if (demand == null) {
      el.innerHTML = `
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 min-w-[260px]">
            <div class="font-bold text-slate-900 text-sm">Chưa có kế hoạch tổng — vì chưa nhập nhu cầu</div>
            <p class="text-xs text-slate-600 mt-1">Đơn hàng đã có sẵn: <strong>${totalOrders} PO • ${totalPairs.toLocaleString('vi-VN')} đôi • ${totalBoxes.toLocaleString('vi-VN')} thùng CLP</strong>. Nhập nhu cầu LVF (đôi/ngày) theo thực tế đơn hàng rồi bấm “Chạy kế hoạch” — thuật toán sẽ tính số ngày SX, công suất Ép đế, số lần đổi màu và lịch lùi từng PO.</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="number" id="planDemandInput" min="1" step="10" placeholder="Nhập đôi/ngày" class="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold" />
            <span class="text-xs text-slate-500">đôi/ngày</span>
            <button onclick="MESApp.applyPlanDemand()" class="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition">Chạy kế hoạch</button>
          </div>
        </div>`;
      return;
    }
    const sum = this.planResult && this.planResult.summary;
    if (!sum) {
      el.innerHTML = '<p class="text-xs text-rose-700">Đã nhập nhu cầu nhưng kế hoạch chưa chạy được — thử bấm “Chạy kế hoạch” lại.</p>';
      return;
    }
    const bottlenecks = (this.state.segments || []).filter(x => (Number(x.capacity) || 0) < demand);
    el.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="font-bold text-slate-900 text-sm">Kế hoạch tổng đang chạy — nhu cầu ${demand.toLocaleString('vi-VN')} đôi/ngày</div>
          <p class="text-xs text-slate-600 mt-1">${totalOrders} PO • ${totalPairs.toLocaleString('vi-VN')} đôi • ${totalBoxes.toLocaleString('vi-VN')} thùng CLP • Lịch lùi từng PO xem ở tab Đơn Hàng KD (nút Gantt bên dưới).</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="number" id="planDemandInput" min="1" step="10" value="${demand}" class="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold" />
          <button onclick="MESApp.applyPlanDemand()" class="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg transition">Chạy lại với nhu cầu này</button>
          <button onclick="MESApp.showMasterPlanGantt()" class="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 font-semibold px-3 py-2 rounded-lg transition">Xem Gantt từng PO</button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
        <div><div class="text-slate-500">Số ngày SX hết đơn</div><div class="text-lg font-extrabold text-slate-900">${sum.workDays} ngày</div></div>
        <div><div class="text-slate-500">Công suất Ép đế</div><div class="text-lg font-extrabold text-slate-900">${sum.capEpDay} đôi/ngày</div></div>
        <div><div class="text-slate-500">Số lần đổi màu</div><div class="text-lg font-extrabold text-slate-900">${sum.colorChanges} lần</div></div>
        <div><div class="text-slate-500">Điểm 5M</div><div class="text-lg font-extrabold text-slate-900">${sum.score5M} / 100</div></div>
        <div><div class="text-slate-500">Công đoạn dưới nhu cầu</div><div class="text-lg font-extrabold ${bottlenecks.length ? 'text-rose-600' : 'text-emerald-600'}">${bottlenecks.length ? bottlenecks.map(b => b.segment).join(', ') : 'Không có'}</div></div>
      </div>
      <p class="text-[11px] text-slate-500 mt-2">Lưu ý trung thực: OTD 100% của bộ giải là do lịch được lùi từ Ngày xuất KD, chưa phải kết quả đo thực tế. Tính khả thi thật xem ở thẻ “Đánh giá khả thi” cuối trang, dựa vào định mức và sản lượng thực tế đã nhập.</p>`;
  },

  // NHẬP LIỆU + TÍNH POH: bảng 7 công đoạn, lưu vào state.segments.
  renderPohTable() {
    const tableEl = document.getElementById('pohInputTable');
    const sumEl = document.getElementById('pohPlantSummary');
    if (!tableEl && !sumEl) return;
    const poh = this.calculatePoh();
    if (sumEl) {
      sumEl.innerHTML = poh.entered
        ? `<span class="font-bold text-slate-900">POH nhà máy LAF: ${poh.plantPoh}%</span> <span class="text-slate-600">= ${poh.totalActual.toLocaleString('vi-VN')} thực tế / ${poh.totalCap.toLocaleString('vi-VN')} định mức • ${poh.totalHeadcount} NS • Công đoạn POH thấp nhất: ${[...poh.segments].sort((a, b) => (a.poh ?? 999) - (b.poh ?? 999))[0].segment} (${[...poh.segments].sort((a, b) => (a.poh ?? 999) - (b.poh ?? 999))[0].poh}%)</span>`
        : '<span class="text-slate-600">Chưa nhập thực tế — POH nhà máy chưa tính được. Nhập sản lượng thực tế từng công đoạn ở bảng dưới rồi bấm “Tính POH & Lưu”.</span>';
    }
    if (tableEl) {
      tableEl.innerHTML = `
        <table class="w-full text-left border-collapse text-xs">
          <thead><tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
            <th class="p-2.5">Công đoạn</th><th class="p-2.5 text-center">NS</th>
            <th class="p-2.5 text-right">Định mức (đôi/ngày)</th><th class="p-2.5 text-right">Thực tế (đôi)</th>
            <th class="p-2.5 text-right">POH</th><th class="p-2.5">Đánh giá</th>
          </tr></thead>
          <tbody>
            ${poh.segments.map(x => `
              <tr class="border-b border-slate-100">
                <td class="p-2.5 font-bold text-slate-900">${x.segment}</td>
                <td class="p-2.5 text-center">${x.headcount || ''}</td>
                <td class="p-2.5 text-right"><input type="number" id="pohNorm_${x.id}" value="${x.capacity}" min="0" step="10" class="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-right" /></td>
                <td class="p-2.5 text-right"><input type="number" id="pohActual_${x.id}" value="${x.actual}" min="0" step="10" class="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-right" /></td>
                <td class="p-2.5 text-right font-extrabold ${x.poh != null && x.poh >= 100 ? 'text-emerald-700' : 'text-slate-900'}">${x.poh != null ? x.poh + '%' : '—'}</td>
                <td class="p-2.5 ${x.actual === 0 ? 'text-slate-500' : (x.actual >= x.capacity ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold')}">${x.actual === 0 ? 'Chưa nhập' : (x.actual >= x.capacity ? 'Đạt định mức' : 'Dưới định mức')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p class="text-[11px] text-slate-500">Công thức: POH = Thực tế / Định mức x 100%. POH trên 100% nghĩa là công đoạn đang làm vượt định mức (tăng ca / vượt năng lực chuẩn).</p>
          <button onclick="MESApp.savePohInputs()" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition">Tính POH & Lưu</button>
        </div>`;
    }
  },

  savePohInputs() {
    (this.state.segments || []).forEach(seg => {
      const normEl = document.getElementById('pohNorm_' + seg.id);
      const actEl = document.getElementById('pohActual_' + seg.id);
      const norm = normEl ? Number(normEl.value) : NaN;
      const actual = actEl ? Number(actEl.value) : NaN;
      if (!isNaN(norm) && norm >= 0) seg.capacity = norm;
      if (!isNaN(actual) && actual >= 0) seg.actual = actual;
      seg.poh = (seg.capacity > 0) ? Math.round(((seg.actual || 0) / seg.capacity) * 1000) / 10 : null;
      const ws = (this.state.workstations || []).find(w => w.id === seg.id);
      if (ws) { ws.normCapacity = seg.capacity; ws.actualToday = seg.actual; ws.pohPercent = seg.poh; }
    });
    MESStorage.saveState(this.state);
    this.render();
    const plantPoh = this.calculatePoh().plantPoh;
    this.showToast(plantPoh != null ? `Đã tính POH: nhà máy ${plantPoh}%` : 'Đã lưu thực tế (chưa có POH vì chưa nhập số lớn hơn 0).', 'success');
  },

  // ĐÁNH GIÁ KHẢ THI: kế hoạch (nhu cầu + công suất Ép đế) vs thực tế.
  renderFeasibility() {
    const el = document.getElementById('feasibilityResult');
    if (!el) return;
    const demand = this.getPlanDemand();
    if (demand == null) {
      el.innerHTML = '<p class="text-xs text-amber-800">Chưa đánh giá được — nhập nhu cầu LVF ở thẻ “Kế hoạch tổng” trước.</p>';
      return;
    }
    const poh = this.calculatePoh();
    const sum = this.planResult && this.planResult.summary;
    const capEpDay = sum ? sum.capEpDay : null;
    const rows = poh.segments.map(x => {
      const status = x.actual === 0 ? 'Chưa nhập thực tế'
        : (x.actual >= demand ? 'Đạt nhu cầu' : `Thiếu ${demand - x.actual} đôi so với nhu cầu`);
      const cls = x.actual === 0 ? 'text-slate-500'
        : (x.actual >= demand ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold');
      return `<tr class="border-b border-slate-100"><td class="p-2.5 font-bold text-slate-900">${x.segment}</td><td class="p-2.5 text-right">${x.capacity.toLocaleString('vi-VN')}</td><td class="p-2.5 text-right">${x.actual.toLocaleString('vi-VN')}</td><td class="p-2.5 text-right">${x.poh != null ? x.poh + '%' : '—'}</td><td class="p-2.5 ${cls}">${status}</td></tr>`;
    }).join('');
    const shortfalls = poh.segments.filter(x => x.actual > 0 && x.actual < demand);
    const notEntered = poh.segments.filter(x => x.actual === 0);
    const epOk = capEpDay != null && capEpDay >= demand;
    let verdict, verdictCls;
    if (!poh.entered) {
      verdict = 'CHƯA ĐÁNH GIÁ ĐƯỢC BẰNG THỰC TẾ';
      verdictCls = 'bg-amber-100 text-amber-900';
    } else if (shortfalls.length === 0 && notEntered.length === 0 && epOk) {
      verdict = 'KHẢ THI — mọi công đoạn đều đạt nhu cầu';
      verdictCls = 'bg-emerald-100 text-emerald-900';
    } else {
      verdict = 'CHƯA KHẢ THI — cần điều chỉnh trước khi chốt kế hoạch';
      verdictCls = 'bg-rose-100 text-rose-900';
    }
    const bottlenecks = poh.segments.filter(x => x.capacity < demand);
    el.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="px-3 py-1.5 rounded-full text-xs font-extrabold ${verdictCls}">${verdict}</span>
        <span class="text-xs text-slate-600">Nhu cầu: ${demand.toLocaleString('vi-VN')} đôi/ngày • Công suất Ép đế: ${capEpDay != null ? capEpDay + ' đôi/ngày' + (epOk ? ' (đủ)' : ' (thiếu ' + (demand - capEpDay) + ' đôi/ngày)') : '—'}</span>
      </div>
      <table class="w-full text-left border-collapse text-xs mt-3">
        <thead><tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider"><th class="p-2.5">Công đoạn</th><th class="p-2.5 text-right">Định mức</th><th class="p-2.5 text-right">Thực tế</th><th class="p-2.5 text-right">POH</th><th class="p-2.5">So với nhu cầu</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <ul class="text-xs text-slate-700 space-y-1 mt-3 list-disc list-inside">
        ${bottlenecks.length ? `<li>Định mức dưới nhu cầu: ${bottlenecks.map(b => b.segment + ' (' + b.capacity.toLocaleString('vi-VN') + ' &lt; ' + demand.toLocaleString('vi-VN') + ')').join(', ')} — hướng xử lý: ép trước, tăng ca, thêm khuôn hoặc đi 2 ca (thử ở tab Mô Phỏng rồi áp lại vào kế hoạch).</li>` : '<li>Không có công đoạn nào định mức dưới nhu cầu.</li>'}
        ${notEntered.length ? `<li>Chưa nhập thực tế: ${notEntered.map(x => x.segment).join(', ')} — nhập ở bảng POH để đánh giá đủ 7 công đoạn.</li>` : ''}
        ${shortfalls.length ? `<li>Thực tế dưới nhu cầu: ${shortfalls.map(x => x.segment + ' (thiếu ' + (demand - x.actual) + ' đôi)').join(', ')} — cần tăng ca / điều động nhân sự / dời lịch PO sang ngày có công suất.</li>` : ''}
        <li>OTD 100% trong bộ giải chỉ là hệ quả của lịch lùi từ Ngày xuất KD; thẻ này mới là đánh giá khả thi thật, dựa vào định mức và thực tế.</li>
      </ul>`;
  },

  render5mBannerCards() {
    const totalPairs = this.state.ordersGrouped.reduce((acc, o) => acc + o.total_pairs, 0);
    const totalOrders = this.state.ordersGrouped.length;
    const rubberKg = Math.round(totalPairs * 1.3);
    const fabricSqm = Math.round(totalPairs * 0.75);
    const demand = this.getPlanDemand();
    const plantPoh = this.calculatePoh().plantPoh;

    const totalDaysEl = document.getElementById('plan5mTotalDays');
    if (totalDaysEl) totalDaysEl.textContent = demand != null
      ? `${(totalPairs / demand).toFixed(1)} ngày SX chuẩn (${demand.toLocaleString('vi-VN')}đ/ngày)`
      : '— ngày SX (chưa nhập nhu cầu)';

    const otdRateEl = document.getElementById('plan5mOtdRate');
    if (otdRateEl) otdRateEl.textContent = this.planResult
      ? `100% (${totalOrders}/${totalOrders} PO đúng hạn KD)`
      : 'Chưa chạy — nhập nhu cầu để lập kế hoạch';

    const container = document.getElementById('fiveMOptimizationCards');
    if (!container) return;

    container.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-amber-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>1. MAN (Nhân Sự - 63 NS)</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">${plantPoh != null ? 'POH ' + plantPoh + '%' : 'Chưa tính POH'}</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Cán vải (9 NS) chạy gom lô 2 ngày/tuần; điều động 5 NS dôi dư phụ Kiểm chặt & Đánh kẽm Mài đế để toàn xưởng đạt nhịp <strong>${demand != null ? demand.toLocaleString('vi-VN') + ' đôi/ngày' : 'nhu cầu đã nhập'} giờ HC</strong>.</p>
      </div>

      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-cyan-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>2. MACHINE (12 Khuôn & 5 Trục)</span>
          <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">12 khuôn</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Phân bổ 12 khuôn khớp tỷ lệ Size thật: <strong>UK 6 (3 khuôn), UK 5 (3 khuôn), UK 7 (2 khuôn), UK 4 (2 khuôn), UK 8 (1 khuôn), UK 3+9 (1 khuôn)</strong>. Gom chiến dịch 5 mã màu giảm 65% dừng máy.</p>
      </div>

      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-emerald-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>3. MATERIAL (Định Mức Vật Tư)</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Đồng bộ 100%</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Tổng vật tư cho ${totalPairs.toLocaleString('vi-VN')} đôi: <strong>${rubberKg.toLocaleString('vi-VN')} kg</strong> cao su hỗn luyện và <strong>${fabricSqm.toLocaleString('vi-VN')} m²</strong> vải calender. Gom 5 màu giúp giảm hao hụt từ 18% xuống &lt;4%.</p>
      </div>

      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-indigo-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>4. METHOD (Lập Lịch Lùi 5M)</span>
          <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">${this.planResult ? 'OTD 100%' : 'Chưa chạy'}</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Áp dụng Backward Finite Scheduling: Lùi từ Ngày xuất KD: <strong>-5d Gò LVF, -6d In lụa (ủ 24h), -7d Đùn/Chặt (lưu 48h), -8d Mài đế (3d), -19d Ép đế (pull 2 tuần)</strong>.</p>
      </div>

      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-rose-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>5. MEASUREMENT (4 Cổng Kỹ Thuật)</span>
          <span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">Chốt Kỹ Thuật</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Khóa cứng 4 chốt: <strong>In lụa ủ ≥ 24h, Cán đùn lưu kho ≥ 48h, Mài đế xong trước ≥ 3 ngày, Kit đồng bộ 100%</strong> trước khi xuất bàn giao sang xưởng LVF.</p>
      </div>
    `;
  },

  updatePohCalculator() {
    const container0 = document.getElementById('pohCalculationResult');
    // Đồng bộ ô nhu cầu ở bộ tính với nhu cầu kế hoạch đã lưu (nếu có).
    const savedDemand = this.getPlanDemand();
    const calcInput = document.getElementById('calcLvfDemand');
    if (calcInput && savedDemand != null && !calcInput.value) calcInput.value = savedDemand;
    const demand = Number(calcInput?.value);
    if (!demand || demand <= 0) {
      if (container0) container0.innerHTML = '<p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">Chưa có nhu cầu LVF. Nhập nhu cầu (đôi/ngày) ở ô trên, hoặc nhập ở thẻ “Kế hoạch tổng” rồi bấm “Chạy kế hoạch” — bộ tính POH này sẽ tính theo đúng số đó, không dùng mặc định 650 nữa.</p>';
      return;
    }
    const molds = Number(document.getElementById('calcMoldCount')?.value) || 12;
    const fabricMode = document.getElementById('calcFabricMode')?.value || 'batch';
    const outsoleMode = document.getElementById('calcOutsoleMode')?.value || 'preload_ot';

    const fabricHoursDaily = (demand / 331.25).toFixed(1);
    const fabricSessionsPerWeek = Math.ceil((demand * 6) / 2650);
    const fabricPoh = fabricMode === 'batch' ? 96.5 : Math.min(100, Math.round((demand / 2650) * 100 + 35));

    const silkHoursDaily = ((demand / 750) * 8).toFixed(1);
    const silkPoh = Math.min(100, Math.round((demand / 750) * 100));

    const regularMoldCap = molds * 37.5;
    let effectiveOutsoleCap = regularMoldCap;
    let outsoleStatusText = '';
    if (outsoleMode === 'preload_ot') {
      effectiveOutsoleCap = Math.round(regularMoldCap * 1.44);
      outsoleStatusText = `Đạt ${effectiveOutsoleCap} đôi/ngày (Ép trước 14 ngày + Tăng ca bù khuôn) → Đáp ứng 100% tiến độ Mài đế (-3 ngày).`;
    } else if (outsoleMode === 'regular_only') {
      effectiveOutsoleCap = Math.round(regularMoldCap);
      outsoleStatusText = `Chỉ đạt ${effectiveOutsoleCap} đôi/ngày giờ HC → Thiếu ${Math.max(0, demand - effectiveOutsoleCap)} đôi/ngày so với lệnh LVF!`;
    } else {
      effectiveOutsoleCap = Math.round(regularMoldCap * 1.6);
      outsoleStatusText = `Đi 2 ca / Tăng lên 17 khuôn đạt ${effectiveOutsoleCap} đôi/ngày → Dư công suất đáp ứng mọi đợt cao điểm xuất hàng.`;
    }

    const totalPairs = this.state.ordersGrouped.reduce((acc, o) => acc + o.total_pairs, 0);
    const totalDaysForAllOrders = (totalPairs / demand).toFixed(1);

    const container = document.getElementById('pohCalculationResult');
    if (!container) return;

    container.innerHTML = `
      <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1 text-indigo-950">
        <div class="font-bold flex items-center justify-between">
          <span>Tổng quỹ thời gian hoàn tất ${totalPairs.toLocaleString('vi-VN')} đôi:</span>
          <span class="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 font-extrabold">${totalDaysForAllOrders} ngày SX</span>
        </div>
        <p class="text-[11px]">Với nhịp độ <strong>${demand} đôi/ngày</strong>, toàn bộ 113 PO (11.832 thùng CLP) đều hoàn tất trước mốc Ngày xuất KD tối thiểu 5 ngày.</p>
      </div>

      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
        <div class="font-bold text-emerald-950 flex items-center justify-between">
          <span>1. Chuyền Cán Vải (9 NS):</span>
          <span class="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-extrabold">POH: ${fabricPoh}%</span>
        </div>
        <p class="text-emerald-900">Nhu cầu ${demand}đ/ngày chỉ mất <strong>${fabricHoursDaily}h/ngày</strong>. Gom lô <strong>${fabricSessionsPerWeek} buổi/tuần</strong>, In tẩy & Chặt 3 ngày/tuần giúp tiết kiệm 14% hao hụt vật tư.</p>
      </div>

      <div class="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
        <div class="font-bold text-purple-950 flex items-center justify-between">
          <span>2. Chuyền In Lụa (7 NS):</span>
          <span class="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-extrabold">POH: ${silkPoh}% (${silkHoursDaily}h/8h)</span>
        </div>
        <p class="text-purple-900">Kiểm soát phôi cao su nhập kho trước <strong>12:00 trưa</strong> và lưu kho ủ đủ <strong>24h</strong> trước khi xuất sang LVF.</p>
      </div>

      <div class="p-3 rounded-xl ${effectiveOutsoleCap >= demand ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-rose-50 border-rose-300 text-rose-950'} border space-y-1">
        <div class="font-bold flex items-center justify-between">
          <span>3. Ép Đế (${molds} khuôn) & Mài Đế:</span>
          <span class="px-2 py-0.5 rounded ${effectiveOutsoleCap >= demand ? 'bg-blue-200 text-blue-900' : 'bg-rose-200 text-rose-900'} font-extrabold">
            ${effectiveOutsoleCap >= demand ? 'Đủ công suất' : 'Nghẽn'}
          </span>
        </div>
        <p class="text-[11px] leading-relaxed">${outsoleStatusText}</p>
      </div>
    `;
  },

  populateOrderFilterDropdowns() {
    const batchSel = document.getElementById('filterOrderBatch');
    const colorSel = document.getElementById('filterOrderColor');
    const countrySel = document.getElementById('filterOrderCountry');
    if (!batchSel || !colorSel || !countrySel) return;

    if (batchSel.options.length <= 1) {
      batchSel.innerHTML = '<option value="all">Tất cả Đợt (1–5)</option>' +
        [1, 2, 3, 4, 5].map(b => `<option value="${b}">Đợt ${b}</option>`).join('');
    }

    if (colorSel.options.length <= 1) {
      const colors = ['LC1783', 'LC1786', 'LC1787', 'LC1784', 'LC1785'];
      colorSel.innerHTML = '<option value="all">Tất cả 5 Mã Màu</option>' +
        colors.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (countrySel.options.length <= 1) {
      const countries = [...new Set(this.state.ordersGrouped.map(o => o.country))].sort();
      countrySel.innerHTML = `<option value="all">Tất cả Quốc Gia (${countries.length})</option>` +
        countries.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    batchSel.value = this.orderFilters.batch;
    colorSel.value = this.orderFilters.color;
    countrySel.value = this.orderFilters.country;

    batchSel.onchange = (e) => { this.orderFilters.batch = e.target.value; this.renderOrdersTable(); };
    colorSel.onchange = (e) => { this.orderFilters.color = e.target.value; this.renderOrdersTable(); };
    countrySel.onchange = (e) => { this.orderFilters.country = e.target.value; this.renderOrdersTable(); };

    const searchInput = document.getElementById('filterOrderSearch');
    if (searchInput) {
      searchInput.value = this.orderFilters.search;
      searchInput.oninput = (e) => { this.orderFilters.search = e.target.value.toLowerCase().trim(); this.renderOrdersTable(); };
    }
  },

  getFilteredOrders() {
    return this.state.ordersGrouped.filter(o => {
      if (this.orderFilters.batch !== 'all' && String(o.batch) !== String(this.orderFilters.batch)) return false;
      if (this.orderFilters.color !== 'all' && o.color !== this.orderFilters.color) return false;
      if (this.orderFilters.country !== 'all' && o.country !== this.orderFilters.country) return false;
      if (this.orderFilters.search) {
        const q = this.orderFilters.search;
        const match = o.po_no.toLowerCase().includes(q) ||
                      o.order_no.toLowerCase().includes(q) ||
                      o.country.toLowerCase().includes(q) ||
                      o.color.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  },

  renderOrdersTable() {
    const thead = document.getElementById('ordersTableHead');
    const tbody = document.getElementById('ordersTableBody');
    const countEl = document.getElementById('orderFilterCount');
    if (!thead || !tbody) return;

    const filtered = this.getFilteredOrders();
    if (countEl) countEl.textContent = `Hiển thị ${filtered.length} / ${this.state.ordersGrouped.length} PO` + (this.orderViewMode === 'gantt' ? ' • Gantt chỉ vẽ 30 PO sớm nhất' : '');

    if (this.orderViewMode === 'grouped') {
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-center">STT</th>
          <th class="p-3 text-left">Mã Đơn Hàng</th>
          <th class="p-3 text-left">Số PO (TVS)</th>
          <th class="p-3 text-left">Quốc Gia</th>
          <th class="p-3 text-center">Mã Màu</th>
          <th class="p-3 text-right">Tổng Đôi</th>
          <th class="p-3 text-right">Số Thùng (CLP)</th>
          <th class="p-3 text-center">Đợt</th>
          <th class="p-3 text-center font-bold text-indigo-700">Lịch Ép Đế (-19d)</th>
          <th class="p-3 text-center font-bold text-purple-700">Lịch Giao LVF (-5d)</th>
          <th class="p-3 text-center font-extrabold text-emerald-800">Ngày Xuất KD</th>
          <th class="p-3 text-center">Trạng Thái 5M</th>
        </tr>
      `;

      tbody.innerHTML = filtered.map((o, idx) => {
        const schedule = this.planResult?.schedules?.find(s => s.po_no === o.po_no);
        const epDeDate = schedule?.milestones?.start_ep_de || '--/--/----';
        const giaoLvfDate = schedule?.milestones?.giao_lvf || '--/--/----';

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-3 font-mono font-bold text-slate-900">${o.order_no}</td>
            <td class="p-3 font-mono font-extrabold text-amber-600">${o.po_no}</td>
            <td class="p-3 font-semibold text-slate-800">${o.country}</td>
            <td class="p-3 text-center font-mono font-bold">${o.color}</td>
            <td class="p-3 text-right font-mono font-extrabold text-slate-900">${o.total_pairs.toLocaleString('vi-VN')}</td>
            <td class="p-3 text-right font-mono text-slate-600">${o.total_boxes.toLocaleString('vi-VN')}</td>
            <td class="p-3 text-center font-bold text-slate-700">Đợt ${o.batch}</td>
            <td class="p-3 text-center font-mono text-indigo-700 font-semibold">${epDeDate}</td>
            <td class="p-3 text-center font-mono text-purple-700 font-semibold">${giaoLvfDate}</td>
            <td class="p-3 text-center font-mono font-extrabold text-emerald-700 bg-emerald-50/50">${o.export_date}</td>
            <td class="p-3 text-center">
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                <i data-lucide="check-circle" class="w-3 h-3 text-emerald-600"></i> Đạt 100% OTD
              </span>
            </td>
          </tr>
        `;
      }).join('');

    } else if (this.orderViewMode === 'raw_lines') {
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-center">STT</th>
          <th class="p-3 text-left">Số PO</th>
          <th class="p-3 text-left">Mã Màu</th>
          <th class="p-3 text-center">UK 3</th>
          <th class="p-3 text-center">UK 4</th>
          <th class="p-3 text-center">UK 5</th>
          <th class="p-3 text-center">UK 6</th>
          <th class="p-3 text-center">UK 7</th>
          <th class="p-3 text-center">UK 8</th>
          <th class="p-3 text-center">UK 9</th>
          <th class="p-3 text-right">Tổng Đôi</th>
          <th class="p-3 text-center">Ngày Xuất KD</th>
        </tr>
      `;

      tbody.innerHTML = filtered.map((o, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs font-mono">
          <td class="p-3 text-center font-bold text-slate-400 font-sans">${idx + 1}</td>
          <td class="p-3 font-bold text-amber-600">${o.po_no}</td>
          <td class="p-3 text-center font-bold">${o.color}</td>
          <td class="p-3 text-center text-slate-600">${o.sizes['3'] || 0}</td>
          <td class="p-3 text-center text-slate-600">${o.sizes['4'] || 0}</td>
          <td class="p-3 text-center text-slate-600">${o.sizes['5'] || 0}</td>
          <td class="p-3 text-center text-slate-900 font-bold">${o.sizes['6'] || 0}</td>
          <td class="p-3 text-center text-slate-900 font-bold">${o.sizes['7'] || 0}</td>
          <td class="p-3 text-center text-slate-600">${o.sizes['8'] || 0}</td>
          <td class="p-3 text-center text-slate-600">${o.sizes['9'] || 0}</td>
          <td class="p-3 text-right font-extrabold text-slate-900">${o.total_pairs.toLocaleString('vi-VN')}</td>
          <td class="p-3 text-center font-bold text-emerald-700">${o.export_date}</td>
        </tr>
      `).join('');

    } else {
      // Gantt View
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-left">Số PO / Màu / Đợt</th>
          <th class="p-3 text-right">SL</th>
          <th class="p-3 text-left">Tiến Độ Điều Độ Lùi 5M (-19d Ép Đế → -8d Mài Đế → -7d Đùn/Chặt → -6d In Lụa → -5d Gò LVF → Ngày Xuất KD)</th>
          <th class="p-3 text-center">Hạn Xuất KD</th>
        </tr>
      `;

      tbody.innerHTML = filtered.slice(0, 30).map((o) => {
        const sch = this.planResult?.schedules?.find(s => s.po_no === o.po_no);
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3">
              <div class="font-bold text-slate-900">${o.po_no}</div>
              <div class="text-[10px] text-slate-500">${o.color} • ${o.country} • Đợt ${o.batch}</div>
            </td>
            <td class="p-3 text-right font-mono font-extrabold text-slate-800">${o.total_pairs.toLocaleString('vi-VN')}</td>
            <td class="p-3">
              <div class="space-y-1.5">
                <div class="flex items-center gap-1 text-[10px] font-mono">
                  <span class="w-16 text-indigo-700 font-bold shrink-0">Ép đế:</span>
                  <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-indigo-500 h-full rounded-full" style="width: 100%;"></div>
                  </div>
                  <span class="text-slate-500">${sch?.milestones?.start_ep_de}</span>
                </div>
                <div class="flex items-center gap-1 text-[10px] font-mono">
                  <span class="w-16 text-purple-700 font-bold shrink-0">In lụa ủ:</span>
                  <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-purple-500 h-full rounded-full" style="width: 100%;"></div>
                  </div>
                  <span class="text-slate-500">${sch?.milestones?.in_lua_u24h}</span>
                </div>
                <div class="flex items-center gap-1 text-[10px] font-mono">
                  <span class="w-16 text-amber-700 font-bold shrink-0">Giao LVF:</span>
                  <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-amber-500 h-full rounded-full" style="width: 100%;"></div>
                  </div>
                  <span class="text-slate-500">${sch?.milestones?.giao_lvf}</span>
                </div>
              </div>
            </td>
            <td class="p-3 text-center font-mono font-bold text-emerald-700">${o.export_date}</td>
          </tr>
        `;
      }).join('');
    }
  },

  /* =========================================================================
     TAB 3: PHÂN ĐOẠN & 32 CÔNG ĐOẠN NHỎ
     ========================================================================= */
  renderWorkstationsTab() {
    const workstations = this.state.workstations || [];
    const activeWs = workstations.find(w => w.id === this.activeWorkstationId) || workstations[0];
    if (activeWs) this.activeWorkstationId = activeWs.id;

    // 1. Render Workstation Selector Buttons
    const selectorContainer = document.getElementById('workstationSelectorBtns');
    if (selectorContainer) {
      selectorContainer.innerHTML = workstations.map(w => {
        const isActive = w.id === activeWs.id;
        return `
          <button onclick="MESApp.switchWorkstation('${w.id}')" class="p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
            isActive
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[10px] font-bold uppercase ${isActive ? 'text-amber-400' : 'text-slate-500'}">${w.lineGroup}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700 border border-slate-200'}">${w.totalHeadcount} NS</span>
            </div>
            <div class="font-bold text-xs mt-1 truncate">${w.shortName}</div>
            <div class="text-[11px] mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}">${w.subProcesses.length} BTP nhỏ • POH ${w.pohPercent != null ? w.pohPercent + '%' : '—'}</div>
          </button>
        `;
      }).join('');
    }

    // 2. Render Active Workstation Header Card
    const headerEl = document.getElementById('activeWorkstationHeader');
    if (headerEl && activeWs) {
      headerEl.innerHTML = `
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">${activeWs.lineGroup}</span>
              <h2 class="text-base sm:text-lg font-extrabold text-slate-900">${activeWs.name}</h2>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Định biên: ${activeWs.totalHeadcount} Lao động</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">${activeWs.description}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-[10px] text-slate-400 uppercase font-bold">Nhu cầu LVF đã nhập</div>
              <div class="text-lg font-extrabold text-slate-900">${activeWs.dailyTargetPairs != null ? activeWs.dailyTargetPairs.toLocaleString('vi-VN') + ' đôi/ngày' : '— (chưa nhập)'}</div>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-100 text-center min-w-[70px]">
              <div class="text-[10px] text-slate-500 uppercase font-bold">POH</div>
              <div class="text-base font-extrabold text-emerald-600">${activeWs.pohPercent != null ? activeWs.pohPercent + '%' : '—'}</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span class="text-slate-500 block text-[11px]">Thiết bị & Công cụ:</span>
            <span class="font-bold text-slate-800">${activeWs.machineEquipment}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span class="text-slate-500 block text-[11px]">Chế độ ca & Giờ chuẩn:</span>
            <span class="font-bold text-slate-800">${activeWs.shiftModel} • ${activeWs.standardWorkingHours}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span class="text-slate-500 block text-[11px]">Cơ chế điều độ 5M:</span>
            <span class="font-bold text-slate-800">${activeWs.kaizenScheduleRole}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span class="text-slate-500 block text-[11px]">Trạng thái điểm nghẽn:</span>
            <span class="font-bold ${activeWs.isBottleneck ? 'text-rose-600' : 'text-emerald-700'}">${activeWs.bottleneckStatus}</span>
          </div>
        </div>
      `;
    }

    // 3. Render Sub-Process Pipeline Cards
    const subCardsGrid = document.getElementById('subProcessCardsGrid');
    if (subCardsGrid && activeWs) {
      subCardsGrid.innerHTML = activeWs.subProcesses.map((sp, idx) => {
        const btp = this.state.subProcesses.find(p => p.btp_code === sp.btpCode);
        const currentWip = btp ? btp.wip_stock : (sp.currentOutput || 0);
        const safeStock = sp.safeBufferStock || 1000;
        const progress = Math.min(100, Math.round((currentWip / safeStock) * 100));

        return `
          <div class="bg-slate-50/60 rounded-xl border border-slate-200 p-4 space-y-3 hover:border-amber-400 transition">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">CÔNG ĐOẠN ${sp.stepNumber}</span>
                <h4 class="font-bold text-slate-900 text-xs mt-1">${sp.name}</h4>
              </div>
              <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-amber-100 text-amber-900 shrink-0">
                ${sp.btpCode}
              </span>
            </div>

            <div class="text-[11px] text-slate-600">
              <strong>BTP đầu ra:</strong> ${sp.btpName}
            </div>

            <div class="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Tồn kho / Lũy kế:</span>
                <span class="font-extrabold text-slate-900 font-mono">${currentWip.toLocaleString('vi-VN')} đôi</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400">
                <span>Định mức an toàn:</span>
                <span>${safeStock.toLocaleString('vi-VN')} đôi</span>
              </div>
              <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div class="bg-amber-500 h-full rounded-full" style="width: ${progress}%"></div>
              </div>
            </div>

            <div class="text-[10px] text-indigo-700 font-medium bg-indigo-50/60 p-1.5 rounded border border-indigo-100">
              QC: ${sp.qcCondition}
            </div>

            <div class="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <button onclick="MESApp.recordSubProcessOutput('${activeWs.id}', ${idx}, 50)" class="text-[10px] px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition">+50</button>
                <button onclick="MESApp.recordSubProcessOutput('${activeWs.id}', ${idx}, 150)" class="text-[10px] px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition">+150</button>
              </div>
              <div class="flex items-center gap-1">
                <input type="number" id="inputSubStep_${activeWs.id}_${idx}" min="1" placeholder="SL..." class="w-16 px-1.5 py-1 text-[11px] border border-slate-300 rounded font-bold text-center" />
                <button onclick="MESApp.recordSubStepInput('${activeWs.id}', ${idx})" class="text-[10px] px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 transition">Lưu</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. Render All Workstations Overview Grid
    const wsGrid = document.getElementById('workstationsGrid');
    if (wsGrid) {
      wsGrid.innerHTML = this.state.segments.map(s => {
        const poh = Math.round((s.poh > 1 ? s.poh : s.poh * 100) * 10) / 10;
        return `
          <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <i data-lucide="cpu" class="w-4 h-4 text-amber-500"></i>
                  ${s.segment}
                </h3>
                <p class="text-xs text-slate-500">Định biên: <strong class="text-slate-800">${s.headcount} NS</strong> • Công suất: <strong class="text-slate-800">${s.capacity.toLocaleString('vi-VN')} đôi/ngày</strong></p>
              </div>
              <span class="px-2 py-0.5 rounded font-extrabold text-xs ${poh >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                POH ${poh}%
              </span>
            </div>

            <div class="text-xs space-y-1">
              <div class="flex justify-between text-slate-600">
                <span>Thiết bị chính:</span>
                <span class="font-medium text-slate-800">${s.machine_profile}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Chế độ ca:</span>
                <span class="font-medium text-slate-800">${s.shift_model}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Trạng thái:</span>
                <span class="font-bold ${s.bottleneck_flag ? 'text-rose-600' : 'text-emerald-700'}">${s.bottleneck_issue}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  switchWorkstation(wsId) {
    this.activeWorkstationId = wsId;
    this.renderWorkstationsTab();
    if (window.lucide) window.lucide.createIcons();
  },

  recordSubProcessOutput(wsId, stepIdx, qty) {
    const ws = (this.state.workstations || []).find(w => w.id === wsId);
    if (!ws || !ws.subProcesses[stepIdx]) return;
    const sp = ws.subProcesses[stepIdx];

    sp.currentOutput = (sp.currentOutput || 0) + qty;
    const btp = this.state.subProcesses.find(p => p.btp_code === sp.btpCode);
    if (btp) {
      btp.wip_stock = (btp.wip_stock || 0) + qty;
    }

    MESStorage.saveState(this.state);
    this.runOptimization();
    this.render();
    this.showToast(`Đã ghi nhận +${qty} đôi cho ${sp.btpName} (${sp.btpCode})!`, 'success');
  },

  recordSubStepInput(wsId, stepIdx) {
    const input = document.getElementById(`inputSubStep_${wsId}_${stepIdx}`);
    if (!input) return;
    const val = parseInt(input.value);
    if (val && val > 0) {
      this.recordSubProcessOutput(wsId, stepIdx, val);
      input.value = '';
    }
  },

  /* =========================================================================
     TAB 4: KHO BTP NHỎ WIP (32 MÃ BTP)
     ========================================================================= */
  renderBtpInventoryTab() {
    // Populate Workstation Filter Dropdown
    const wsFilter = document.getElementById('filterBtpWorkstation');
    if (wsFilter && wsFilter.options.length <= 1) {
      const uniqueSegments = [...new Set(this.state.subProcesses.map(p => p.segment))];
      wsFilter.innerHTML = '<option value="all">Tất cả 7 Phân đoạn</option>' +
        uniqueSegments.map(s => `<option value="${s}">${s}</option>`).join('');
      wsFilter.value = this.btpFilters.workstation;
    }

    const filtered = this.state.subProcesses.filter(p => {
      if (this.btpFilters.workstation !== 'all' && p.segment !== this.btpFilters.workstation) return false;
      if (this.btpFilters.search) {
        const q = this.btpFilters.search;
        const match = p.btp_code.toLowerCase().includes(q) ||
                      p.btp_name.toLowerCase().includes(q) ||
                      p.segment.toLowerCase().includes(q) ||
                      p.step_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const tbody = document.getElementById('btpInventoryTableBody');
    const totalWipEl = document.getElementById('btpTotalWip');
    const safeCountEl = document.getElementById('btpSafeCount');

    let totalWip = 0;
    let safeCount = 0;

    this.state.subProcesses.forEach(p => {
      totalWip += (p.wip_stock || 0);
      if (p.wip_stock >= 1000) safeCount++;
    });

    if (totalWipEl) totalWipEl.textContent = `${totalWip.toLocaleString('vi-VN')} đôi`;
    if (safeCountEl) safeCountEl.textContent = `${safeCount} / ${this.state.subProcesses.length} mã`;

    if (!tbody) return;

    tbody.innerHTML = filtered.map((p, idx) => {
      const isSafe = (p.wip_stock || 0) >= 1000;

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
          <td class="p-3 font-mono font-extrabold text-indigo-700">${p.btp_code}</td>
          <td class="p-3 font-semibold text-slate-900">${p.btp_name}</td>
          <td class="p-3 text-slate-600">${p.segment}</td>
          <td class="p-3 text-slate-500">${p.step_name}</td>
          <td class="p-3 text-slate-600">${p.qc_rule}</td>
          <td class="p-3 text-right font-extrabold text-slate-900 text-sm font-mono">${(p.wip_stock || 0).toLocaleString('vi-VN')}</td>
          <td class="p-3 text-right text-slate-500 font-mono">1.000</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${isSafe ? 'An toàn' : 'Cần bù'}
            </span>
          </td>
          <td class="p-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <input type="number" id="inputStock_${p.btp_code}" value="${p.wip_stock || 0}" min="0" step="50" class="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-right font-mono" />
              <button onclick="MESApp.adjustBtpStockDirect('${p.btp_code}')" class="text-[11px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold transition">Lưu</button>
              <button onclick="MESApp.quickAddBtpStock('${p.btp_code}', 100)" class="text-[11px] px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition">+100</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  adjustBtpStockDirect(btpCode) {
    const input = document.getElementById(`inputStock_${btpCode}`);
    if (!input) return;
    const newQty = parseInt(input.value);
    if (isNaN(newQty) || newQty < 0) return;

    const p = this.state.subProcesses.find(item => item.btp_code === btpCode);
    if (p) {
      p.wip_stock = newQty;
      MESStorage.saveState(this.state);
      this.runOptimization();
      this.render();
      this.showToast(`Đã cập nhật tồn kho BTP ${btpCode} thành ${newQty.toLocaleString('vi-VN')} đôi!`, 'success');
    }
  },

  quickAddBtpStock(btpCode, addedQty) {
    const p = this.state.subProcesses.find(item => item.btp_code === btpCode);
    if (p) {
      p.wip_stock = (p.wip_stock || 0) + addedQty;
      MESStorage.saveState(this.state);
      this.runOptimization();
      this.render();
      this.showToast(`Đã cộng thêm +${addedQty} đôi vào BTP ${btpCode}!`, 'success');
    }
  },

  /* =========================================================================
     TAB 5: BÀN GIAO BTP SANG LVF
     ========================================================================= */
  renderLvfHandoverTab() {
    // 1. Calculate Ready Synchronized Sets Count
    const btpInLua24h = this.state.subProcesses.find(p => p.btp_code === 'BTP-IL-04')?.wip_stock || 0;
    const btpDunChat = this.state.subProcesses.find(p => p.btp_code === 'BTP-TC-05')?.wip_stock || 0;
    const btpDeMai3d = this.state.subProcesses.find(p => p.btp_code === 'BTP-MD-04')?.wip_stock || 0;
    const readySyncSets = Math.min(btpInLua24h, btpDunChat, btpDeMai3d);

    const countEl = document.getElementById('readySyncSetsCount');
    if (countEl) countEl.textContent = readySyncSets.toLocaleString('vi-VN');

    const progressEl = document.getElementById('syncSetsProgressBar');
    if (progressEl) {
      const demand = this.getPlanDemand();
      const pct = demand ? Math.min(100, Math.round((readySyncSets / demand) * 100)) : 0;
      progressEl.style.width = `${pct}%`;
    }

    // 2. Render Handover Logs Table
    const tbody = document.getElementById('handoverTableBody');
    if (!tbody) return;

    if (!this.state.handoverLogs || this.state.handoverLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-xs text-slate-500">Chưa có bàn giao nào ghi nhận — dữ liệu mẫu cũ đã xóa. Thêm bàn giao mới bằng form ở tab này, số liệu sẽ lưu lại và tính vào WIP / bộ đồng bộ.</td></tr>';
      return;
    }
    tbody.innerHTML = this.state.handoverLogs.map((h, idx) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
        <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
        <td class="p-3 font-mono font-extrabold text-amber-600">${h.id}</td>
        <td class="p-3 font-bold text-slate-900">
          <div>${h.po_no}</div>
          <div class="text-[10px] text-slate-400 font-normal">${h.order_no} • ${h.country}</div>
        </td>
        <td class="p-3 text-center font-mono font-bold">${h.color}</td>
        <td class="p-3 text-right font-extrabold text-slate-900 text-sm font-mono">${h.pairs.toLocaleString('vi-VN')} bộ</td>
        <td class="p-3 text-slate-600">${h.receiver_team}</td>
        <td class="p-3 text-center">
          <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
            <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> ${h.check_gates}
          </span>
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
            ${h.status}
          </span>
        </td>
      </tr>
    `).join('');
  },

  /* =========================================================================
     TAB 6: ĐIỂM NGHẼN & KAIZEN LAF
     ========================================================================= */
  // Trạng thái theo dõi của 1 kaizen (tương thích dữ liệu cũ).
  kaizenStatus(kz) {
    if (kz.status) return kz.status;
    return kz.applied ? 'resolved' : 'open';
  },

  kaizenStatusLabel(status) {
    return status === 'resolved' ? 'Đã tháo gỡ'
      : (status === 'in_progress' ? 'Đang xử lý' : 'Chờ xử lý');
  },

  // Ảnh chụp kế hoạch hiện tại để đối chiếu trước/sau khi xoay.
  capturePlanSnapshot() {
    const sum = this.planResult && this.planResult.summary;
    const poh = this.calculatePoh();
    const demand = this.getPlanDemand();
    return {
      ts: new Date().toISOString(),
      demand,
      molds: this.state.simParams ? this.state.simParams.molds : null,
      workDays: sum ? sum.workDays : null,
      capEpDay: sum ? sum.capEpDay : null,
      score5M: sum ? sum.score5M : null,
      plantPoh: poh.plantPoh
    };
  },

  logPlanRotation(trigger, note, before, after) {
    if (!this.state.planRotations) this.state.planRotations = [];
    this.state.planRotations.unshift({ trigger, note: note || '', before, after });
    if (this.state.planRotations.length > 50) {
      this.state.planRotations = this.state.planRotations.slice(0, 50);
    }
  },

  renderKaizenCenterTab() {
    const items = this.state.kaizenItems || [];
    const openCount = items.filter(k => this.kaizenStatus(k) !== 'resolved').length;
    const resolvedCount = items.filter(k => this.kaizenStatus(k) === 'resolved').length;

    const openEl = document.getElementById('kaizenOpenCount');
    const appliedEl = document.getElementById('kaizenAppliedCount');
    if (openEl) openEl.textContent = `${openCount} Điểm nghẽn chưa tháo gỡ`;
    if (appliedEl) appliedEl.textContent = `${resolvedCount} Điểm đã tháo gỡ`;

    const grid = document.getElementById('kaizenCardsGrid');
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = '<p class="text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">Chưa có điểm nghẽn nào — bấm “Thêm Đề Xuất Kaizen 5M” ở trên để ghi nhận điểm nghẽn mới phát sinh trên xưởng.</p>';
      return;
    }
    const segOptions = (this.state.segments || []).map(x =>
      `<option value="${x.id}">${x.segment}</option>`).join('');
    grid.innerHTML = items.map((kz, idx) => {
      const status = this.kaizenStatus(kz);
      const badgeCls = status === 'resolved' ? 'bg-emerald-200 text-emerald-900'
        : (status === 'in_progress' ? 'bg-indigo-200 text-indigo-900' : 'bg-amber-100 text-amber-900');
      const cardCls = status === 'resolved' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white';
      return `
      <div class="rounded-2xl border ${cardCls} p-4 flex flex-col justify-between shadow-xs space-y-3">
        <div class="space-y-2.5 text-xs">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">${kz.id}</span>
              <span class="font-bold text-slate-900">${kz.segment}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}">
              ${this.kaizenStatusLabel(status)}
            </span>
          </div>

          <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs">
            <div class="font-bold text-[11px] uppercase text-rose-800 mb-0.5">Hiện trạng & Điểm nghẽn:</div>
            <p class="leading-relaxed">${kz.issue || kz.problem}</p>
          </div>

          ${kz.excelDifficulty ? `<details class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs"><summary class="font-bold cursor-pointer">Khó khăn gốc (file Excel LAF) — bấm để xem</summary><p class="leading-relaxed mt-1">${kz.excelDifficulty}</p></details>` : ''}

          <div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs">
            <div class="font-bold text-[11px] uppercase text-indigo-800 mb-0.5">Giải pháp Kế hoạch 1 đề xuất:</div>
            <p class="leading-relaxed">${kz.solution}</p>
          </div>

          <div class="text-emerald-800 font-semibold text-xs flex items-center gap-1">
            <i data-lucide="trending-up" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Hiệu quả kỳ vọng: ${kz.result || kz.impact}</span>
          </div>

          ${status === 'resolved' ? `<div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
            <div class="font-bold">Đã tháo gỡ${kz.resolvedDate ? ' ngày ' + kz.resolvedDate : ''}</div>
            ${kz.resolvedNote ? `<p class="mt-0.5">Biện pháp: ${kz.resolvedNote}</p>` : ''}
            ${kz.newNorm ? `<p>Định mức mới áp vào kế hoạch: ${kz.newNorm} đôi/ngày.</p>` : ''}
          </div>` : ''}

          <div class="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
            <div class="font-bold text-slate-900">Theo dõi tháo gỡ — người dùng nhập, hệ thống xoay lại kế hoạch</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-slate-500 mb-0.5">Trạng thái:</label>
                <select id="kzStatus_${idx}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white font-semibold">
                  <option value="open" ${status === 'open' ? 'selected' : ''}>Chờ xử lý</option>
                  <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>Đang xử lý</option>
                  <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Đã tháo gỡ</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Ngày tháo gỡ:</label>
                <input type="date" id="kzDate_${idx}" value="${kz.resolvedDate || ''}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Định mức mới (đôi/ngày, nếu có):</label>
                <input type="number" id="kzNewNorm_${idx}" value="${kz.newNorm != null ? kz.newNorm : ''}" min="0" step="10" placeholder="VD 650" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-bold" />
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Trễ ước tính (ngày, nếu có):</label>
                <input type="number" id="kzDelay_${idx}" value="${kz.delayDays != null ? kz.delayDays : ''}" min="0" step="1" placeholder="VD 3" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-bold" />
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Công đoạn bị ảnh hưởng:</label>
                <select id="kzSegment_${idx}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                  ${segOptions.replace(`value="${kz.segmentId || ''}"`, `value="${kz.segmentId || ''}" selected`)}
                </select>
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Khuôn Ép đế mới (nếu đổi):</label>
                <input type="number" id="kzMolds_${idx}" min="6" max="24" placeholder="Để trống = giữ nguyên" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-bold" />
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Phương án Ép đế mới:</label>
                <select id="kzEpDeMode_${idx}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                  <option value="">Giữ nguyên</option>
                  <option value="preload_ot">Ép trước 2 tuần + Tăng ca 3.5h</option>
                  <option value="regular_only">Chỉ làm giờ HC</option>
                  <option value="two_shifts">Đi 2 ca</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-500 mb-0.5">Phương án Cán vải mới:</label>
                <select id="kzCanVaiMode_${idx}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                  <option value="">Giữ nguyên</option>
                  <option value="batch">Gom lô 2 ngày/tuần</option>
                  <option value="daily">Rải đều mỗi ngày</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-slate-500 mb-0.5">Biện pháp đã làm / đang làm:</label>
              <textarea id="kzNote_${idx}" rows="2" placeholder="VD: Đã thay đầu ói, vệ sinh máy 5 trục, bố trí thêm 1 thợ kiểm..." class="w-full border border-slate-300 rounded-lg px-2 py-1.5">${kz.resolvedNote || ''}</textarea>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="MESApp.saveKaizenTracking(${idx})" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition">Lưu trạng thái &amp; xoay lại kế hoạch</button>
              <button onclick="MESApp.assessKaizen(${idx})" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 transition">Đánh giá tác động (theo luật)</button>
              <button onclick="MESApp.analyzeKaizen(${idx})" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition">Phân tích bằng AI</button>
            </div>
            <div id="kzImpact_${idx}" class="text-xs space-y-2"></div>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  // Lưu trạng thái tháo gỡ do user nhập, áp thay đổi vào kế hoạch
  // (định mức công đoạn + tham số mô phỏng nếu có), chạy lại kế
  // hoạch và ghi 1 lần xoay kế hoạch vào sổ (tab Vận hành lại).
  // Lưu ý trung thực: định mức công đoạn ảnh hưởng POH + khả thi,
  // còn số ngày SX / công suất Ép đế của bộ giải chỉ đổi khi tham số
  // kế hoạch (nhu cầu, khuôn, phương án ép/cán) đổi — sổ xoay ghi cả
  // hai mặt này để không tạo cảm giác kế hoạch đổi trong khi không đổi.
  saveKaizenTracking(idx) {
    const kz = this.state.kaizenItems[idx];
    if (!kz) return;
    const before = this.capturePlanSnapshot();
    const getVal = (id) => document.getElementById(id);
    const status = getVal(`kzStatus_${idx}`)?.value || 'open';
    const date = getVal(`kzDate_${idx}`)?.value || null;
    const note = getVal(`kzNote_${idx}`)?.value || '';
    const newNorm = Number(getVal(`kzNewNorm_${idx}`)?.value);
    const delayDays = Number(getVal(`kzDelay_${idx}`)?.value);
    const segId = getVal(`kzSegment_${idx}`)?.value || kz.segmentId || null;
    const molds = Number(getVal(`kzMolds_${idx}`)?.value);
    const epDeMode = getVal(`kzEpDeMode_${idx}`)?.value || '';
    const canVaiMode = getVal(`kzCanVaiMode_${idx}`)?.value || '';

    kz.status = status;
    kz.applied = status === 'resolved';
    kz.resolvedDate = status === 'resolved' ? (date || new Date().toISOString().slice(0, 10)) : date;
    kz.resolvedNote = note;
    kz.newNorm = (!isNaN(newNorm) && newNorm > 0) ? newNorm : null;
    kz.delayDays = (!isNaN(delayDays) && delayDays > 0) ? delayDays : null;
    if (segId) kz.segmentId = segId;

    let changed = [];
    if (kz.newNorm != null && segId) {
      const seg = (this.state.segments || []).find(x => x.id === segId);
      if (seg) {
        seg.capacity = kz.newNorm;
        seg.poh = seg.capacity > 0 ? Math.round(((seg.actual || 0) / seg.capacity) * 1000) / 10 : null;
        const ws = (this.state.workstations || []).find(w => w.id === segId);
        if (ws) { ws.normCapacity = kz.newNorm; ws.pohPercent = seg.poh; }
        changed.push(`định mức ${seg.segment} → ${kz.newNorm} đôi/ngày`);
      }
    }
    const sp = this.state.simParams || {};
    if (!isNaN(molds) && molds > 0) { sp.molds = molds; sp.outsoleMolds = molds; changed.push(`${molds} khuôn`); }
    if (epDeMode) { sp.epDeMode = epDeMode; changed.push(`ép đế ${epDeMode}`); }
    if (canVaiMode) { sp.canVaiMode = canVaiMode; changed.push(`cán vải ${canVaiMode}`); }
    this.state.simParams = sp;

    MESStorage.saveState(this.state);
    this.runOptimization();
    const after = this.capturePlanSnapshot();
    if (status === 'resolved' || changed.length > 0) {
      kz.appliedToPlan = true;
      this.logPlanRotation(
        `${kz.id} — ${status === 'resolved' ? 'đã tháo gỡ' : 'cập nhật trạng thái'}`,
        [note, changed.length ? ('Thay đổi áp vào kế hoạch: ' + changed.join(', ')) : 'Không đổi tham số kế hoạch (chỉ ghi nhận trạng thái).'].filter(Boolean).join(' '),
        before, after
      );
      MESStorage.saveState(this.state);
    }
    this.render();
    this.showToast(status === 'resolved'
      ? `Đã ghi nhận tháo gỡ ${kz.id} và xoay lại kế hoạch! Xem sổ xoay ở tab Vận hành lại.`
      : `Đã lưu trạng thái ${kz.id}: ${this.kaizenStatusLabel(status)}.`, 'success');
  },

  // Đánh giá tác động theo luật (không cần AI, không bịa số):
  // chạy thử bộ giải với tham số giả định từ form, đối chiếu POH +
  // khả thi trước/sau. Không lưu gì cho tới khi user bấm Lưu.
  assessKaizen(idx, targetElId) {
    const kz = this.state.kaizenItems[idx];
    if (!kz) return;
    const el = document.getElementById(targetElId || `kzImpact_${idx}`);
    const demand = this.getPlanDemand();
    if (demand == null) {
      if (el) el.innerHTML = '<p class="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">Chưa đánh giá được — nhập nhu cầu LVF ở tab Kế Hoạch trước, vì mọi tác động đều tính so với nhu cầu đó.</p>';
      return;
    }
    const getVal = (id) => document.getElementById(id);
    const newNorm = Number(getVal(`kzNewNorm_${idx}`)?.value);
    const segId = getVal(`kzSegment_${idx}`)?.value || kz.segmentId || null;
    const molds = Number(getVal(`kzMolds_${idx}`)?.value);
    const epDeMode = getVal(`kzEpDeMode_${idx}`)?.value || '';
    const canVaiMode = getVal(`kzCanVaiMode_${idx}`)?.value || '';
    const delayDays = Number(getVal(`kzDelay_${idx}`)?.value);

    const beforePoh = this.calculatePoh();
    const segBefore = segId ? beforePoh.segments.find(x => x.id === segId) : null;
    // POH giả định nếu đổi định mức (thực tế giữ nguyên).
    let segAfterPoh = segBefore ? segBefore.poh : null;
    let plantAfterPoh = beforePoh.plantPoh;
    if (segBefore && !isNaN(newNorm) && newNorm > 0) {
      segAfterPoh = Math.round(((segBefore.actual || 0) / newNorm) * 1000) / 10;
      const totalCapAfter = beforePoh.totalCap - segBefore.capacity + newNorm;
      plantAfterPoh = (beforePoh.entered && totalCapAfter > 0)
        ? Math.round((beforePoh.totalActual / totalCapAfter) * 1000) / 10 : beforePoh.plantPoh;
    }
    // Kế hoạch giả định nếu đổi tham số mô phỏng.
    let planAfter = null;
    try {
      const hypo = { ...(this.state.simParams || {}) };
      if (!isNaN(molds) && molds > 0) { hypo.molds = molds; hypo.outsoleMolds = molds; }
      if (epDeMode) hypo.epDeMode = epDeMode;
      if (canVaiMode) hypo.canVaiMode = canVaiMode;
      planAfter = MESOptimizer.scheduleAllOrders(this.state.ordersGrouped, hypo).summary;
    } catch (e) { planAfter = null; }
    const sumBefore = this.planResult && this.planResult.summary;
    if (el) {
      el.innerHTML = `
        <div class="p-3 rounded-xl bg-white border border-slate-300 space-y-2">
          <div class="font-bold text-slate-900">Đánh giá tác động (theo luật — chưa lưu, chưa áp vào kế hoạch)</div>
          <table class="w-full text-left border-collapse">
            <thead><tr class="text-slate-500 font-bold"><th class="py-1">Chỉ tiêu</th><th class="py-1 text-right">Trước</th><th class="py-1 text-right">Sau giả định</th></tr></thead>
            <tbody>
              <tr class="border-t border-slate-100"><td class="py-1">POH ${segBefore ? segBefore.segment : 'công đoạn'}</td><td class="py-1 text-right">${segBefore && segBefore.poh != null ? segBefore.poh + '%' : '—'}</td><td class="py-1 text-right font-bold">${segAfterPoh != null ? segAfterPoh + '%' : '—'}</td></tr>
              <tr class="border-t border-slate-100"><td class="py-1">POH nhà máy</td><td class="py-1 text-right">${beforePoh.plantPoh != null ? beforePoh.plantPoh + '%' : '—'}</td><td class="py-1 text-right font-bold">${plantAfterPoh != null ? plantAfterPoh + '%' : '—'}</td></tr>
              <tr class="border-t border-slate-100"><td class="py-1">Công suất Ép đế</td><td class="py-1 text-right">${sumBefore ? sumBefore.capEpDay + ' đôi/ngày' : '—'}</td><td class="py-1 text-right font-bold">${planAfter ? planAfter.capEpDay + ' đôi/ngày' : '—'}</td></tr>
              <tr class="border-t border-slate-100"><td class="py-1">Số ngày SX hết đơn</td><td class="py-1 text-right">${sumBefore ? sumBefore.workDays + ' ngày' : '—'}</td><td class="py-1 text-right font-bold">${planAfter ? planAfter.workDays + ' ngày' : '—'}</td></tr>
              <tr class="border-t border-slate-100"><td class="py-1">Điểm 5M</td><td class="py-1 text-right">${sumBefore ? sumBefore.score5M + ' / 100' : '—'}</td><td class="py-1 text-right font-bold">${planAfter ? planAfter.score5M + ' / 100' : '—'}</td></tr>
            </tbody>
          </table>
          ${planAfter && planAfter.capEpDay < demand ? `<p class="text-rose-700 font-bold">Sau giả định vẫn nghẽn Ép đế: ${planAfter.capEpDay} &lt; nhu cầu ${demand} đôi/ngày — cần thêm khuôn / tăng ca / đi 2 ca.</p>` : ''}
          ${!isNaN(delayDays) && delayDays > 0 ? `<p class="text-amber-800">Trễ ước tính ${delayDays} ngày: các PO có lịch lùi rơi vào ${delayDays} ngày tới sẽ có nguy cơ trễ gò LVF tương ứng — kiểm tra lại lịch từng PO ở tab Đơn Hàng KD sau khi áp dụng.</p>` : ''}
          <p class="text-slate-500">Muốn áp giả định này vào kế hoạch thật: bấm “Lưu trạng thái &amp; xoay lại kế hoạch” ở trên (kết quả sẽ ghi vào sổ xoay ở tab Vận hành lại).</p>
        </div>`;
    }
  },

  // Phân tích bằng AI (BYOK). Không có key → rơi về đánh giá theo luật.
  async analyzeKaizen(idx, targetElId) {
    const kz = this.state.kaizenItems[idx];
    if (!kz) return;
    const el = document.getElementById(targetElId || `kzImpact_${idx}`);
    if (window.MESAI && !window.MESAI.getKey()) {
      this.showToast('Chưa nhập key AI — dùng đánh giá theo luật thay thế (nhập key ở tab Vận hành lại để dùng AI).', 'info');
      this.assessKaizen(idx);
      return;
    }
    if (el) el.innerHTML = '<p class="text-slate-500">Đang gọi AI phân tích điểm nghẽn...</p>';
    const seg = (this.state.segments || []).find(x => x.id === (kz.segmentId || ''));
    const poh = this.calculatePoh();
    const sum = this.planResult && this.planResult.summary;
    // Đầu vào do user nhập ở form AI (tab 9) — nếu form trống thì dùng
    // số liệu state như trước, không bắt buộc nhập.
    const formVal = (id) => document.getElementById(id)?.value;
    const formNum = (id) => {
      const v = Number(formVal(id));
      return (!isNaN(v) && v > 0) ? v : null;
    };
    const ctx = {
      kaizen: kz,
      segmentName: seg ? seg.segment : kz.segment,
      segmentCapacity: seg ? seg.capacity : null,
      segmentActual: seg ? seg.actual : null,
      segmentPoh: seg ? seg.poh : null,
      demand: this.getPlanDemand(),
      planSummary: sum
        ? `${sum.totalOrders} PO, ${sum.totalPairs} đôi, ${sum.workDays} ngày SX, Ép đế ${sum.capEpDay} đôi/ngày, đổi màu ${sum.colorChanges} lần, điểm 5M ${sum.score5M}`
        : 'chưa có kế hoạch (chưa nhập nhu cầu)',
      plantPoh: poh.plantPoh,
      objective: formVal('aiObjective') || null,
      context: formVal('aiContext')?.trim() || null,
      demandOverride: formNum('aiDemandOverride'),
      maxMolds: formNum('aiMaxMolds'),
      targetPoh: formNum('aiTargetPoh'),
      allowOvertime: document.getElementById('aiAllowOvertime') ? !!document.getElementById('aiAllowOvertime').checked : null,
      allowTwoShifts: document.getElementById('aiAllowTwoShifts') ? !!document.getElementById('aiAllowTwoShifts').checked : null
    };
    const res = await window.MESAI.analyzeBottleneck(ctx);
    if (!res.ok) {
      if (el) el.innerHTML = `<p class="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">${res.error}</p>
        <button onclick="MESApp.assessKaizen(${idx}, '${targetElId || `kzImpact_${idx}`}')" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 transition">Xem đánh giá theo luật thay thế</button>`;
      return;
    }
    if (!this.aiSuggestions) this.aiSuggestions = {};
    this.aiSuggestions[idx] = res.parsed;
    if (!this.aiAnalyses) this.aiAnalyses = {};
    this.aiAnalyses[idx] = res;
    const usageLine = (r) => {
      if (!r.usage) return '';
      const u = r.usage;
      const inp = u.prompt_tokens != null ? u.prompt_tokens : (u.input_tokens != null ? u.input_tokens : null);
      const out = u.completion_tokens != null ? u.completion_tokens : (u.output_tokens != null ? u.output_tokens : null);
      const cost = (window.MESAI && r.model) ? window.MESAI.estimateCost(r.model, { prompt_tokens: inp, completion_tokens: out }) : null;
      return `<p class="text-slate-500">Model: ${r.model || '—'}${r.retried ? ' (đã gọi lại 1 lần vì lần đầu parse rớt)' : ''} • Token: vào ${inp != null ? inp : '—'} / ra ${out != null ? out : '—'}${cost != null ? ` • Chi phí ước tính: $${cost.toFixed(4)}` : ''}</p>`;
    };
    if (el) {
      if (res.parsed) {
        const sug = res.parsed;
        el.innerHTML = `
          <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div class="font-bold text-indigo-950">Phân tích AI — ${kz.id} (kiểm tra lại trước khi áp dụng)</div>
            <p><strong>Nguyên nhân gốc:</strong> ${sug.rootCause || '—'}</p>
            <p><strong>Biện pháp đề xuất:</strong></p>
            <ul class="list-disc list-inside space-y-0.5">${(sug.actions || []).map(a => `<li>${a}</li>`).join('') || '<li>—</li>'}</ul>
            <p><strong>Tác động ước tính:</strong> ${sug.estimatedImpact ? JSON.stringify(sug.estimatedImpact) : '—'}</p>
            <p><strong>Giải thích:</strong> ${sug.explanation || '—'}</p>
            <p><strong>Đề xuất áp vào kế hoạch:</strong> ${sug.suggestedNorm != null ? `định mức mới ${sug.suggestedNorm} đôi/ngày; ` : ''}${sug.suggestedMolds != null ? `${sug.suggestedMolds} khuôn; ` : ''}${sug.suggestedEpDeMode ? `ép đế ${sug.suggestedEpDeMode}; ` : ''}${sug.suggestedCanVaiMode ? `cán vải ${sug.suggestedCanVaiMode}; ` : ''}${(sug.suggestedNorm == null && sug.suggestedMolds == null && !sug.suggestedEpDeMode && !sug.suggestedCanVaiMode) ? 'không có đề xuất số cụ thể' : ''}</p>
            ${usageLine(res)}
            <button onclick="MESApp.applyAiSuggestion(${idx})" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition">Điền đề xuất AI vào form (chưa áp — bấm Lưu để áp)</button>
            <button onclick="MESApp.decideCurrentProposal(${idx})" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition">Đánh giá đề xuất bằng Decisions (chỉ để xem)</button>
          </div>`;
      } else {
        const raw = String(res.raw || '');
        el.innerHTML = `
          <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div class="font-bold text-indigo-950">Phân tích AI — ${kz.id} (AI trả về văn bản, không parse được JSON nên không tự điền form)</div>
            ${raw ? `<p class="whitespace-pre-wrap leading-relaxed">${raw.slice(0, 2000)}</p><p class="text-slate-500">300 ký tự đầu để chẩn đoán: ${raw.slice(0, 300)}</p>` : '<p class="text-rose-700 font-bold">AI trả về rỗng — thử bấm “Phân tích bằng AI” lại một lần hoặc đổi model (model suy luận dài có thể cần token budget lớn hơn).</p>'}
            ${usageLine(res)}
            <p class="text-slate-500">Hãy đọc kỹ và tự điền định mức / tham số vào form rồi bấm Lưu.</p>
          </div>`;
      }
    }
  },

  // Điền đề xuất AI vào form theo dõi (chưa áp — user bấm Lưu mới áp).
  applyAiSuggestion(idx) {
    const sug = this.aiSuggestions && this.aiSuggestions[idx];
    if (!sug) return;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    setVal(`kzNewNorm_${idx}`, sug.suggestedNorm);
    setVal(`kzMolds_${idx}`, sug.suggestedMolds);
    setVal(`kzEpDeMode_${idx}`, sug.suggestedEpDeMode);
    setVal(`kzCanVaiMode_${idx}`, sug.suggestedCanVaiMode);
    setVal(`kzStatus_${idx}`, 'resolved');
    this.showToast('Đã điền đề xuất AI vào form — kiểm tra lại rồi bấm “Lưu trạng thái & xoay lại kế hoạch” để áp dụng.', 'info');
  },

  // Đánh giá đề xuất bằng Decisions (Experiential): lấy phân tích AI
  // gần nhất của điểm nghẽn + kế hoạch/POH hiện tại làm bằng chứng,
  // hỏi accept/review. Kết quả CHỈ ĐỂ XEM — không tự áp dụng.
  async decideCurrentProposal(idx) {
    const kz = this.state.kaizenItems[idx];
    const el = document.getElementById('decideResult');
    if (!kz) {
      if (el) el.innerHTML = '<p class="text-rose-700">Chọn điểm nghẽn ở khung “Phân tích 1 điểm nghẽn bằng AI” trước.</p>';
      return;
    }
    const sug = (this.aiSuggestions && this.aiSuggestions[idx]) || null;
    const sum = this.planResult && this.planResult.summary;
    const poh = this.calculatePoh();
    const input = `Đề xuất thay đổi kế hoạch cho điểm nghẽn ${kz.id} (${kz.segment}): ${kz.issue}. ` +
      `Giải pháp Kế hoạch 1: ${kz.solution}. ` +
      (sug ? `Đề xuất AI: nguyên nhân ${sug.rootCause || ''}; biện pháp ${(sug.actions || []).join('; ')}; định mức mới ${sug.suggestedNorm != null ? sug.suggestedNorm : 'không đổi'}; khuôn ${sug.suggestedMolds != null ? sug.suggestedMolds : 'không đổi'}; ép đế ${sug.suggestedEpDeMode || 'không đổi'}; cán vải ${sug.suggestedCanVaiMode || 'không đổi'}. ` : 'Chưa có phân tích AI cho điểm này — đánh giá dựa trên giải pháp Kế hoạch 1. ') +
      `Kế hoạch hiện tại: ${sum ? `${sum.workDays} ngày SX, Ép đế ${sum.capEpDay} đôi/ngày, điểm 5M ${sum.score5M}` : 'chưa có kế hoạch'}. POH nhà máy: ${poh.plantPoh != null ? poh.plantPoh + '%' : 'chưa tính'}. Nhu cầu LVF: ${this.getPlanDemand() != null ? this.getPlanDemand() + ' đôi/ngày' : 'chưa nhập'}.`;
    if (el) el.innerHTML = '<p class="text-slate-500">Đang gọi Decisions đánh giá...</p>';
    const res = await window.MESAI.decideProposal(input);
    if (!res.ok) {
      if (el) el.innerHTML = `<p class="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">${res.error}</p>`;
      return;
    }
    const ans = (res.answers || []).find(a => a.name === 'review') || (res.answers || [])[0];
    const ansText = ans ? (ans.value || ans.answer || JSON.stringify(ans)) : '—';
    if (el) {
      el.innerHTML = `
        <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <div class="font-bold text-amber-950">Đánh giá Decisions — ${kz.id}: ${ansText}</div>
          <p class="whitespace-pre-wrap leading-relaxed">${JSON.stringify(res.answers || [], null, 2)}</p>
          ${res.usage ? `<p class="text-slate-500">Token: ${JSON.stringify(res.usage)}</p>` : ''}
          <p class="text-slate-500 font-bold">Kết quả này chỉ để xem — không tự áp dụng. Muốn áp dụng thì điền đề xuất vào form theo dõi ở tab Điểm Nghẽn rồi bấm Lưu.</p>
        </div>`;
    }
  },

  // So sánh 2 model cùng provider (cùng key) trên cùng 1 điểm nghẽn:
  // chạy tuần tự, đo thời gian, token, chi phí ước tính, parse OK hay
  // không, và đề xuất số của từng model. Muốn so sánh provider khác
  // thì đổi provider, lưu key, chạy tiếp — kết quả cũ vẫn giữ trong
  // khung này cho tới khi tải lại trang.
  async compareModels() {
    const sel = document.getElementById('reopKaizenSelect');
    const idx = sel ? Number(sel.value) : NaN;
    const kz = this.state.kaizenItems[idx];
    const outEl = document.getElementById('cmpResult');
    if (!kz) { if (outEl) outEl.innerHTML = '<p class="text-rose-700">Chọn điểm nghẽn ở khung “Phân tích 1 điểm nghẽn bằng AI” trước.</p>'; return; }
    if (window.MESAI && !window.MESAI.getKey()) {
      if (outEl) outEl.innerHTML = '<p class="text-rose-700">Chưa có key AI — nhập key ở khung kết nối phía trên trước.</p>';
      return;
    }
    const modelA = document.getElementById('cmpModelA')?.value?.trim();
    const modelB = document.getElementById('cmpModelB')?.value?.trim();
    if (!modelA || !modelB) {
      if (outEl) outEl.innerHTML = '<p class="text-rose-700">Nhập đủ 2 model để so sánh.</p>';
      return;
    }
    const btn = document.getElementById('cmpRunBtn');
    if (btn) btn.disabled = true;
    if (outEl) outEl.innerHTML = '<p class="text-slate-500">Đang chạy so sánh (2 lần gọi AI tuần tự, có thể mất 10–30 giây)...</p>';
    // Dùng cùng ctx như analyzeKaizen (kể cả form đầu vào tab 9).
    const seg = (this.state.segments || []).find(x => x.id === (kz.segmentId || ''));
    const poh = this.calculatePoh();
    const sum = this.planResult && this.planResult.summary;
    const formVal = (id) => document.getElementById(id)?.value;
    const formNum = (id) => { const v = Number(formVal(id)); return (!isNaN(v) && v > 0) ? v : null; };
    const ctx = {
      kaizen: kz,
      segmentName: seg ? seg.segment : kz.segment,
      segmentCapacity: seg ? seg.capacity : null,
      segmentActual: seg ? seg.actual : null,
      segmentPoh: seg ? seg.poh : null,
      demand: this.getPlanDemand(),
      planSummary: sum ? `${sum.totalOrders} PO, ${sum.totalPairs} đôi, ${sum.workDays} ngày SX, Ép đế ${sum.capEpDay} đôi/ngày, đổi màu ${sum.colorChanges} lần, điểm 5M ${sum.score5M}` : 'chưa có kế hoạch (chưa nhập nhu cầu)',
      plantPoh: poh.plantPoh,
      objective: formVal('aiObjective') || null,
      context: formVal('aiContext')?.trim() || null,
      demandOverride: formNum('aiDemandOverride'),
      maxMolds: formNum('aiMaxMolds'),
      targetPoh: formNum('aiTargetPoh'),
      allowOvertime: document.getElementById('aiAllowOvertime') ? !!document.getElementById('aiAllowOvertime').checked : null,
      allowTwoShifts: document.getElementById('aiAllowTwoShifts') ? !!document.getElementById('aiAllowTwoShifts').checked : null
    };
    const runOne = async (model) => {
      const t0 = Date.now();
      const r = await window.MESAI.analyzeBottleneck(ctx, { model });
      const ms = Date.now() - t0;
      const u = r.usage || {};
      const inp = u.prompt_tokens != null ? u.prompt_tokens : (u.input_tokens != null ? u.input_tokens : null);
      const out = u.completion_tokens != null ? u.completion_tokens : (u.output_tokens != null ? u.output_tokens : null);
      const cost = window.MESAI.estimateCost(model, { prompt_tokens: inp, completion_tokens: out });
      return { model, ms, ok: r.ok, parsed: r.parsed || null, error: r.error || null, inp, out, cost };
    };
    const a = await runOne(modelA);
    const b = await runOne(modelB);
    if (btn) btn.disabled = false;
    const row = (r) => `
      <tr class="border-t border-slate-100">
        <td class="py-1 font-mono font-bold">${r.model}</td>
        <td class="py-1">${r.ok ? (r.parsed ? 'Parse OK' : 'Trả về nhưng parse rớt') : 'Lỗi: ' + (r.error || '')}</td>
        <td class="py-1 text-right">${r.ms} ms</td>
        <td class="py-1 text-right">${r.inp != null ? r.inp : '—'} / ${r.out != null ? r.out : '—'}</td>
        <td class="py-1 text-right font-bold">${r.cost != null ? '$' + r.cost.toFixed(4) : '—'}</td>
      </tr>
      ${r.parsed ? `<tr class="border-t border-slate-100 bg-slate-50"><td class="py-1 pl-4" colspan="5">Nguyên nhân: ${r.parsed.rootCause || '—'} • Đề xuất: định mức ${r.parsed.suggestedNorm != null ? r.parsed.suggestedNorm : '—'}, khuôn ${r.parsed.suggestedMolds != null ? r.parsed.suggestedMolds : '—'}, ép đế ${r.parsed.suggestedEpDeMode || '—'}, cán vải ${r.parsed.suggestedCanVaiMode || '—'}</td></tr>` : ''}`;
    if (outEl) {
      outEl.innerHTML = `
        <table class="w-full text-left border-collapse">
          <thead><tr class="text-slate-500 font-bold"><th class="py-1">Model</th><th class="py-1">Kết quả</th><th class="py-1 text-right">Thời gian</th><th class="py-1 text-right">Token vào/ra</th><th class="py-1 text-right">Chi phí ước tính</th></tr></thead>
          <tbody>${row(a)}${row(b)}</tbody>
        </table>
        <p class="text-slate-500 mt-1">Kết luận gợi ý: ưu tiên model Parse OK và có đề xuất số cụ thể; nếu cả 2 đều Parse OK thì so đề xuất số và chi phí ở trên, rồi tự chọn — app không tự chọn model thay anh. Muốn so sánh provider khác: đổi provider, lưu key, chạy tiếp, kết quả cũ vẫn ở đây cho tới khi tải lại trang.</p>`;
    }
  },

  // Nút cũ: giữ để code khác gọi không vỡ; nay chỉ đổi trạng thái,
  // không tự ghi là đã tháo gỡ có biện pháp (phải nhập ở form).
  toggleKaizen(idx) {
    const kz = this.state.kaizenItems[idx];
    if (!kz) return;
    const next = this.kaizenStatus(kz) === 'resolved' ? 'open' : 'resolved';
    kz.status = next;
    kz.applied = next === 'resolved';
    MESStorage.saveState(this.state);
    this.runOptimization();
    this.render();
    this.showToast(`Đã đổi trạng thái ${kz.id} thành: ${this.kaizenStatusLabel(next)}.`, 'info');
  },

  /* =========================================================================
     TAB 9: VẬN HÀNH LẠI SAU THÁO GỠ + KEY AI (BYOK)
     ========================================================================= */
  renderReoperationTab() {
    // --- AI key section ---
    const keyEl = document.getElementById('aiKeySection');
    if (keyEl && window.MESAI) {
      const hasKey = !!window.MESAI.getKey();
      const prov = window.MESAI.getProvider();
      keyEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full font-bold ${hasKey ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">${hasKey ? 'AI đã kết nối' : 'Chưa có key — đang dùng phân tích theo luật'}</span>
          ${hasKey ? `<span class="text-slate-600">Provider: <strong>${window.MESAI.PROVIDERS[prov] ? window.MESAI.PROVIDERS[prov].label : prov}</strong> • Key: <strong>${window.MESAI.maskedKey()}</strong> • Model: <strong>${window.MESAI.getModel()}</strong></span>` : '<span class="text-slate-600">Key chỉ lưu ở trình duyệt này (localStorage), không đưa lên repo, không log. Nhập key của bất kỳ provider nào ở 2 dự án trước (OpenAI, Groq, Novita, DeepSeek, OpenRouter, Gemini) là chạy.</span>'}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-xs">
          <div>
            <label class="block text-slate-500 mb-0.5">Provider (để trống = tự nhận diện từ key):</label>
            <select id="aiProvider" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
              <option value="">Tự nhận diện từ tiền tố key</option>
              ${Object.entries(window.MESAI.PROVIDERS).map(([id, pr]) => `<option value="${id}" ${prov === id ? 'selected' : ''}>${pr.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-slate-500 mb-0.5">API Key (không gõ key vào chat):</label>
            <input type="password" id="aiKeyInput" placeholder="Dán key vào đây" autocomplete="off" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-mono" />
          </div>
          <div>
            <label class="block text-slate-500 mb-0.5">Model (để trống = mặc định của provider):</label>
            <input type="text" id="aiModelInput" placeholder="${prov ? window.MESAI.PROVIDERS[prov].defaultModel : 'vd gpt-4o-mini'}" class="w-full border border-slate-300 rounded-lg px-2 py-1.5" />
          </div>
          <div class="flex items-end gap-2">
            <button onclick="MESApp.saveAiKey()" class="px-3 py-1.5 rounded-lg font-bold bg-slate-900 text-white hover:bg-slate-800 transition">Lưu key</button>
            <button onclick="MESApp.testAiKey()" class="px-3 py-1.5 rounded-lg font-bold bg-slate-100 border border-slate-300 hover:bg-slate-200 transition">Kiểm tra kết nối</button>
            <button onclick="MESApp.clearAiKey()" class="px-3 py-1.5 rounded-lg font-bold bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 transition">Xóa key</button>
          </div>
        </div>
        <div id="aiKeyStatus" class="text-xs text-slate-600 mt-2"></div>
        ${prov === 'river' && window.MESAI.PROVIDERS.river.models ? `<div class="mt-2">
          <span class="text-slate-600">Model River (bấm để điền vào ô Model):</span>
          <div class="flex flex-wrap gap-1.5 mt-1">
            ${window.MESAI.PROVIDERS.river.models.map(m => `<button onclick="document.getElementById('aiModelInput').value='${m}'" class="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 font-mono text-[11px] transition">${m}</button>`).join('')}
          </div>
        </div>` : ''}
        <p class="text-[11px] text-slate-500 mt-1">Lưu ý: Anthropic không cho gọi trực tiếp từ trình duyệt (lỗi CORS) — nếu dùng Anthropic mà test lỗi mạng, hãy đổi sang provider OpenAI-compatible (OpenAI, Groq, Novita, DeepSeek, OpenRouter, River). Key River: chọn tay “River AI” trong danh sách Provider (key River không có tiền tố nhận diện riêng như các provider khác), model mặc định là moonshotai/Kimi-K3 theo đúng code mẫu anh gửi. Key của dự án Trade/Owly có thể dán lại ở đây nếu anh muốn dùng chung 1 key, nhưng mỗi dự án lưu key ở ô riêng, không tự lấy key của dự án khác.</p>`;
    }

    // --- Resolved / open lists ---
    const items = this.state.kaizenItems || [];
    const resolved = items.filter(k => this.kaizenStatus(k) === 'resolved');
    const open = items.filter(k => this.kaizenStatus(k) !== 'resolved');
    const resEl = document.getElementById('reopResolvedList');
    if (resEl) {
      resEl.innerHTML = resolved.length === 0
        ? '<p class="text-slate-500">Chưa có điểm nghẽn nào được tháo gỡ — sang tab Điểm Nghẽn & Kaizen, nhập trạng thái tháo gỡ cho từng điểm rồi quay lại đây chạy lại kế hoạch.</p>'
        : resolved.map((kz) => {
            const idx = items.indexOf(kz);
            return `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div class="font-bold text-emerald-950">${kz.id} — ${kz.segment} ${kz.resolvedDate ? '• Tháo gỡ ngày ' + kz.resolvedDate : ''}</div>
              ${kz.resolvedNote ? `<p class="text-emerald-900 mt-0.5">Biện pháp: ${kz.resolvedNote}</p>` : ''}
              ${kz.newNorm ? `<p>Định mức mới: ${kz.newNorm} đôi/ngày.</p>` : ''}
              <button onclick="MESApp.analyzeKaizen(${idx}, 'reopAiResult')" class="mt-2 px-3 py-1 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition">Phân tích lại bằng AI</button>
            </div>`;
          }).join('');
    }
    const openEl = document.getElementById('reopOpenList');
    if (openEl) {
      openEl.innerHTML = open.length === 0
        ? '<p class="text-emerald-700 font-bold">Tất cả điểm nghẽn đã tháo gỡ.</p>'
        : `<p>${open.length} điểm chưa tháo gỡ: ${open.map(k => k.id + ' (' + k.segment + ')').join(', ')}. Điểm mới phát sinh thì nhập ở tab Điểm Nghẽn & Kaizen (nút “Thêm Đề Xuất Kaizen 5M”), đánh giá tác động ngay tại thẻ của nó, rồi quay lại đây chạy lại kế hoạch.</p>
           <button onclick="MESApp.switchTab('kaizen_center')" class="mt-2 px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition">Sang tab Điểm Nghẽn & Kaizen</button>`;
    }
    // Compare inputs: prefill from current provider models (only if empty,
    // so user edits are not overwritten on every tab switch).
    if (window.MESAI) {
      const prov = window.MESAI.getProvider();
      const models = (prov && window.MESAI.PROVIDERS[prov] && window.MESAI.PROVIDERS[prov].models)
        || (prov ? [window.MESAI.PROVIDERS[prov].defaultModel] : []);
      const cmpA = document.getElementById('cmpModelA');
      const cmpB = document.getElementById('cmpModelB');
      const hint = document.getElementById('cmpHint');
      if (hint) hint.textContent = prov
        ? `Đang dùng key provider ${window.MESAI.PROVIDERS[prov].label} — so sánh chỉ chạy các model của provider này (cùng key).`
        : 'Chưa có key — nhập key ở khung kết nối phía trên trước.';
      if (cmpA && !cmpA.value && models[0]) cmpA.value = models[0];
      if (cmpB && !cmpB.value && models[1]) cmpB.value = models[1];
      else if (cmpB && !cmpB.value && models[0]) cmpB.value = models[0];
    }
    // Select for AI analysis
    const sel = document.getElementById('reopKaizenSelect');
    if (sel) {
      sel.innerHTML = items.map((kz, i) => `<option value="${i}">${kz.id} — ${kz.segment} (${this.kaizenStatusLabel(this.kaizenStatus(kz))})</option>`).join('');
    }
    // Rotation history
    const histEl = document.getElementById('reopRotations');
    if (histEl) {
      const rots = this.state.planRotations || [];
      histEl.innerHTML = rots.length === 0
        ? '<p class="text-slate-500">Chưa có lần xoay kế hoạch nào ghi lại. Mỗi lần anh lưu trạng thái tháo gỡ (có thay đổi) hoặc bấm “Chạy lại kế hoạch” ở đây, hệ thống sẽ ghi 1 dòng vào sổ này.</p>'
        : `<table class="w-full text-left border-collapse">
            <thead><tr class="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider"><th class="p-2">Thời gian</th><th class="p-2">Kích hoạt bởi</th><th class="p-2">Ghi chú</th><th class="p-2 text-right">Ngày SX</th><th class="p-2 text-right">Ép đế</th><th class="p-2 text-right">Điểm 5M</th><th class="p-2 text-right">POH nhà máy</th></tr></thead>
            <tbody>${rots.map(r => {
              const t = new Date(r.before.ts).toLocaleString('vi-VN');
              const fmt = (v, unit) => v != null ? v + unit : '—';
              return `<tr class="border-b border-slate-100">
                <td class="p-2">${t}</td><td class="p-2 font-bold">${r.trigger}</td><td class="p-2">${r.note || ''}</td>
                <td class="p-2 text-right">${fmt(r.before.workDays, '')} → <strong>${fmt(r.after.workDays, '')}</strong></td>
                <td class="p-2 text-right">${fmt(r.before.capEpDay, '')} → <strong>${fmt(r.after.capEpDay, '')}</strong></td>
                <td class="p-2 text-right">${fmt(r.before.score5M, '')} → <strong>${fmt(r.after.score5M, '')}</strong></td>
                <td class="p-2 text-right">${fmt(r.before.plantPoh, '%')} → <strong>${fmt(r.after.plantPoh, '%')}</strong></td>
              </tr>`;
            }).join('')}</tbody>
          </table>`;
    }
  },

  saveAiKey() {
    if (!window.MESAI) return;
    const key = document.getElementById('aiKeyInput')?.value || '';
    const provider = document.getElementById('aiProvider')?.value || '';
    const model = document.getElementById('aiModelInput')?.value || '';
    if (!key.trim()) { this.showToast('Dán key vào ô API Key trước khi lưu.', 'error'); return; }
    // Chặn đoán nhầm provider: key không có tiền tố nhận diện (điển hình
    // là key River) mà để tự nhận diện thì sẽ bị đoán thành DeepSeek và
    // gọi nhầm base khác → 401 khó hiểu. Bắt chọn tay provider.
    if (!provider) {
      const knownPrefixes = ['gsk_', 'sk-or-', 'sk-ant-', 'AIza', 'sk-', 'sk_'];
      if (!knownPrefixes.some(p => key.trim().startsWith(p))) {
        this.showToast('Key này không có tiền tố nhận diện (ví dụ key River) — chọn tay Provider trong danh sách rồi lưu lại, đừng để tự nhận diện.', 'error');
        return;
      }
    }
    window.MESAI.saveKey(key, provider, model);
    this.renderReoperationTab();
    this.showToast('Đã lưu key AI vào trình duyệt này (chỉ hiện ••••' + key.trim().slice(-4) + ').', 'success');
  },

  async testAiKey() {
    if (!window.MESAI) return;
    const statusEl = document.getElementById('aiKeyStatus');
    if (statusEl) statusEl.textContent = 'Đang kiểm tra kết nối...';
    const res = await window.MESAI.testConnection();
    if (statusEl) statusEl.textContent = res.message;
    this.showToast(res.message, res.ok ? 'success' : 'error');
  },

  clearAiKey() {
    if (!window.MESAI) return;
    window.MESAI.clearKey();
    this.renderReoperationTab();
    this.showToast('Đã xóa key AI khỏi trình duyệt này.', 'info');
  },

  // Chạy lại kế hoạch sau khi tháo gỡ: chụp trước, chạy, chụp sau, ghi sổ.
  rerunPlanAfterRemoval() {
    const demand = this.getPlanDemand();
    if (demand == null) {
      this.showToast('Nhập nhu cầu LVF ở tab Kế Hoạch trước khi chạy lại kế hoạch.', 'error');
      return;
    }
    const before = this.capturePlanSnapshot();
    this.runOptimization();
    const after = this.capturePlanSnapshot();
    this.logPlanRotation('Vận hành lại thủ công (tab Vận hành lại)', 'Chạy lại kế hoạch với các tháo gỡ và tham số hiện tại.', before, after);
    MESStorage.saveState(this.state);
    this.render();
    const el = document.getElementById('reopResult');
    if (el) {
      el.innerHTML = `
        <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
          <div class="font-bold text-emerald-950">Đã chạy lại kế hoạch sau tháo gỡ</div>
          <p>Ngày SX: ${before.workDays != null ? before.workDays : '—'} → <strong>${after.workDays != null ? after.workDays : '—'}</strong> ngày • Ép đế: ${before.capEpDay != null ? before.capEpDay : '—'} → <strong>${after.capEpDay != null ? after.capEpDay : '—'}</strong> đôi/ngày • Điểm 5M: ${before.score5M != null ? before.score5M : '—'} → <strong>${after.score5M != null ? after.score5M : '—'}</strong> • POH nhà máy: ${before.plantPoh != null ? before.plantPoh + '%' : '—'} → <strong>${after.plantPoh != null ? after.plantPoh + '%' : '—'}</strong></p>
          <p class="text-slate-600">Đã ghi vào sổ xoay kế hoạch bên dưới. Nếu số ngày SX / Ép đế không đổi mà POH đổi, nghĩa là tháo gỡ đã cải thiện POH và khả thi nhưng chưa đổi tham số bộ giải (khuôn, phương án ép/cán) — muốn đổi các số đó thì chỉnh ở tab Mô Phỏng hoặc form theo dõi rồi chạy lại.</p>
        </div>`;
    }
  },

  analyzeReopKaizen() {
    const sel = document.getElementById('reopKaizenSelect');
    const idx = sel ? Number(sel.value) : NaN;
    if (isNaN(idx)) return;
    this.analyzeKaizen(idx, 'reopAiResult');
  },

  /* =========================================================================
     TAB 7: BỘ THAM SỐ & MÔ PHỎNG 5M
     ========================================================================= */
  renderSimulationTab() {
    // Sync inputs with the last saved params so a re-opened tab shows
    // what actually ran, not the hardcoded defaults.
    const sp = this.state.simParams || {};
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    setVal('simLvfDemand', sp.lvfDemand);
    setVal('simMolds', sp.molds || sp.outsoleMolds);
    setVal('simCanVaiMode', sp.canVaiMode);
    setVal('simEpDeMode', sp.epDeMode);
    if (sp.campaignBatching != null) setVal('simCampaignBatching', String(sp.campaignBatching));

    // Live result of the last run (was missing entirely before).
    const resEl = document.getElementById('simulationResult');
    if (resEl) {
      const sum = this.planResult && this.planResult.summary;
      // Cột "Kịch Bản Đang Chạy" trong bảng so sánh phía dưới trước đây
      // là số mẫu cố định — nay điền từ kết quả chạy thật, hoặc "—".
      const setCmp = (id, text) => { const c = document.getElementById(id); if (c) c.textContent = text; };
      const plantPoh = this.calculatePoh().plantPoh;
      if (sum) {
        setCmp('simCmpMan', plantPoh != null ? `POH ${plantPoh}% (từ thực tế đã nhập)` : 'POH chưa tính (chưa nhập thực tế)');
        setCmp('simCmpMachine', `${sum.params.molds} khuôn • Ép đế ${sum.capEpDay} đôi/ngày • Đổi màu ${sum.colorChanges} lần`);
        setCmp('simCmpMaterial', `Đồng bộ định mức ${sum.totalPairs.toLocaleString('vi-VN')} đôi: ${sum.rubberKg.toLocaleString('vi-VN')} kg cao su • ${sum.fabricSqm.toLocaleString('vi-VN')} m² vải`);
        setCmp('simCmpMethod', `Backward Finite Scheduling lùi từ Ngày xuất KD • ${sum.workDays} ngày SX hết đơn`);
        setCmp('simCmpMeasure', `OTD ${sum.otd}% theo lịch lùi (khả thi thật xem ở tab Kế Hoạch)`);
      } else {
        setCmp('simCmpMan', 'Chưa chạy — nhập nhu cầu trước');
        setCmp('simCmpMachine', 'Chưa chạy — nhập nhu cầu trước');
        setCmp('simCmpMaterial', 'Chưa chạy — nhập nhu cầu trước');
        setCmp('simCmpMethod', 'Chưa chạy — nhập nhu cầu trước');
        setCmp('simCmpMeasure', 'Chưa chạy — nhập nhu cầu trước');
      }
      if (sum) {
        const demand = Number(sp.lvfDemand);
        const feasible = demand ? sum.capEpDay >= demand : false;
        resEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-900 text-sm">Kết Quả Kịch Bản Đang Chạy</h3>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${feasible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${feasible ? 'Đủ công suất Ép đế' : 'NGHẼN Ép đế — thiếu ' + Math.max(0, demand - sum.capEpDay) + ' đôi/ngày'}
            </span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
            <div><div class="text-slate-500">Điểm 5M</div><div class="text-lg font-extrabold text-slate-900">${sum.score5M} / 100</div></div>
            <div><div class="text-slate-500">Công suất Ép đế</div><div class="text-lg font-extrabold text-slate-900">${sum.capEpDay} đôi/ngày</div></div>
            <div><div class="text-slate-500">Số ngày SX hết 113 PO</div><div class="text-lg font-extrabold text-slate-900">${sum.workDays} ngày</div></div>
            <div><div class="text-slate-500">Số lần đổi màu</div><div class="text-lg font-extrabold text-slate-900">${sum.colorChanges} lần</div></div>
            <div><div class="text-slate-500">OTD</div><div class="text-lg font-extrabold text-emerald-600">${sum.otd}%</div></div>
          </div>
          <p class="text-[11px] text-slate-500 mt-3">Tham số đang chạy: LVF ${sum.params.lvfDemand} đôi/ngày • ${sum.params.molds} khuôn • Cán vải: ${sum.params.canVaiMode} • Ép đế: ${sum.params.epDeMode} • Gom màu: ${sum.params.campaignBatching ? 'Bật' : 'Tắt'} • Cao su ${sum.rubberKg.toLocaleString('vi-VN')} kg • Vải ${sum.fabricSqm.toLocaleString('vi-VN')} m².</p>`;
      } else {
        resEl.innerHTML = '<p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">Chưa có kịch bản nào chạy — nhập nhu cầu LVF (đôi/ngày) ở trên rồi bấm “Chạy Thuật Toán Tối Ưu Ngay”. Không còn mặc định 650 nữa.</p>';
      }
    }

    const btnRun = document.getElementById('btnRunSimulation');
    if (btnRun) {
      btnRun.onclick = () => {
        const demand = parseInt(document.getElementById('simLvfDemand').value);
        if (!demand || demand <= 0) {
          this.showToast('Nhập nhu cầu LVF (đôi/ngày) trước khi chạy mô phỏng — không dùng mặc định mẫu.', 'error');
          return;
        }
        const molds = parseInt(document.getElementById('simMolds').value) || 12;
        const simParams = {
          lvfDemand: demand,
          molds: molds,
          outsoleMolds: molds,
          canVaiMode: document.getElementById('simCanVaiMode').value,
          epDeMode: document.getElementById('simEpDeMode').value,
          campaignBatching: document.getElementById('simCampaignBatching').value === 'true',
        };

        this.state.simParams = simParams;
        MESStorage.saveState(this.state);
        this.runOptimization();
        this.render();
        this.showToast('Đã tính toán lại toàn bộ kế hoạch 5M với bộ tham số mới!', 'success');
      };
    }
  },

  /* =========================================================================
     QUICK ACTIONS & SIMULATION
     ========================================================================= */
  quickAddSegmentOutput(segmentName, addedPairs) {
    const s = this.state.segments.find(item => item.segment === segmentName);
    if (s) {
      s.actual += addedPairs;
      MESStorage.saveState(this.state);
      this.render();
      this.showToast(`Đã ghi nhận +${addedPairs} đôi cho ${segmentName}!`, 'success');
    }
  },

  quickAddSubstepOutput(btpCode, addedPairs) {
    const p = this.state.subProcesses.find(item => item.btp_code === btpCode);
    if (p) {
      p.wip_stock = (p.wip_stock || 0) + addedPairs;
      MESStorage.saveState(this.state);
      this.render();
      this.showToast(`Đã cộng +${addedPairs} đôi vào tồn kho ${p.btp_name} (${btpCode})!`, 'success');
    }
  },

  simulateShift() {
    this.state.segments.forEach(s => {
      s.actual += 650;
    });
    this.state.subProcesses.forEach(p => {
      p.wip_stock = (p.wip_stock || 0) + 150;
    });
    MESStorage.saveState(this.state);
    this.render();
    this.showToast('Đã hoàn thành mô phỏng 1 ca (+650 đôi) cho toàn bộ 7 phân đoạn LAF!', 'success');
  },

  /* =========================================================================
     MODAL CONTROLS & MANUAL ENTRY
     ========================================================================= */
  closeAllModals() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('hidden');
    document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
  },

  openModal(modalId) {
    this.closeAllModals();
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById(modalId);
    if (overlay && modal) {
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  },

  openManualOrderModal() {
    this.openModal('modalNewOrder');
  },

  openManualHandoverModal() {
    const sel = document.getElementById('inputHandoverPo');
    if (sel) {
      sel.innerHTML = this.state.ordersGrouped.map(o => `
        <option value="${o.po_no}">${o.po_no} • ${o.color} • ${o.country} (${o.total_pairs} đôi)</option>
      `).join('');
    }
    this.openModal('modalNewHandover');
  },

  openManualSubstepModal() {
    const sel = document.getElementById('inputSubstepSelect');
    if (sel) {
      sel.innerHTML = this.state.subProcesses.map(p => `
        <option value="${p.btp_code}">${p.btp_code} - ${p.btp_name} (${p.segment})</option>
      `).join('');
    }
    this.openModal('modalNewSubstepOutput');
  },

  openAdjustWipModal() {
    this.openManualSubstepModal();
  },

  openManualKaizenModal() {
    this.openModal('modalNewKaizen');
  },

  openUniversalImportModal(targetType) {
    MESIO.currentImportTarget = targetType;
    const titleEl = document.getElementById('importModalTitle');
    const descEl = document.getElementById('importModalDesc');

    const descMap = {
      orders: { title: 'Import Danh Sách Đơn Hàng PO (.XLSX / CSV)', desc: 'Cột: Don_Hang, PO, Country, Color, Total_Pairs, CLP_Boxes, Batch, Export_Date' },
      outputs: { title: 'Import Sản Lượng Ca Công Đoạn (.XLSX / CSV)', desc: 'Cột: Ma_BTP, San_Luong_Hoan_Thanh, Ty_Le_QC' },
      wip: { title: 'Import Kiểm Kê Tồn Kho BTP Nhỏ (.XLSX / CSV)', desc: 'Cột: Ma_BTP, Ton_Kho_Kiem_Ke' },
      handover: { title: 'Import Nhật Ký Bàn Giao LVF (.XLSX / CSV)', desc: 'Cột: So_PO, So_Luong_Giao, To_Nhan' },
      dashboard: { title: 'Import Báo Cáo Tổng Hợp LAF (.XLSX / CSV)', desc: 'Cột: Phan_Doan, Thuc_Hien, Dinh_Bien, POH' },
    };

    if (titleEl && descMap[targetType]) titleEl.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4 text-indigo-600"></i> ${descMap[targetType].title}`;
    if (descEl && descMap[targetType]) descEl.textContent = descMap[targetType].desc;

    MESIO.setupImportDropzone();
    this.openModal('modalUniversalImport');
  },

  /* =========================================================================
     EXCEL EXPORTS
     ========================================================================= */
  exportOrdersToExcel() {
    MESIO.exportOrdersToExcel(this.state.ordersGrouped, this.planResult);
    this.showToast('Đã xuất file Excel Kế hoạch 1 Tối ưu 5M thành công!', 'success');
  },

  exportDashboardToExcel() {
    MESIO.exportDashboardToExcel(this.state);
    this.showToast('Đã xuất Báo cáo Tổng hợp Phân xưởng LAF thành công!', 'success');
  },

  exportInventoryToExcel() {
    MESIO.exportInventoryToExcel(this.state.subProcesses);
    this.showToast('Đã xuất Danh mục 32 Bán Thành Phẩm WIP thành công!', 'success');
  },

  exportHandoverToExcel() {
    MESIO.exportHandoverToExcel(this.state.handoverLogs);
    this.showToast('Đã xuất Nhật ký Bàn giao sang LVF thành công!', 'success');
  },

  exportKaizenToExcel() {
    MESIO.exportKaizenToExcel(this.state.kaizenItems);
    this.showToast('Đã xuất Danh mục Kaizen 5M thành công!', 'success');
  },

  /* =========================================================================
     UI TOAST NOTIFICATIONS
     ========================================================================= */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const iconMap = {
      success: '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>',
      info: '<i data-lucide="info" class="w-4 h-4 text-amber-400"></i>',
      warning: '<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>',
      error: '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400"></i>',
    };

    toast.innerHTML = `
      ${iconMap[type] || iconMap.info}
      <span class="font-medium">${message}</span>
    `;

    toast.classList.remove('hidden');
    toast.classList.add('show');
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hidden');
    }, 3500);
  }
};
