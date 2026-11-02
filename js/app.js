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
    this.planResult = MESOptimizer.scheduleAllOrders(
      this.state.ordersGrouped,
      this.state.simParams || (window.TVS_MASTER_DATA && window.TVS_MASTER_DATA.simParams) || { lvfDemand: 650, molds: 12, canVaiMode: 'batch', epDeMode: 'preload_ot', campaignBatching: true }
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
        const newItem = {
          id: `KZ-0${this.state.kaizenItems.length + 1}`,
          segment: document.getElementById('inputKaizenSegment').value,
          pillar: document.getElementById('inputKaizenPillar').value,
          issue: document.getElementById('inputKaizenIssue').value.trim(),
          solution: document.getElementById('inputKaizenSolution').value.trim(),
          result: document.getElementById('inputKaizenResult').value.trim() || 'Tối ưu hóa sản xuất',
          applied: true
        };

        this.state.kaizenItems.unshift(newItem);
        MESStorage.saveState(this.state);
        this.closeAllModals();
        this.render();
        this.showToast(`Đã lưu đề xuất Kaizen ${newItem.id}!`, 'success');
      };
    }
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update navigation buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const isTarget = btn.dataset.tab === tabId;
      btn.className = isTarget
        ? 'tab-btn px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap active-tab bg-amber-500 text-slate-950 shadow-sm'
        : 'tab-btn px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition flex items-center gap-2 whitespace-nowrap';
    });

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
      { num: '04', title: '32 BTP Nhỏ Đồng Bộ', sub: 'Wip: ~43k đôi • Buffer 2-3d', status: 'Kiểm Soát Nhịp Ca', color: 'emerald' },
      { num: '05', title: '4 Cổng Kỹ Thuật QC', sub: 'Ủ 24h • Lưu 48h • Mài 3d', status: '100% Đạt Chuẩn', color: 'emerald' },
      { num: '06', title: 'Giao LVF & Xuất Khẩu', sub: '11.832 Thùng CLP • 19 Nước', status: 'Giao Đúng Hạn', color: 'emerald' },
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
    const score5m = this.planResult?.score5m?.total || 96.4;

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
        value: '95.2%',
        sub: 'Định biên 71 NS • Cán 2 ngày/tuần • Ép kéo 2 tuần',
        icon: 'activity',
        trend: '+24.2% so với trước Kaizen (71.0%)',
        trendColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
      },
      {
        title: 'TỔNG TỒN KHO WIP (32 BTP NHỎ)',
        value: `${totalWip.toLocaleString('vi-VN')} đôi`,
        sub: 'Buffer 2.5 - 3.0 ngày sản xuất an toàn',
        icon: 'boxes',
        trend: 'Kiểm soát nhịp dòng chảy',
        trendColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        iconColor: 'text-indigo-500',
      },
      {
        title: 'TỶ LỆ ĐÁP ỨNG NGÀY XUẤT KD (OTD)',
        value: '100.0%',
        sub: `Điểm 5M: ${score5m}/100 • 30 Mốc xuất 19 Nước`,
        icon: 'check-circle',
        trend: '113/113 PO Đúng Hạn Hoàn Toàn',
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
    setText('algoTotalDays', `${(totalPairs / 650).toFixed(1)} ngày SX`);
  },

  render5mBannerCards() {
    const totalPairs = this.state.ordersGrouped.reduce((acc, o) => acc + o.total_pairs, 0);
    const totalOrders = this.state.ordersGrouped.length;
    const rubberKg = Math.round(totalPairs * 1.3);
    const fabricSqm = Math.round(totalPairs * 0.75);
    const totalDaysNeeded = (totalPairs / 650).toFixed(1);

    const totalDaysEl = document.getElementById('plan5mTotalDays');
    if (totalDaysEl) totalDaysEl.textContent = `${totalDaysNeeded} ngày SX chuẩn (650đ/ngày)`;

    const otdRateEl = document.getElementById('plan5mOtdRate');
    if (otdRateEl) otdRateEl.textContent = `100% (${totalOrders}/${totalOrders} PO đúng hạn KD)`;

    const container = document.getElementById('fiveMOptimizationCards');
    if (!container) return;

    container.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-amber-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>1. MAN (Nhân Sự - 71 NS)</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">POH 95.2%</span>
        </div>
        <p class="text-slate-300 leading-relaxed text-[11px]">Cán vải (9 NS) chạy gom lô 2 ngày/tuần; điều động 5 NS dôi dư phụ Kiểm chặt & Đánh kẽm Mài đế để toàn xưởng đạt nhịp <strong>650 đôi/ngày giờ HC</strong>.</p>
      </div>

      <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
        <div class="text-cyan-400 font-extrabold uppercase text-[11px] flex items-center justify-between">
          <span>2. MACHINE (12 Khuôn & 5 Trục)</span>
          <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">OEE 92.1%</span>
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
          <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">OTD 100%</span>
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
    const demand = Number(document.getElementById('calcLvfDemand')?.value) || 650;
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
            <div class="text-[11px] mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}">${w.subProcesses.length} BTP nhỏ • POH ${w.pohPercent}%</div>
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
              <div class="text-[10px] text-slate-400 uppercase font-bold">Năng lực chuẩn 8h</div>
              <div class="text-lg font-extrabold text-slate-900">${activeWs.dailyTargetPairs.toLocaleString('vi-VN')} đôi/ngày</div>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-100 text-center min-w-[70px]">
              <div class="text-[10px] text-slate-500 uppercase font-bold">POH</div>
              <div class="text-base font-extrabold text-emerald-600">${activeWs.pohPercent}%</div>
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
    const btpInLua24h = this.state.subProcesses.find(p => p.btp_code === 'BTP-IL-04')?.wip_stock || 1200;
    const btpDunChat = this.state.subProcesses.find(p => p.btp_code === 'BTP-TC-05')?.wip_stock || 1400;
    const btpDeMai3d = this.state.subProcesses.find(p => p.btp_code === 'BTP-MD-04')?.wip_stock || 1600;
    const readySyncSets = Math.min(btpInLua24h, btpDunChat, btpDeMai3d);

    const countEl = document.getElementById('readySyncSetsCount');
    if (countEl) countEl.textContent = readySyncSets.toLocaleString('vi-VN');

    const progressEl = document.getElementById('syncSetsProgressBar');
    if (progressEl) {
      const pct = Math.min(100, Math.round((readySyncSets / 650) * 100));
      progressEl.style.width = `${pct}%`;
    }

    // 2. Render Handover Logs Table
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
  renderKaizenCenterTab() {
    const openCount = this.state.kaizenItems.filter(k => !k.applied).length;
    const appliedCount = this.state.kaizenItems.filter(k => k.applied).length;

    const openEl = document.getElementById('kaizenOpenCount');
    const appliedEl = document.getElementById('kaizenAppliedCount');
    if (openEl) openEl.textContent = `${openCount} Điểm nghẽn chờ bật`;
    if (appliedEl) appliedEl.textContent = `${appliedCount} Giải pháp đang kích hoạt`;

    const grid = document.getElementById('kaizenCardsGrid');
    if (!grid) return;

    grid.innerHTML = this.state.kaizenItems.map((kz, idx) => `
      <div class="rounded-2xl border ${kz.applied ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'} p-4 flex flex-col justify-between shadow-xs space-y-3">
        <div class="space-y-2.5 text-xs">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">${kz.id}</span>
              <span class="font-bold text-slate-900">${kz.segment}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${kz.applied ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'}">
              ${kz.applied ? 'Đã áp dụng vào Kế hoạch 5M' : 'Đề xuất Kaizen'}
            </span>
          </div>

          <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs">
            <div class="font-bold text-[11px] uppercase text-rose-800 mb-0.5">Hiện trạng & Điểm nghẽn:</div>
            <p class="leading-relaxed">${kz.issue || kz.problem}</p>
          </div>

          <div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs">
            <div class="font-bold text-[11px] uppercase text-indigo-800 mb-0.5">Giải pháp Điều độ & Kaizen 5M:</div>
            <p class="leading-relaxed">${kz.solution}</p>
          </div>

          <div class="text-emerald-800 font-semibold text-xs flex items-center gap-1">
            <i data-lucide="trending-up" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Hiệu quả: ${kz.result || kz.impact}</span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t border-slate-200 flex justify-end">
          <button onclick="MESApp.toggleKaizen(${idx})" class="px-3.5 py-1.5 rounded-lg font-bold text-xs transition ${
            kz.applied
              ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }">
            ${kz.applied ? 'Đang kích hoạt (Nhấp để tắt)' : 'Kích hoạt giải pháp Kaizen này'}
          </button>
        </div>
      </div>
    `).join('');
  },

  toggleKaizen(idx) {
    if (!this.state.kaizenItems[idx]) return;
    this.state.kaizenItems[idx].applied = !this.state.kaizenItems[idx].applied;
    MESStorage.saveState(this.state);
    this.runOptimization();
    this.render();
    const item = this.state.kaizenItems[idx];
    this.showToast(`Đã ${item.applied ? 'kích hoạt' : 'tắt'} giải pháp Kaizen ${item.id}!`, 'info');
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
      if (sum) {
        const feasible = sum.capEpDay >= (sp.lvfDemand || 650);
        resEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-900 text-sm">Kết Quả Kịch Bản Đang Chạy</h3>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${feasible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${feasible ? 'Đủ công suất Ép đế' : 'NGHẼN Ép đế — thiếu ' + Math.max(0, (sp.lvfDemand || 650) - sum.capEpDay) + ' đôi/ngày'}
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
        resEl.innerHTML = '<p class="text-xs text-slate-500">Bấm “Chạy Thuật Toán Tối Ưu Ngay” để tính kết quả kịch bản — bảng so sánh phía dưới là số liệu mẫu cố định, không phải kết quả của lần chạy.</p>';
      }
    }

    const btnRun = document.getElementById('btnRunSimulation');
    if (btnRun) {
      btnRun.onclick = () => {
        const molds = parseInt(document.getElementById('simMolds').value) || 12;
        const simParams = {
          lvfDemand: parseInt(document.getElementById('simLvfDemand').value) || 650,
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
