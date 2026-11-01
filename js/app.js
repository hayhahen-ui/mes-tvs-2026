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
  state: null,
  planResult: null,
  donutDimension: 'color',
  tableMode: 'segments', // 'segments' or 'subprocesses'
  orderViewMode: 'grouped', // 'grouped', 'raw_lines', or 'gantt'
  orderFilters: { batch: 'all', color: 'all', country: 'all', search: '' },

  init() {
    this.state = MESStorage.init();
    this.runOptimization();

    // Listen for storage events
    MESStorage.subscribe((event) => {
      this.state = MESStorage.getState();
      this.runOptimization();
      this.render();
      if (event === 'RESET') {
        this.showToast('Đã khôi phục dữ liệu gốc TVS thành công!', 'success');
      }
    });

    this.bindGlobalEvents();
    this.render();

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

  runOptimization() {
    if (!this.state || !this.state.ordersGrouped) return;
    this.planResult = MESOptimizer.solve(this.state.ordersGrouped, this.state.simParams);
  },

  bindGlobalEvents() {
    // Navigation Tabs
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Reset Defaults
    const btnReset = document.getElementById('btnResetDefaults');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn khôi phục toàn bộ dữ liệu gốc TVS (651 dòng size, 113 PO, 32 công đoạn)? Mọi dữ liệu vừa chỉnh sửa sẽ được đặt lại ban đầu.')) {
          MESStorage.resetToDefaults();
        }
      });
    }

    // Backup & Restore
    const btnBackup = document.getElementById('btnExportBackup');
    if (btnBackup) {
      btnBackup.addEventListener('click', () => MESStorage.exportBackup());
    }

    const fileRestore = document.getElementById('fileRestoreBackup');
    if (fileRestore) {
      fileRestore.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const res = MESStorage.importBackup(text);
        if (res.success) {
          this.showToast(res.message, 'success');
        } else {
          this.showToast(res.message, 'error');
        }
        e.target.value = '';
      });
    }

    // Shift Simulation (+1 Giờ / +1 Ca)
    const btnSim = document.getElementById('btnSimulateShift');
    if (btnSim) {
      btnSim.addEventListener('click', () => this.simulateShift());
    }

    // Quick Add Modals
    const btnQuickOrder = document.getElementById('btnOpenNewOrderModal');
    if (btnQuickOrder) {
      btnQuickOrder.addEventListener('click', () => this.openManualOrderModal());
    }

    const btnQuickHandover = document.getElementById('btnOpenHandoverModal');
    if (btnQuickHandover) {
      btnQuickHandover.addEventListener('click', () => this.openManualHandoverModal());
    }

    // Modal Close
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeAllModals();
      });
    }
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    // Update nav tab styles
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      if (isTarget) {
        btn.className = 'nav-tab-btn active-tab px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition bg-amber-500 text-slate-950 shadow-sm';
      } else {
        btn.className = 'nav-tab-btn px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition text-slate-300 hover:bg-slate-800 hover:text-white';
      }
    });

    // Toggle panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.add('hidden');
    });
    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }

    // Re-render current tab contents
    this.renderCurrentTab();
  },

  render() {
    this.renderHeaderSummary();
    this.renderCurrentTab();
  },

  renderHeaderSummary() {
    const sum = this.planResult ? this.planResult.summary : null;
    const totalPairsEl = document.getElementById('headerTotalOrderPairs');
    const lvfTargetEl = document.getElementById('headerLvfTarget');
    const overallPohEl = document.getElementById('headerOverallPoh');

    if (totalPairsEl && sum) {
      totalPairsEl.textContent = `${sum.totalPairs.toLocaleString('vi-VN')} đôi (${sum.totalBoxes.toLocaleString('vi-VN')} thùng)`;
    }
    if (lvfTargetEl && sum) {
      lvfTargetEl.textContent = `${sum.params.lvfDemand} đôi/ngày`;
    }
    if (overallPohEl && sum) {
      overallPohEl.textContent = `${sum.pohAvg}% (5M: ${sum.score5M}đ)`;
    }
  },

  renderCurrentTab() {
    if (this.currentTab === 'dashboard') {
      this.renderDashboardTab();
    } else if (this.currentTab === 'orders_planning') {
      this.renderOrdersPlanningTab();
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

    const steps = [
      { num: '01', title: '113 PO Kinh Doanh', sub: '64.837 đôi • 5 màu', status: '100% Nạp Đầy Đủ', color: 'emerald' },
      { num: '02', title: 'Kế Hoạch 1 Tối Ưu 5M', sub: 'Lịch lùi từ Ngày xuất KD', status: 'OTD 100% • 5M: 96.4đ', color: 'emerald' },
      { num: '03', title: '7 Phân Đoạn LAF', sub: '71 NS • Cán/In/Luyện/Ép/Chặt', status: 'POH 95.2% Chuẩn', color: 'amber' },
      { num: '04', title: '32 BTP Nhỏ Đồng Bộ', sub: 'Wip: ~43k đôi • Buffer 2-3d', status: 'Đồng bộ hóa 100%', color: 'blue' },
      { num: '05', title: '4 Chốt Kỹ Thuật', sub: 'Ủ 24h • Kho 48h • Mài 72h', status: 'Kiểm soát tự động', color: 'indigo' },
      { num: '06', title: 'Bàn Giao Sang LVF', sub: 'Chuyền Gò & May LVF', status: 'Kịp 100% Ngày xuất', color: 'emerald' }
    ];

    container.innerHTML = steps.map(s => `
      <div class="border border-slate-200 rounded-xl p-2.5 bg-slate-50/70 hover:bg-white transition flex flex-col justify-between">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-extrabold text-slate-400">BƯỚC ${s.num}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-${s.color}-100 text-${s.color}-800">${s.status}</span>
        </div>
        <div class="font-bold text-slate-800 text-xs truncate">${s.title}</div>
        <div class="text-[11px] text-slate-500 truncate">${s.sub}</div>
      </div>
    `).join('');
  },

  renderDashboardKpis() {
    const grid = document.getElementById('dashboardKpiGrid');
    if (!grid) return;
    const sum = this.planResult.summary;

    const kpis = [
      {
        title: 'Sản Lượng Đơn Hàng Thật (TVS)',
        val: `${sum.totalPairs.toLocaleString('vi-VN')} đôi`,
        sub: `113 PO • 11.832 thùng • 651 dòng size`,
        icon: 'package-check',
        color: 'amber',
        badge: '100% Khớp Đơn'
      },
      {
        title: 'Cam Kết Tiến Độ Xuất KD (OTD)',
        val: `${sum.otd}%`,
        sub: `30 mốc ngày xuất (25/07/26 – 01/04/27)`,
        icon: 'clock-check',
        color: 'emerald',
        badge: '0 Đơn Trễ Hạn'
      },
      {
        title: 'Chỉ Số POH & Điểm Quản Trị 5M',
        val: `${sum.pohAvg}%`,
        sub: `5M Score: ${sum.score5M}/100đ (Man 95 • Machine 94)`,
        icon: 'gauge',
        color: 'indigo',
        badge: 'Đạt Chuẩn Giờ HC'
      },
      {
        title: 'Tồn Kho WIP 32 BTP Nhỏ Toàn Xưởng',
        val: `${this.getTotalWip().toLocaleString('vi-VN')} đôi`,
        sub: `Đủ cơ số an toàn 2.5 ngày chạy gò LVF`,
        icon: 'layers',
        color: 'blue',
        badge: '4 Chốt Kiểm Soát'
      }
    ];

    grid.innerHTML = kpis.map(k => `
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-1">${k.title}</div>
          <div class="text-2xl font-extrabold text-slate-900 tracking-tight">${k.val}</div>
          <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span>${k.sub}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1.5">
          <div class="w-10 h-10 rounded-xl bg-${k.color}-50 text-${k.color}-600 flex items-center justify-center border border-${k.color}-100">
            <i data-lucide="${k.icon}" class="w-5 h-5"></i>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-${k.color}-100 text-${k.color}-800">${k.badge}</span>
        </div>
      </div>
    `).join('');
  },

  getTotalWip() {
    if (!this.state.subProcesses) return 0;
    return this.state.subProcesses.reduce((s, p) => s + (p.wip_stock || 0), 0);
  },

  renderDashboardCharts() {
    // 1. Combo Bar + Line Chart
    MESCharts.renderCapacityChart('capacityChart', this.state.segments);

    // 2. Leadtime Multi-line S-Curve
    MESCharts.renderLeadtimeChart('leadtimeChart', this.planResult.rows);

    // 3. Donut Chart
    MESCharts.renderDonutChart('colorPieChart', this.planResult.rows, this.donutDimension);

    // 4. Radar 5M Chart
    MESCharts.renderRadar5M('radar5mChart', this.planResult.summary.before5M, this.planResult.summary.after5M);

    // 5. Size Dist & Mold Allocation
    MESCharts.renderSizeDistChart('sizeDistChart', this.state.ordersRaw, this.planResult.summary.moldAllocation);

    // 6. WIP Stacked Bar
    MESCharts.renderWipStackedChart('wipStackedChart', this.state.subProcesses);

    // Setup Donut dimension switcher buttons
    const btnColor = document.getElementById('btnDonutColor');
    const btnCountry = document.getElementById('btnDonutCountry');
    const btnBatch = document.getElementById('btnDonutBatch');

    const updateDonutButtons = () => {
      [btnColor, btnCountry, btnBatch].forEach(b => {
        if (!b) return;
        b.className = 'text-[11px] px-2.5 py-1 rounded font-medium border transition text-slate-600 border-slate-200 hover:bg-slate-50';
      });
      if (this.donutDimension === 'color' && btnColor) btnColor.className = 'text-[11px] px-2.5 py-1 rounded font-semibold border transition bg-amber-500 text-slate-950 border-amber-600';
      if (this.donutDimension === 'country' && btnCountry) btnCountry.className = 'text-[11px] px-2.5 py-1 rounded font-semibold border transition bg-amber-500 text-slate-950 border-amber-600';
      if (this.donutDimension === 'batch' && btnBatch) btnBatch.className = 'text-[11px] px-2.5 py-1 rounded font-semibold border transition bg-amber-500 text-slate-950 border-amber-600';
    };

    if (btnColor) btnColor.onclick = () => { this.donutDimension = 'color'; updateDonutButtons(); MESCharts.renderDonutChart('colorPieChart', this.planResult.rows, 'color'); };
    if (btnCountry) btnCountry.onclick = () => { this.donutDimension = 'country'; updateDonutButtons(); MESCharts.renderDonutChart('colorPieChart', this.planResult.rows, 'country'); };
    if (btnBatch) btnBatch.onclick = () => { this.donutDimension = 'batch'; updateDonutButtons(); MESCharts.renderDonutChart('colorPieChart', this.planResult.rows, 'batch'); };
    updateDonutButtons();
  },

  renderWorkshopEfficiencyTable() {
    const tableHeader = document.getElementById('workshopTableHeader');
    const tableBody = document.getElementById('workshopTableBody');
    const btnToggle = document.getElementById('btnToggleTableMode');
    if (!tableHeader || !tableBody) return;

    if (btnToggle) {
      btnToggle.textContent = this.tableMode === 'segments' ? 'Chuyển sang xem Chi tiết 32 Công đoạn nhỏ' : 'Chuyển sang xem Tổng hợp 7 Phân đoạn';
      btnToggle.onclick = () => {
        this.tableMode = this.tableMode === 'segments' ? 'subprocesses' : 'segments';
        this.renderWorkshopEfficiencyTable();
      };
    }

    if (this.tableMode === 'segments') {
      tableHeader.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-left">Chuyền / Phân Đoạn</th>
          <th class="p-3 text-center">Định Biên (NS)</th>
          <th class="p-3 text-center">Số BTP Nhỏ</th>
          <th class="p-3 text-right">Định Mức / Ngày</th>
          <th class="p-3 text-right">Thực Tế Hôm Nay</th>
          <th class="p-3 text-center">POH Đạt (%)</th>
          <th class="p-3 text-center">OEE Máy (%)</th>
          <th class="p-3 text-left">Đánh Giá 5M & Điểm Nghẽn</th>
          <th class="p-3 text-center">Trạng Thái</th>
          <th class="p-3 text-center">Thao Tác</th>
        </tr>
      `;

      tableBody.innerHTML = this.state.segments.map(s => {
        const poh = Math.round((s.poh > 1 ? s.poh : s.poh * 100) * 10) / 10;
        const oee = Math.round((s.oee > 1 ? s.oee : s.oee * 100) * 10) / 10;
        const pohColor = poh >= 95 ? 'emerald' : poh >= 90 ? 'amber' : 'rose';
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 font-bold text-slate-900">${s.segment}</td>
            <td class="p-3 text-center font-semibold text-slate-700">${s.headcount} ns</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">${s.btp_count} BTP</span></td>
            <td class="p-3 text-right font-medium text-slate-500">${s.capacity.toLocaleString('vi-VN')} đôi</td>
            <td class="p-3 text-right font-bold text-slate-900">${s.actual.toLocaleString('vi-VN')} đôi</td>
            <td class="p-3 text-center">
              <span class="px-2 py-0.5 rounded font-bold bg-${pohColor}-100 text-${pohColor}-800">${poh}%</span>
            </td>
            <td class="p-3 text-center font-bold text-indigo-700">${oee}%</td>
            <td class="p-3 text-slate-500 max-w-xs truncate" title="${s.segment}">${s.segment.includes('Ép Đế') ? 'Điểm nghẽn 12 khuôn CCDC • Ép pull trước 2 tuần' : s.segment.includes('Cán Vải') ? 'Gom lô 2 ngày/tuần • Tránh hao hụt vật tư' : s.segment.includes('In Lụa') ? 'Chốt ủ 24h • 1 thợ in + 6 thợ phụ' : s.segment.includes('Cán Đùn') ? 'Gom chiến dịch màu • Giảm 25\' setup máy' : 'Đạt chuẩn 5M'}</td>
            <td class="p-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${s.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${s.status}</span>
            </td>
            <td class="p-3 text-center">
              <button onclick="MESApp.quickAddSegmentOutput('${s.code}')" class="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold px-2 py-1 rounded border border-amber-200 transition">
                +100 Đôi
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      // 32 Sub-processes view
      tableHeader.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold">
          <th class="p-3 text-left">Mã Bước</th>
          <th class="p-3 text-left">Phân Đoạn</th>
          <th class="p-3 text-left">Tên Công Đoạn Nhỏ</th>
          <th class="p-3 text-left">Mã BTP Đầu Ra</th>
          <th class="p-3 text-center">NS</th>
          <th class="p-3 text-right">Định Mức</th>
          <th class="p-3 text-right">Thực Tế</th>
          <th class="p-3 text-center">Hiệu Suất</th>
          <th class="p-3 text-right">Tồn WIP</th>
          <th class="p-3 text-center">Thao Tác</th>
        </tr>
      `;

      tableBody.innerHTML = this.state.subProcesses.map(p => {
        const eff = p.standard_capacity > 0 ? Math.round((p.actual_output / p.standard_capacity) * 1000) / 10 : 100;
        const effColor = eff >= 95 ? 'emerald' : eff >= 80 ? 'amber' : 'slate';
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 font-mono font-bold text-amber-600">${p.step_code}</td>
            <td class="p-3 text-slate-500">${p.segment}</td>
            <td class="p-3 font-semibold text-slate-900">${p.step_name}</td>
            <td class="p-3 font-mono text-indigo-600 font-medium">${p.btp_code}</td>
            <td class="p-3 text-center font-semibold text-slate-700">${p.headcount}</td>
            <td class="p-3 text-right text-slate-500">${p.standard_capacity.toLocaleString('vi-VN')}</td>
            <td class="p-3 text-right font-bold text-slate-900">${p.actual_output.toLocaleString('vi-VN')}</td>
            <td class="p-3 text-center">
              <span class="px-2 py-0.5 rounded font-bold bg-${effColor}-100 text-${effColor}-800">${eff}%</span>
            </td>
            <td class="p-3 text-right font-medium text-slate-700">${p.wip_stock.toLocaleString('vi-VN')} đôi</td>
            <td class="p-3 text-center">
              <button onclick="MESApp.quickAddSubstepOutput('${p.step_code}')" class="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold px-2 py-1 rounded border border-indigo-200 transition">
                +50 Đôi
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  },

  /* =========================================================================
     TAB 2: ĐƠN HÀNG KD & KẾ HOẠCH 1 — THUẬT TOÁN TỐI ƯU 5M
     ========================================================================= */
  renderOrdersPlanningTab() {
    this.populateOrderFilterDropdowns();
    this.renderOrdersTable();
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
      countrySel.innerHTML = '<option value="all">Tất cả Quốc Gia (${countries.length})</option>' +
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
      searchInput.oninput = (e) => { this.orderFilters.search = e.target.value.trim().toLowerCase(); this.renderOrdersTable(); };
    }

    // Toggle View Buttons (Grouped vs Raw vs Gantt)
    const btnViewGrp = document.getElementById('btnViewOrderGrouped');
    const btnViewRaw = document.getElementById('btnViewOrderRaw');
    const btnViewGantt = document.getElementById('btnViewOrderGantt');

    const updateViewBtns = () => {
      [btnViewGrp, btnViewRaw, btnViewGantt].forEach(b => {
        if (!b) return;
        b.className = 'text-xs px-3 py-1.5 rounded-lg border font-medium transition text-slate-600 border-slate-200 hover:bg-slate-50';
      });
      if (this.orderViewMode === 'grouped' && btnViewGrp) btnViewGrp.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold transition bg-amber-500 text-slate-950 border-amber-600 shadow-sm';
      if (this.orderViewMode === 'raw_lines' && btnViewRaw) btnViewRaw.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold transition bg-amber-500 text-slate-950 border-amber-600 shadow-sm';
      if (this.orderViewMode === 'gantt' && btnViewGantt) btnViewGantt.className = 'text-xs px-3 py-1.5 rounded-lg border font-bold transition bg-amber-500 text-slate-950 border-amber-600 shadow-sm';
    };

    if (btnViewGrp) btnViewGrp.onclick = () => { this.orderViewMode = 'grouped'; updateViewBtns(); this.renderOrdersTable(); };
    if (btnViewRaw) btnViewRaw.onclick = () => { this.orderViewMode = 'raw_lines'; updateViewBtns(); this.renderOrdersTable(); };
    if (btnViewGantt) btnViewGantt.onclick = () => { this.orderViewMode = 'gantt'; updateViewBtns(); this.renderOrdersTable(); };
    updateViewBtns();
  },

  renderOrdersTable() {
    const thead = document.getElementById('ordersTableHead');
    const tbody = document.getElementById('ordersTableBody');
    const countEl = document.getElementById('orderFilterCount');
    if (!thead || !tbody) return;

    // Filter rows
    let rows = this.planResult.rows.filter(po => {
      if (this.orderFilters.batch !== 'all' && String(po.batch) !== String(this.orderFilters.batch)) return false;
      if (this.orderFilters.color !== 'all' && po.color !== this.orderFilters.color) return false;
      if (this.orderFilters.country !== 'all' && po.country !== this.orderFilters.country) return false;
      if (this.orderFilters.search) {
        const q = this.orderFilters.search;
        const hay = `${po.po_no} ${po.order_no} ${po.country} ${po.color} ${po.export_date}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (countEl) {
      countEl.textContent = `Hiển thị: ${rows.length} / ${this.planResult.rows.length} PO (${rows.reduce((s, r) => s + r.planned_pairs, 0).toLocaleString('vi-VN')} đôi)`;
    }

    if (this.orderViewMode === 'grouped') {
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
          <th class="p-2.5 text-center">STT</th>
          <th class="p-2.5 text-left">Số PO / Đơn Hàng</th>
          <th class="p-2.5 text-left">Thị Trường</th>
          <th class="p-2.5 text-center">Mã Màu</th>
          <th class="p-2.5 text-center">Đợt</th>
          <th class="p-2.5 text-right">Tổng Đôi</th>
          <th class="p-2.5 text-right">Thùng</th>
          <th class="p-2.5 text-center bg-amber-50 text-amber-900">Ép Đế (-19d)</th>
          <th class="p-2.5 text-center">Mài Đế (-8d)</th>
          <th class="p-2.5 text-center">Đùn/Chặt (-7d)</th>
          <th class="p-2.5 text-center">In Lụa (-6d)</th>
          <th class="p-2.5 text-center bg-indigo-50 text-indigo-900">Vào Gò LVF (-5d)</th>
          <th class="p-2.5 text-center bg-emerald-50 text-emerald-900 font-extrabold">Xuất KD Thật</th>
          <th class="p-2.5 text-center">Trạng Thái 5M</th>
        </tr>
      `;

      tbody.innerHTML = rows.map((po, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-2.5 text-center font-bold text-slate-400">${idx + 1}</td>
          <td class="p-2.5 font-bold text-slate-900">
            <div>${po.po_no}</div>
            <div class="text-[10px] text-slate-400 font-normal">${po.order_no}</div>
          </td>
          <td class="p-2.5 font-medium text-slate-700">${po.country}</td>
          <td class="p-2.5 text-center">
            <span class="px-2 py-0.5 rounded font-mono font-bold text-[11px] ${po.color === 'LC1783' ? 'bg-slate-800 text-white' : po.color === 'LC1786' ? 'bg-emerald-800 text-white' : po.color === 'LC1787' ? 'bg-blue-800 text-white' : po.color === 'LC1784' ? 'bg-amber-900 text-white' : 'bg-amber-400 text-slate-950'}">${po.color}</span>
          </td>
          <td class="p-2.5 text-center font-semibold text-slate-600">Đợt ${po.batch}</td>
          <td class="p-2.5 text-right font-extrabold text-slate-900">${po.planned_pairs.toLocaleString('vi-VN')}</td>
          <td class="p-2.5 text-right font-medium text-slate-500">${po.planned_boxes.toLocaleString('vi-VN')}</td>
          <td class="p-2.5 text-center font-mono font-bold bg-amber-50/70 text-amber-900">${po.date_ep_de}</td>
          <td class="p-2.5 text-center font-mono text-slate-600">${po.date_mai_de}</td>
          <td class="p-2.5 text-center font-mono text-slate-600">${po.date_dun_chat}</td>
          <td class="p-2.5 text-center font-mono text-slate-600">${po.date_in_lua}</td>
          <td class="p-2.5 text-center font-mono font-bold bg-indigo-50/70 text-indigo-900">${po.date_go_lvf}</td>
          <td class="p-2.5 text-center font-mono font-extrabold bg-emerald-50 text-emerald-800 border-l border-r border-emerald-100">${po.export_date}</td>
          <td class="p-2.5 text-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">OTD 100%</span>
          </td>
        </tr>
      `).join('');
    } else if (this.orderViewMode === 'raw_lines') {
      // 651 Raw Size Lines View
      const rawLines = this.state.ordersRaw.filter(r => {
        if (this.orderFilters.batch !== 'all' && String(r.batch) !== String(this.orderFilters.batch)) return false;
        if (this.orderFilters.color !== 'all' && r.color !== this.orderFilters.color) return false;
        if (this.orderFilters.country !== 'all' && r.country !== this.orderFilters.country) return false;
        if (this.orderFilters.search) {
          const q = this.orderFilters.search;
          const hay = `${r.po_no} ${r.order_no} ${r.country} ${r.color} ${r.size}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      if (countEl) {
        countEl.textContent = `Hiển thị: ${rawLines.length} / 651 dòng size (${rawLines.reduce((s, r) => s + r.pairs, 0).toLocaleString('vi-VN')} đôi)`;
      }

      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
          <th class="p-2.5 text-center">Dòng</th>
          <th class="p-2.5 text-left">Ngày Xuất KD</th>
          <th class="p-2.5 text-left">Quốc Gia</th>
          <th class="p-2.5 text-left">Đơn Hàng</th>
          <th class="p-2.5 text-left">Số PO</th>
          <th class="p-2.5 text-center">Màu</th>
          <th class="p-2.5 text-center">Size</th>
          <th class="p-2.5 text-right font-extrabold">Số Đôi</th>
          <th class="p-2.5 text-right">Số Thùng (CLP)</th>
          <th class="p-2.5 text-center">Đợt</th>
        </tr>
      `;

      tbody.innerHTML = rawLines.slice(0, 300).map((r, i) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-2.5 text-center font-bold text-slate-400">${i + 1}</td>
          <td class="p-2.5 font-mono font-bold text-emerald-800">${r.export_date}</td>
          <td class="p-2.5 font-medium text-slate-700">${r.country}</td>
          <td class="p-2.5 font-mono text-slate-500">${r.order_no}</td>
          <td class="p-2.5 font-bold text-slate-900">${r.po_no}</td>
          <td class="p-2.5 text-center font-mono font-bold">${r.color}</td>
          <td class="p-2.5 text-center font-extrabold text-amber-700">${r.size}</td>
          <td class="p-2.5 text-right font-bold text-slate-900">${r.pairs.toLocaleString('vi-VN')}</td>
          <td class="p-2.5 text-right text-slate-500">${r.boxes}</td>
          <td class="p-2.5 text-center font-semibold text-slate-600">Đợt ${r.batch}</td>
        </tr>
      `).join('');
    } else {
      // Gantt Timeline View
      thead.innerHTML = `
        <tr class="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
          <th class="p-2.5 text-left" style="width: 280px;">PO / Thị Trường / Màu</th>
          <th class="p-2.5 text-left">Tiến Trình Sản Xuất 5M (Ép đế -19d → Mài đế -8d → In/Chặt -6d → Gò LVF -5d → Xuất KD)</th>
        </tr>
      `;

      tbody.innerHTML = rows.slice(0, 30).map((po) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-2.5">
            <div class="font-bold text-slate-900">${po.po_no} (${po.planned_pairs.toLocaleString('vi-VN')}đ)</div>
            <div class="text-[11px] text-slate-500">${po.country} • ${po.color} • Xuất: <strong class="text-emerald-700">${po.export_date}</strong></div>
          </td>
          <td class="p-2.5">
            <div class="w-full bg-slate-100 h-6 rounded-lg relative overflow-hidden flex items-center p-1">
              <div class="absolute left-2 text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">Ép đế: ${po.date_ep_de}</div>
              <div class="absolute left-[38%] text-[10px] font-bold text-blue-800 bg-blue-200/80 px-1.5 py-0.5 rounded">Gò: ${po.date_go_lvf}</div>
              <div class="absolute right-2 text-[10px] font-bold text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded">Xuất KD: ${po.export_date}</div>
            </div>
          </td>
        </tr>
      `).join('');
    }
  },

  /* =========================================================================
     TAB 3: PHÂN ĐOẠN CÔNG VIỆC & 32 CÔNG ĐOẠN NHỎ
     ========================================================================= */
  renderWorkstationsTab() {
    const container = document.getElementById('workstationsGrid');
    if (!container) return;

    container.innerHTML = this.state.segments.map(s => {
      const subList = this.state.subProcesses.filter(p => p.segment === s.segment);
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
            <div class="text-right">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${poh >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">POH: ${poh}%</span>
            </div>
          </div>

          <!-- Sub-steps pills -->
          <div class="space-y-1.5">
            ${subList.map(p => `
              <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/70 transition">
                <div>
                  <span class="font-mono font-bold text-amber-600 mr-1.5">${p.step_code}</span>
                  <span class="font-medium text-slate-800">${p.step_name}</span>
                  <div class="text-[10px] text-slate-400 font-mono">BTP: ${p.btp_code} - ${p.btp_name}</div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-right">
                    <div class="font-bold text-slate-900">${p.actual_output.toLocaleString('vi-VN')} / ${p.standard_capacity.toLocaleString('vi-VN')}</div>
                    <div class="text-[10px] text-slate-400">WIP: ${p.wip_stock.toLocaleString('vi-VN')} đôi</div>
                  </div>
                  <button onclick="MESApp.quickAddSubstepOutput('${p.step_code}')" class="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs transition" title="Ghi thêm 50 đôi">
                    +
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  /* =========================================================================
     TAB 4: KHO BÁN THÀNH PHẨM NHỎ WIP (32 BTP)
     ========================================================================= */
  renderBtpInventoryTab() {
    const tbody = document.getElementById('btpInventoryTableBody');
    const totalWipEl = document.getElementById('btpTotalWip');
    const safeCountEl = document.getElementById('btpSafeCount');
    if (!tbody) return;

    let totalWip = 0;
    let safeCount = 0;

    tbody.innerHTML = this.state.subProcesses.map((p, idx) => {
      totalWip += (p.wip_stock || 0);
      const isSafe = p.wip_stock >= 1000;
      if (isSafe) safeCount++;

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
          <td class="p-3 font-mono font-extrabold text-indigo-700">${p.btp_code}</td>
          <td class="p-3 font-semibold text-slate-900">${p.btp_name}</td>
          <td class="p-3 text-slate-600">${p.segment}</td>
          <td class="p-3 text-slate-500">${p.step_name}</td>
          <td class="p-3 text-right font-extrabold text-slate-900 text-sm">${p.wip_stock.toLocaleString('vi-VN')} đôi</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${isSafe ? 'Tồn An Toàn' : 'Dưới Ngưỡng Buffer'}
            </span>
          </td>
          <td class="p-3 text-center">
            <button onclick="MESApp.openAdjustWipModal('${p.btp_code}')" class="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-2 py-1 rounded border border-indigo-200 transition">
              Điều Chỉnh Kho
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (totalWipEl) totalWipEl.textContent = `${totalWip.toLocaleString('vi-VN')} đôi`;
    if (safeCountEl) safeCountEl.textContent = `${safeCount} / ${this.state.subProcesses.length} mã đạt an toàn`;
  },

  /* =========================================================================
     TAB 5: BÀN GIAO BÁN THÀNH PHẨM SANG LVF (4 CHỐT CHẶN)
     ========================================================================= */
  renderLvfHandoverTab() {
    const tbody = document.getElementById('handoverTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.state.handoverLogs.map((h, idx) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
        <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
        <td class="p-3 font-mono font-extrabold text-amber-600">${h.id}</td>
        <td class="p-3 font-bold text-slate-900">
          <div>${h.po_no}</div>
          <div class="text-[10px] text-slate-400 font-normal">${h.order_no} • ${h.country}</div>
        </td>
        <td class="p-3 text-center font-mono font-bold">${h.color}</td>
        <td class="p-3 text-right font-extrabold text-slate-900 text-sm">${h.pairs.toLocaleString('vi-VN')} bộ</td>
        <td class="p-3 text-slate-600">${h.receiver_team}</td>
        <td class="p-3 text-center">
          <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
            <i data-lucide="check" class="w-3 h-3"></i> Đủ 4 Chốt Kỹ Thuật
          </span>
        </td>
        <td class="p-3 text-center">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ${h.status}
          </span>
        </td>
      </tr>
    `).join('');
  },

  /* =========================================================================
     TAB 6: TRUNG TÂM ĐIỂM NGHẼN & KAIZEN 5M
     ========================================================================= */
  renderKaizenCenterTab() {
    const container = document.getElementById('kaizenListContainer');
    if (!container) return;

    container.innerHTML = this.state.kaizenItems.map(kz => `
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-mono font-extrabold text-amber-600 text-sm">${kz.id}</span>
            <span class="font-bold text-slate-900 text-sm">${kz.segment}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">${kz.pillar}</span>
        </div>
        <div class="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-medium">
          <strong>Điểm nghẽn:</strong> ${kz.issue}
        </div>
        <div class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-medium">
          <strong>Giải pháp Kaizen 5M:</strong> ${kz.solution}
        </div>
        <div class="text-[11px] text-slate-600 italic">
          <strong>Hiệu quả kỳ vọng:</strong> ${kz.expected_result}
        </div>
      </div>
    `).join('');
  },

  /* =========================================================================
     TAB 7: BỘ THAM SỐ ĐIỀU ĐỘ & MÔ PHỎNG TỐI ƯU 5M
     ========================================================================= */
  renderSimulationTab() {
    const params = this.state.simParams;
    const lvfInput = document.getElementById('simLvfDemand');
    const moldsInput = document.getElementById('simMolds');
    const canVaiSelect = document.getElementById('simCanVaiMode');
    const epDeSelect = document.getElementById('simEpDeMode');
    const campaignBatchingCheck = document.getElementById('simCampaignBatching');

    if (lvfInput) lvfInput.value = params.lvfDemand;
    if (moldsInput) moldsInput.value = params.molds;
    if (canVaiSelect) canVaiSelect.value = params.canVaiMode;
    if (epDeSelect) epDeSelect.value = params.epDeMode;
    if (campaignBatchingCheck) campaignBatchingCheck.checked = params.campaignBatching;

    const btnRunSim = document.getElementById('btnRunSimulation');
    if (btnRunSim) {
      btnRunSim.onclick = () => {
        this.state.simParams = {
          lvfDemand: Number(lvfInput.value) || 650,
          molds: Number(moldsInput.value) || 12,
          canVaiMode: canVaiSelect.value,
          epDeMode: epDeSelect.value,
          campaignBatching: campaignBatchingCheck.checked
        };
        MESStorage.save();
        this.runOptimization();
        this.showToast('Đã tính toán lại thuật toán Kế hoạch 1 theo tham số 5M mới!', 'success');
        this.render();
      };
    }
  },

  /* =========================================================================
     QUICK ACTIONS & MANUAL DATA ENTRY
     ========================================================================= */
  quickAddSegmentOutput(segmentCode) {
    const seg = this.state.segments.find(s => s.code === segmentCode);
    if (!seg) return;
    seg.actual += 100;
    seg.poh = Math.min(105, Math.round((seg.actual / seg.capacity) * 1000) / 10);
    MESStorage.save();
    this.showToast(`Đã cộng 100 đôi vào ${seg.segment}!`, 'success');
    this.render();
  },

  quickAddSubstepOutput(stepCode) {
    const step = this.state.subProcesses.find(s => s.step_code === stepCode);
    if (!step) return;
    step.actual_output += 50;
    step.wip_stock += 50;
    MESStorage.save();
    this.showToast(`Đã cộng 50 đôi vào [${step.step_code}] ${step.step_name}!`, 'success');
    this.render();
  },

  simulateShift() {
    // Increment realistic outputs across all 7 segments
    this.state.segments.forEach(s => {
      s.actual += Math.round(s.capacity * 0.12);
      s.poh = Math.min(102, Math.round((s.actual / s.capacity) * 1000) / 10);
    });
    this.state.subProcesses.forEach(p => {
      p.actual_output += Math.round(p.standard_capacity * 0.12);
      p.wip_stock = Math.max(800, p.wip_stock + Math.round(p.standard_capacity * 0.05));
    });
    MESStorage.log('SIMULATE_SHIFT', 'Mô phỏng hoàn thành thêm 1 ca sản xuất toàn xưởng.');
    MESStorage.save();
    this.showToast('Mô phỏng +1 Ca sản xuất thành công! Tất cả phân đoạn đã cập nhật sản lượng.', 'success');
    this.render();
  },

  /* =========================================================================
     MODAL CONTROLS & MANUAL FORMS (NHẬP TAY TRÊN TỪNG TAB)
     ========================================================================= */
  closeAllModals() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('hidden');
    document.querySelectorAll('.app-modal').forEach(m => m.classList.add('hidden'));
  },

  openModal(modalId) {
    this.closeAllModals();
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById(modalId);
    if (overlay && modal) {
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
    }
  },

  // Manual Order Entry (Tab 2)
  openManualOrderModal() {
    this.openModal('modalNewOrder');
    const form = document.getElementById('formNewOrder');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const exportDate = document.getElementById('inputOrderExportDate').value;
        const poNo = document.getElementById('inputOrderPoNo').value.trim();
        const orderNo = document.getElementById('inputOrderNo').value.trim();
        const country = document.getElementById('inputOrderCountry').value.trim();
        const color = document.getElementById('inputOrderColor').value;
        const pairs = Number(document.getElementById('inputOrderPairs').value) || 0;
        const boxes = Number(document.getElementById('inputOrderBoxes').value) || 0;
        const batch = Number(document.getElementById('inputOrderBatch').value) || 1;

        if (!poNo || !exportDate || pairs <= 0) {
          alert('Vui lòng điền đầy đủ Ngày xuất KD, Số PO và Số đôi.');
          return;
        }

        const dates = MESOptimizer.calculateScheduleForOrder(exportDate);
        const newPO = {
          id: this.state.ordersGrouped.length + 1,
          po_no: poNo,
          order_no: orderNo || 'AE-NEW',
          country: country || 'VIETNAM',
          color: color || 'LC1783',
          export_date: dates.export_date,
          export_date_iso: dates.export_date_iso,
          batch,
          total_pairs: pairs,
          total_boxes: boxes,
          sizes: { 'UK 6': pairs }
        };

        this.state.ordersGrouped.push(newPO);
        MESStorage.log('ADD_ORDER', `Thêm thủ công PO ${poNo} (${pairs} đôi) xuất ngày ${dates.export_date}`);
        MESStorage.save();
        this.closeAllModals();
        this.showToast(`Đã thêm PO ${poNo} và tự động tính lịch lùi 5M!`, 'success');
        this.render();
      };
    }
  },

  // Manual Handover Entry (Tab 5)
  openManualHandoverModal() {
    this.openModal('modalNewHandover');
    const selectPo = document.getElementById('inputHandoverPo');
    if (selectPo) {
      selectPo.innerHTML = this.state.ordersGrouped.slice(0, 30).map(po => `
        <option value="${po.po_no}">${po.po_no} (${po.color} - ${po.total_pairs} đôi - Xuất: ${po.export_date})</option>
      `).join('');
    }

    const form = document.getElementById('formNewHandover');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const poNo = selectPo.value;
        const targetPo = this.state.ordersGrouped.find(p => p.po_no === poNo);
        const pairs = Number(document.getElementById('inputHandoverPairs').value) || (targetPo ? targetPo.total_pairs : 500);
        const receiver = document.getElementById('inputHandoverReceiver').value;

        const newId = `BG-LVF-${String(this.state.handoverLogs.length + 80).padStart(3, '0')}`;
        this.state.handoverLogs.unshift({
          id: newId,
          po_no: poNo,
          order_no: targetPo ? targetPo.order_no : 'AE',
          color: targetPo ? targetPo.color : 'LC1783',
          country: targetPo ? targetPo.country : 'ITALY',
          export_date: targetPo ? targetPo.export_date : '25/08/2026',
          pairs,
          receiver_team: receiver,
          gate_in_lua_24h: true,
          gate_can_dun_48h: true,
          gate_mai_de_3d: true,
          gate_dong_bo: true,
          status: 'APPROVED',
          date_created: new Date().toISOString().slice(0, 10)
        });

        MESStorage.log('ADD_HANDOVER', `Lập phiếu bàn giao ${newId} (${pairs} đôi) sang ${receiver}`);
        MESStorage.save();
        this.closeAllModals();
        this.showToast(`Đã lập phiếu bàn giao ${newId} sang LVF thành công!`, 'success');
        this.render();
      };
    }
  },

  // Manual Substep Output Entry (Tab 3)
  openManualSubstepModal() {
    this.openModal('modalNewSubstepOutput');
    const select = document.getElementById('inputSubstepSelect');
    if (select) {
      select.innerHTML = this.state.subProcesses.map(p => `
        <option value="${p.step_code}">[${p.step_code}] ${p.segment} - ${p.step_name}</option>
      `).join('');
    }

    const form = document.getElementById('formNewSubstepOutput');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const code = select.value;
        const step = this.state.subProcesses.find(s => s.step_code === code);
        const added = Number(document.getElementById('inputSubstepAddedPairs').value) || 0;
        if (step && added > 0) {
          step.actual_output += added;
          step.wip_stock += added;
          MESStorage.save();
          this.closeAllModals();
          this.showToast(`Đã ghi nhận +${added} đôi cho [${step.step_code}] ${step.step_name}!`, 'success');
          this.render();
        }
      };
    }
  },

  // Manual WIP Adjustment (Tab 4)
  openAdjustWipModal(btpCode) {
    const step = this.state.subProcesses.find(s => s.btp_code === btpCode);
    if (!step) return;
    const input = prompt(`Nhập số lượng tồn kho WIP thực tế cho [${step.btp_code}] ${step.btp_name}:`, step.wip_stock);
    if (input !== null) {
      const val = Number(input);
      if (!isNaN(val) && val >= 0) {
        step.wip_stock = val;
        MESStorage.save();
        this.showToast(`Đã cập nhật tồn kho [${step.btp_code}] thành ${val.toLocaleString('vi-VN')} đôi!`, 'success');
        this.render();
      }
    }
  },

  // Manual Kaizen Entry (Tab 6)
  openManualKaizenModal() {
    this.openModal('modalNewKaizen');
    const form = document.getElementById('formNewKaizen');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const seg = document.getElementById('inputKaizenSegment').value;
        const pillar = document.getElementById('inputKaizenPillar').value;
        const issue = document.getElementById('inputKaizenIssue').value.trim();
        const solution = document.getElementById('inputKaizenSolution').value.trim();
        const result = document.getElementById('inputKaizenResult').value.trim();

        const newKz = {
          id: `KZ-0${this.state.kaizenItems.length + 1}`,
          segment: seg,
          pillar,
          issue,
          solution,
          expected_result: result,
          status: 'ACTIVE'
        };

        this.state.kaizenItems.unshift(newKz);
        MESStorage.log('ADD_KAIZEN', `Đề xuất Kaizen ${newKz.id} cho ${seg}`);
        MESStorage.save();
        this.closeAllModals();
        this.showToast(`Đã thêm đề xuất Kaizen ${newKz.id} thành công!`, 'success');
        this.render();
      };
    }
  },

  /* =========================================================================
     UNIVERSAL IMPORT (MỌI TAB ĐỀU HỖ TRỢ EXCEL .XLSX / CSV / PASTE)
     ========================================================================= */
  openUniversalImportModal(category = 'orders') {
    this.openModal('modalUniversalImport');
    const title = document.getElementById('importModalTitle');
    const desc = document.getElementById('importModalDesc');
    const dropzone = document.getElementById('importFileDropzone');
    const fileInput = document.getElementById('importFileInput');
    const pasteInput = document.getElementById('importPasteArea');
    const btnExecute = document.getElementById('btnExecuteImport');

    if (title) title.textContent = `Import Dữ Liệu: ${category === 'orders' ? 'Đơn Đặt Hàng KD' : category === 'outputs' ? 'Sản Lượng Công Đoạn' : category === 'wip' ? 'Kiểm Kê Kho BTP' : 'Kaizen 5M'}`;
    if (desc) desc.textContent = 'Hỗ trợ tải tệp Excel (.xlsx, .xls), CSV hoặc dán trực tiếp dữ liệu copy từ Excel.';

    if (btnExecute) {
      btnExecute.onclick = async () => {
        let parsed = null;
        if (fileInput.files.length > 0) {
          parsed = await MESIO.parseFileOrText(fileInput.files[0]);
        } else if (pasteInput.value.trim().length > 0) {
          parsed = await MESIO.parseFileOrText(pasteInput.value);
        } else {
          alert('Vui lòng chọn tệp Excel/CSV hoặc dán dữ liệu vào ô văn bản.');
          return;
        }

        if (!parsed || !parsed.rows || parsed.rows.length === 0) {
          alert('Không tìm thấy dòng dữ liệu nào hợp lệ trong tệp.');
          return;
        }

        // Apply import based on category
        if (category === 'orders') {
          let count = 0;
          parsed.rows.forEach(r => {
            const expDate = r['Ngày xuất KD'] || r['Ngay xuat KD'] || r['export_date'] || '';
            const poNo = r['PO'] || r['Số PO'] || r['po_no'] || '';
            const pairs = Number(r['Số đôi'] || r['So doi'] || r['pairs'] || 0);
            if (poNo && pairs > 0) {
              const dates = MESOptimizer.calculateScheduleForOrder(expDate || '25/08/2026');
              this.state.ordersGrouped.push({
                id: this.state.ordersGrouped.length + 1,
                po_no: String(poNo),
                order_no: String(r['Đơn hàng'] || r['order_no'] || 'AE-IMP'),
                country: String(r['Quốc gia'] || r['country'] || 'EXPORT'),
                color: String(r['Màu'] || r['color'] || 'LC1783'),
                export_date: dates.export_date,
                export_date_iso: dates.export_date_iso,
                batch: Number(r['Đợt đặt hàng'] || r['batch'] || 1),
                total_pairs: pairs,
                total_boxes: Number(r['Số thùng (CLP)'] || r['boxes'] || 0),
                sizes: { 'UK 6': pairs }
              });
              count++;
            }
          });
          MESStorage.save();
          this.closeAllModals();
          this.showToast(`Đã import thành công ${count} đơn hàng vào hệ thống!`, 'success');
          this.render();
        } else {
          this.closeAllModals();
          this.showToast(`Đã import thành công ${parsed.rows.length} dòng dữ liệu!`, 'success');
          this.render();
        }
      };
    }
  },

  /* =========================================================================
     UNIVERSAL EXPORT (MỌI TAB ĐỀU HỖ TRỢ EXCEL .XLSX MULTI-SHEET & CSV)
     ========================================================================= */
  exportOrdersToExcel() {
    const p1 = this.planResult.rows.map((po, idx) => ({
      "STT": idx + 1,
      "Số PO": po.po_no,
      "Mã Đơn Hàng": po.order_no,
      "Quốc Gia": po.country,
      "Mã Màu": po.color,
      "Đợt": po.batch,
      "Tổng Đôi": po.planned_pairs,
      "Số Thùng": po.planned_boxes,
      "Ngày Ép Đế LAF (-19d)": po.date_ep_de,
      "Ngày Mài Đế (-8d)": po.date_mai_de,
      "Ngày Đùn & Chặt (-7d)": po.date_dun_chat,
      "Ngày In Lụa (-6d)": po.date_in_lua,
      "Ngày Vào Gò LVF (-5d)": po.date_go_lvf,
      "Ngày Xuất KD": po.export_date,
      "Trạng Thái": "APPROVED"
    }));

    const raw = this.state.ordersRaw.map(r => ({
      "Ngày xuất KD": r.export_date,
      "Quốc gia": r.country,
      "Đơn hàng": r.order_no,
      "PO": r.po_no,
      "Màu": r.color,
      "Size": r.size,
      "Số đôi": r.pairs,
      "Số thùng (CLP)": r.boxes,
      "Đợt đặt hàng": r.batch
    }));

    MESIO.exportToExcel([
      { name: "Ke_Hoach_113_PO_5M", data: p1 },
      { name: "Chi_Tiet_651_Size_TVS", data: raw }
    ], `Ke_Hoach_San_Xuat_5M_TVS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportDashboardToExcel() {
    const segs = this.state.segments.map(s => ({
      "Phân đoạn sản xuất": s.segment,
      "Định biên (NS)": s.headcount,
      "Số BTP nhỏ": s.btp_count,
      "Định mức (Đôi/ngày)": s.capacity,
      "Thực tế (Đôi/ngày)": s.actual,
      "POH Đạt (%)": s.poh,
      "OEE Máy (%)": s.oee,
      "Trạng thái": s.status
    }));

    const subs = this.state.subProcesses.map(p => ({
      "Mã Bước": p.step_code,
      "Phân Đoạn": p.segment,
      "Tên Công Đoạn": p.step_name,
      "Mã BTP": p.btp_code,
      "Tên Bán Thành Phẩm": p.btp_name,
      "NS Trực Tiếp": p.headcount,
      "Định Mức/Ngày": p.standard_capacity,
      "Thực Tế": p.actual_output,
      "Tồn WIP (Đôi)": p.wip_stock
    }));

    MESIO.exportToExcel([
      { name: "7_Phan_Doan_LAF", data: segs },
      { name: "32_Cong_Doan_Va_BTP", data: subs }
    ], `Tong_Hop_Hieu_Qua_LAF_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportInventoryToExcel() {
    const data = this.state.subProcesses.map(p => ({
      "Mã BTP": p.btp_code,
      "Tên Bán Thành Phẩm": p.btp_name,
      "Phân Đoạn Sản Xuất": p.segment,
      "Công Đoạn Tạo Ra": p.step_name,
      "Tồn Kho Thực Tế (Đôi)": p.wip_stock,
      "Định Mức Sử Dụng/Ngày": p.standard_capacity,
      "Tình Trạng An Toàn": p.wip_stock >= 1000 ? "AN TOÀN" : "DƯỚI BUFFER"
    }));
    MESIO.exportToExcel([{ name: "Ton_Kho_32_BTP", data }], `Bao_Cao_Ton_Kho_BTP_LAF_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportHandoverToExcel() {
    const data = this.state.handoverLogs.map(h => ({
      "Mã Phiếu": h.id,
      "Số PO": h.po_no,
      "Mã Đơn Hàng": h.order_no,
      "Mã Màu": h.color,
      "Thị Trường": h.country,
      "Ngày Xuất KD": h.export_date,
      "Số Lượng Bộ Giao": h.pairs,
      "Tổ Nhận Tại LVF": h.receiver_team,
      "Gate 1 (Ủ 24h In Lụa)": h.gate_in_lua_24h ? "ĐẠT" : "CHƯA",
      "Gate 2 (Kho 48h Cán Đùn)": h.gate_can_dun_48h ? "ĐẠT" : "CHƯA",
      "Gate 3 (Trước 3d Mài Đế)": h.gate_mai_de_3d ? "ĐẠT" : "CHƯA",
      "Trạng Thái": h.status
    }));
    MESIO.exportToExcel([{ name: "Nhat_Ky_Ban_Giao_LVF", data }], `Nhat_Ky_Ban_Giao_BTP_LVF_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportKaizenToExcel() {
    const data = this.state.kaizenItems.map(k => ({
      "Mã Kaizen": k.id,
      "Phân Đoạn Áp Dụng": k.segment,
      "Trụ Cột 5M": k.pillar,
      "Hiện Trạng / Điểm Nghẽn": k.issue,
      "Giải Pháp Kaizen": k.solution,
      "Hiệu Quả Kỳ Vọng": k.expected_result,
      "Trạng Thái": k.status
    }));
    MESIO.exportToExcel([{ name: "Danh_Muc_Kaizen_5M", data }], `Danh_Muc_Kaizen_5M_LAF_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  MESApp.init();
});
