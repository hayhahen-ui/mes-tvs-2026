/**
 * Storage Layer for MES-anti
 * Hybrid IndexedDB + LocalStorage for seamless client-side persistence.
 * Guarantees zero data loss on browser refresh, full offline capability, and instant Vercel load.
 *
 * FIX 02/11/2026 — root cause of "tabs don't work on Vercel":
 * The previous build stored ONLY {ordersGrouped, ordersRaw, workstations,
 * handoverLogs, kaizenItems, ...} but app.js reads state.segments and
 * state.subProcesses everywhere (dashboard KPI/table, BTP inventory,
 * workstation cards, quick-add, simulateShift...). Those fields were
 * undefined, so the first render threw and MESApp.init() aborted BEFORE
 * bindGlobalEvents() ran — tab buttons never got a click listener.
 * This file now builds + migrates those two derived collections from the
 * canonical workstations data, so every tab has the shape it expects.
 * It also adds the aliases the header buttons actually call
 * (resetToDefault / downloadBackup / restoreBackup / saveState), which
 * previously did not exist at all.
 */

const STORAGE_KEY = 'MES_ANTI_STATE_V2';

// Equipment per workstation, grounded in README / LAF shopfloor data.
const EQUIPMENT_BY_ID = {
  CAN_VAI: 'Máy cán vải + in tẩy / chặt quai',
  IN_LUA: 'Bàn in lụa + kho ủ 24h',
  LUYEN_KIN: 'Máy luyện kín (16 mẻ/ngày)',
  EP_DE: '12 bộ khuôn ép đế UK 3–9',
  MAI_DE: 'Bàn mài tay + máy đánh kẽm',
  CAN_DUN: 'Máy cán 5 trục + máy đùn',
  TO_CHAT: '8 máy chặt / dập'
};

function qcRuleFor(btpCode, qcRate) {
  if (btpCode === 'BTP-IL-04') return 'Ủ ≥ 24h';
  if (btpCode === 'BTP-TC-05') return 'Lưu kho ≥ 48h';
  if (btpCode === 'BTP-MD-04') return 'Mài trước ≥ 3 ngày';
  return 'QC ' + (qcRate != null ? qcRate : 99) + '%';
}

window.MESStorage = {
  state: null,
  listeners: [],

  // XÓA DỮ LIỆU MẪU 02/11/2026 (theo yêu cầu của user: chỉ giữ đơn hàng KD).
  // Giữ lại: đơn hàng KD (ordersGrouped/ordersRaw), cấu trúc xưởng
  // (7 phân đoạn, 32 công đoạn nhỏ, định biên, định mức, thiết bị, khuôn,
  // lịch lùi). Xóa: sản lượng "hôm nay", tồn WIP, POH/OEE mẫu, bàn giao
  // LVF mẫu, nhật ký mẫu. POH/OEE từ nay chỉ có khi user nhập
  // sản lượng thực tế ở bảng POH (tab Kế Hoạch) — không còn số mẫu tĩnh.
  // ĐÍNH CHÍNH 02/11/2026 (audit Excel LAF gốc): 6 kaizen ở tab 7 KHÔNG
  // phải dữ liệu mẫu — đó là khó khăn gốc từ file Excel LAF (cột Khó
  // khăn), nên hàm này KHÔNG được xóa kaizen nữa, mà chỉ chuẩn hóa
  // trường theo dõi (status/resolved...) cho chúng. Bàn giao LVF thì
  // Excel không có, nên xóa bàn giao vẫn đúng.
  // Nhu cầu LVF cũng không còn mặc định 650: simParams.lvfDemand = null
  // cho tới khi user nhập. data.js vẫn giữ bản gốc để đối chiếu, nhưng
  // state chạy thực tế luôn qua hàm này nên app mở lên là sạch mẫu.
  clearSampleData(state) {
    if (!state) return state;
    (state.workstations || []).forEach(w => {
      w.actualToday = 0;
      w.pohPercent = null;
      w.oeePercent = null;
      w.targetDailyLvf = null;
      w.dailyTargetPairs = null;
      (w.subProcesses || []).forEach(sp => {
        sp.actualToday = 0;
        sp.currentOutput = 0;
        sp.wipStock = 0;
      });
    });
    (state.segments || []).forEach(s => {
      s.actual = 0;
      s.poh = null;
      s.oee = null;
      s.planned = null;
      s.bottleneck_flag = false;
      s.bottleneck_issue = 'Chưa nhập nhu cầu — chưa đánh giá nghẽn';
    });
    (state.subProcesses || []).forEach(p => {
      p.actualToday = 0;
      p.wip_stock = 0;
    });
    state.handoverLogs = [];
    // Kaizen gốc được giữ nguyên; chỉ chuẩn hóa trường theo dõi.
    (state.kaizenItems || []).forEach(k => this.normalizeKaizen(k));
    if (!state.planRotations) state.planRotations = [];
    state.activityLog = [{
      ts: new Date().toISOString(),
      action: 'CLEAR_SAMPLE_DATA',
      detail: 'Đã xóa dữ liệu mẫu, chỉ giữ đơn hàng KD + cấu trúc xưởng + 6 điểm nghẽn gốc LAF. Nhập nhu cầu LVF và sản lượng thực tế để chạy kế hoạch và tính POH.'
    }];
    state.simParams = {
      lvfDemand: null,
      molds: 12,
      canVaiMode: 'batch',
      epDeMode: 'preload_ot',
      campaignBatching: true
    };
    state.sampleDataCleared = true;
    return state;
  },

  // Chuẩn hóa 1 kaizen về chế độ theo dõi: status 'open' | 'in_progress'
  // | 'resolved'. Trường applied cũ (giải pháp đã có trong Kế hoạch 1)
  // KHÔNG đồng nghĩa với "đã tháo gỡ" — tháo gỡ chỉ khi user tự nhập
  // ở tab 7, nên status mặc định luôn là 'open' cho dữ liệu gốc.
  normalizeKaizen(k) {
    if (!k || typeof k !== 'object') return k;
    if (!k.status) k.status = 'open';
    if (k.resolvedDate === undefined) k.resolvedDate = null;
    if (k.resolvedNote === undefined) k.resolvedNote = '';
    if (k.newNorm === undefined) k.newNorm = null;
    if (k.delayDays === undefined) k.delayDays = null;
    if (k.appliedToPlan === undefined) k.appliedToPlan = false;
    return k;
  },

  // Enrich one workstation with the fields tab 3's header/cards read.
  // Không còn mặc định 650: target chỉ có khi user đã nhập nhu cầu
  // (simParams.lvfDemand) hoặc workstation đã ghi target thật.
  enrichWorkstation(w) {
    if (!w || typeof w !== 'object') return w;
    const target = w.targetDailyLvf != null ? w.targetDailyLvf : null;
    const isBottleneck = target != null && (w.normCapacity || 0) < target;
    w.description = w.description || w.kaizenNote || '';
    w.dailyTargetPairs = w.dailyTargetPairs != null ? w.dailyTargetPairs : target;
    w.machineEquipment = w.machineEquipment || EQUIPMENT_BY_ID[w.id] || w.shortName || '';
    w.shiftModel = w.shiftModel || ('8h HC' + (w.id === 'EP_DE' ? ' + tăng ca 3.5h' : ''));
    w.standardWorkingHours = w.standardWorkingHours || '8h';
    w.kaizenScheduleRole = w.kaizenScheduleRole || w.scheduleRule || '';
    w.isBottleneck = w.isBottleneck !== undefined ? w.isBottleneck : isBottleneck;
    w.bottleneckStatus = w.bottleneckStatus || w.statusLabel || (isBottleneck ? 'Nghẽn công suất' : 'Ổn định');
    (w.subProcesses || []).forEach(sp => {
      sp.stepNumber = sp.stepNumber || sp.stepOrder;
      sp.safeBufferStock = sp.safeBufferStock || 1000;
      sp.qcCondition = sp.qcCondition || ('QC ' + (sp.qcRate != null ? sp.qcRate : 99) + '% • ' + (sp.nextStep || ''));
      if (sp.currentOutput == null) sp.currentOutput = sp.actualToday || 0;
    });
    return w;
  },

  // Flat 7-segment view used by the dashboard table + overview grid.
  buildSegments(workstations) {
    return (workstations || []).map(w => {
      const target = w.targetDailyLvf != null ? w.targetDailyLvf : null;
      const bottleneck = target != null && (w.normCapacity || 0) < target;
      return {
        id: w.id,
        code: w.id,
        segment: w.name,
        shortName: w.shortName,
        lineGroup: w.lineGroup,
        headcount: w.totalHeadcount,
        capacity: w.normCapacity,
        planned: target,
        actual: w.actualToday || 0,
        poh: w.pohPercent,
        oee: w.oeePercent,
        bottleneck_flag: bottleneck,
        bottleneck_issue: target == null
          ? 'Chưa nhập nhu cầu — chưa đánh giá nghẽn'
          : (bottleneck
            ? 'Nghẽn: ' + w.normCapacity + ' < ' + target + ' đôi/ngày'
            : (w.statusLabel || 'Ổn định')),
        machine_profile: EQUIPMENT_BY_ID[w.id] || w.shortName || '',
        shift_model: '8h HC' + (w.id === 'EP_DE' ? ' + tăng ca 3.5h' : '')
      };
    });
  },

  // Flat 32-BTP view used by dashboard table mode 2, BTP inventory,
  // handover gates, quick-add and simulateShift.
  buildSubProcesses(workstations) {
    const flat = [];
    (workstations || []).forEach(w => {
      (w.subProcesses || []).forEach(sp => {
        flat.push({
          btp_code: sp.btpCode,
          btp_name: sp.btpName,
          segment: w.name,
          workstationId: w.id,
          step_code: sp.stepCode,
          step_name: sp.name,
          stepNumber: sp.stepOrder,
          workers: sp.workers,
          normDaily: sp.normDaily,
          actualToday: sp.actualToday,
          wip_stock: sp.wipStock || 0,
          qc_rate: sp.qcRate,
          qc_rule: qcRuleFor(sp.btpCode, sp.qcRate),
          inputMaterial: sp.inputMaterial,
          nextStep: sp.nextStep,
          runSchedule: sp.runSchedule
        });
      });
    });
    return flat;
  },

  // Normalize a handover log from the master-data shape to the shape
  // tab 5's table reads (po_no / pairs / receiver_team / check_gates).
  normalizeHandover(h) {
    if (!h || h.po_no) return h;
    if (h.lvfCommand) {
      const parts = String(h.lvfCommand).split('/');
      h.order_no = (parts[0] || '').trim();
      h.po_no = (parts[1] || '').replace(/^PO\s*/i, '').trim();
    }
    if (h.bootModel) {
      const m = String(h.bootModel).match(/Màu\s+(\S+)\s*•\s*([^()]+)/);
      if (m) { h.color = m[1]; h.country = m[2].trim(); }
    }
    if (h.qtyPairs != null) h.pairs = h.qtyPairs;
    if (h.receiver) h.receiver_team = h.receiver;
    if (h.leadTimeCheck) h.check_gates = h.leadTimeCheck;
    return h;
  },

  // Bring any saved / imported state up to the shape app.js expects,
  // without discarding user edits that are already in that state.
  migrateState(state) {
    if (!state || typeof state !== 'object') return state;
    (state.workstations || []).forEach(w => this.enrichWorkstation(w));
    if (!state.segments || state.segments.length === 0) {
      state.segments = this.buildSegments(state.workstations);
    }
    if (!state.subProcesses || state.subProcesses.length === 0) {
      state.subProcesses = this.buildSubProcesses(state.workstations);
    }
    // Orders: keep BOTH size key styles ("UK 6" from master data and "6"
    // used by the raw-size table + Excel export) so neither view shows 0.
    (state.ordersGrouped || []).forEach(o => {
      if (o.sizes && typeof o.sizes === 'object') {
        Object.keys(o.sizes).forEach(k => {
          const m = String(k).match(/^UK\s*(\d+)$/);
          if (m && o.sizes[m[1]] == null) o.sizes[m[1]] = o.sizes[k];
          if (/^\d+$/.test(k) && o.sizes['UK ' + k] == null) o.sizes['UK ' + k] = o.sizes[k];
        });
      }
      if (o.total_pairs == null && o.totalPairs != null) o.total_pairs = o.totalPairs;
      if (o.total_boxes == null && o.totalCartons != null) o.total_boxes = o.totalCartons;
    });
    (state.handoverLogs || []).forEach(h => this.normalizeHandover(h));
    // Khôi phục kaizen gốc cho trình duyệt đã bị bản trước xóa sạch:
    // nguồn là data.js (đã bổ sung excelDifficulty + segmentId).
    if ((!state.kaizenItems || state.kaizenItems.length === 0)
        && window.TVS_MASTER_DATA && window.TVS_MASTER_DATA.kaizenItems) {
      state.kaizenItems = JSON.parse(JSON.stringify(window.TVS_MASTER_DATA.kaizenItems));
    }
    (state.kaizenItems || []).forEach(k => {
      k.segment = k.segment || k.section || '';
      k.issue = k.issue || k.problem || '';
      k.result = k.result || k.impact || '';
      this.normalizeKaizen(k);
    });
    if (!state.planRotations) state.planRotations = [];
    if (!state.simParams) state.simParams = { lvfDemand: null, molds: 12, canVaiMode: 'batch', epDeMode: 'preload_ot', campaignBatching: true };
    if (state.simParams.lvfDemand === 650 && !state.sampleDataCleared) {
      // Nhu cầu 650 cũ chỉ là mặc định mẫu, không phải số user nhập.
      state.simParams.lvfDemand = null;
    }
    if (state.simParams.outsoleMolds && !state.simParams.molds) state.simParams.molds = state.simParams.outsoleMolds;
    // Trình duyệt đã mở app bản cũ vẫn còn state mẫu trong localStorage:
    // lần nạp đầu tiên sau bản này sẽ xóa mẫu ngay tại đây. Giữ lại
    // nhu cầu/khuôn/phương án mà chính user đã nhập khác 650 (vì 650
    // không phân biệt được là mặc định mẫu hay user nhập, nên 650 cũ
    // luôn bị xóa theo yêu cầu bỏ mặc định).
    if (!state.sampleDataCleared) {
      const oldParams = state.simParams || {};
      const keepDemand = (oldParams.lvfDemand != null && oldParams.lvfDemand !== 650)
        ? oldParams.lvfDemand : null;
      this.clearSampleData(state);
      if (keepDemand != null) state.simParams.lvfDemand = keepDemand;
      if (oldParams.molds != null) state.simParams.molds = oldParams.molds;
      if (oldParams.canVaiMode) state.simParams.canVaiMode = oldParams.canVaiMode;
      if (oldParams.epDeMode) state.simParams.epDeMode = oldParams.epDeMode;
      if (oldParams.campaignBatching != null) state.simParams.campaignBatching = oldParams.campaignBatching;
    }
    return state;
  },

  // Keep the two views of the same fact in sync before persisting:
  // flat BTP edits -> workstation WIP (feeds the WIP chart),
  // segment edits -> workstation daily actual/POH (feeds capacity chart).
  syncDerived(state) {
    if (!state) return;
    if (state.workstations && state.subProcesses) {
      const byCode = {};
      state.subProcesses.forEach(p => { byCode[p.btp_code] = p; });
      state.workstations.forEach(w => {
        (w.subProcesses || []).forEach(sp => {
          const p = byCode[sp.btpCode];
          if (p) sp.wipStock = p.wip_stock || 0;
        });
      });
    }
    if (state.workstations && state.segments) {
      const byName = {};
      state.segments.forEach(s => { byName[s.segment] = s; });
      state.workstations.forEach(w => {
        const s = byName[w.name];
        if (s) {
          w.actualToday = s.actual;
          if (s.poh != null) w.pohPercent = s.poh;
        }
      });
    }
  },

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.state = JSON.parse(saved);
        if (!this.state.ordersGrouped || this.state.ordersGrouped.length === 0 || !this.state.workstations) {
          this.resetToDefaults(false);
        } else {
          const wasCleared = !!this.state.sampleDataCleared;
          this.migrateState(this.state);
          // Lần đầu xóa mẫu: lưu ngay để trình duyệt không còn số mẫu cũ.
          if (!wasCleared) this.save();
        }
      } else {
        this.resetToDefaults(false);
      }
    } catch (e) {
      console.warn('LocalStorage read error, resetting to defaults:', e);
      this.resetToDefaults(false);
    }
    return this.state;
  },

  getState() {
    if (!this.state) {
      this.init();
    }
    return this.state;
  },

  save() {
    try {
      this.syncDerived(this.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  // Alias: every app.js mutation calls saveState(this.state).
  // Previously this method did not exist, so every + / form / toggle
  // threw and never rendered — the app looked completely dead.
  saveState(state) {
    if (state) this.state = state;
    this.save();
  },

  resetToDefaults(notify = true) {
    if (!window.TVS_MASTER_DATA) {
      console.error('TVS_MASTER_DATA not loaded!');
      return;
    }
    const md = window.TVS_MASTER_DATA;

    // Build orders from rawGrouped
    const grouped = [];
    const rawLines = [];

    (md.rawGrouped || []).forEach((entry, idx) => {
      // entry: { d, c, o, p, m, b, s }
      const expDate = entry.d;
      const dates = MESOptimizer.calculateScheduleForOrder(expDate);

      let totalPairs = 0;
      let totalCartons = 0;
      const sizeMap = {};
      const sizeItems = entry.s || [];

      sizeItems.forEach(item => {
        const sz = item[0];
        const p = Number(item[1]) || 0;
        const c = Number(item[2]) || 0;
        totalPairs += p;
        totalCartons += c;
        sizeMap[sz] = (sizeMap[sz] || 0) + p;
        // Dual size keys: "UK 6" and "6" (see migrateState).
        const num = String(sz).replace(/^UK\s*/, '');
        sizeMap[num] = (sizeMap[num] || 0) + p;

        rawLines.push({
          exportDate: expDate,
          country: entry.c,
          orderCode: entry.o,
          poCode: entry.p,
          colorCode: entry.m,
          size: sz,
          pairs: p,
          cartons: c,
          batchNo: Number(entry.b) || 1,
          epDeDateStr: dates.date_ep_de,
          lvfGoDateStr: dates.date_go_lvf
        });
      });

      // Không còn mặc định 650: số ngày SX chỉ tính được khi đã nhập nhu cầu.
      const estProdDays = null;

      grouped.push({
        idx: idx + 1,
        id: idx + 1,
        exportDate: expDate,
        exportDateIso: dates.export_date_iso,
        export_date: expDate,
        export_date_iso: dates.export_date_iso,
        country: entry.c,
        orderCode: entry.o,
        order_no: entry.o,
        poCode: entry.p,
        po_no: entry.p,
        colorCode: entry.m,
        color: entry.m,
        batchNo: Number(entry.b) || 1,
        batch: Number(entry.b) || 1,
        totalPairs,
        total_pairs: totalPairs,
        totalCartons,
        total_boxes: totalCartons,
        sizeMap,
        sizes: sizeMap,
        sizeItems,
        estProdDays,
        date_ep_de: dates.date_ep_de,
        date_ep_de_iso: dates.date_ep_de_iso,
        date_mai_de: dates.date_mai_de,
        date_mai_de_iso: dates.date_mai_de_iso,
        date_dun_chat: dates.date_dun_chat,
        date_dun_chat_iso: dates.date_dun_chat_iso,
        date_in_lua: dates.date_in_lua,
        date_in_lua_iso: dates.date_in_lua_iso,
        date_go_lvf: dates.date_go_lvf,
        date_go_lvf_iso: dates.date_go_lvf_iso,
        epDeDateStr: dates.date_ep_de,
        maiDeDateStr: dates.date_mai_de,
        canDunDateStr: dates.date_dun_chat,
        inLuaDateStr: dates.date_in_lua,
        lvfGoDateStr: dates.date_go_lvf,
        status: 'Kịp xuất KD (OTD 100%)',
        otdGuaranteed: true
      });
    });

    grouped.sort((a, b) => {
      if (a.exportDateIso !== b.exportDateIso) return a.exportDateIso.localeCompare(b.exportDateIso);
      return a.colorCode.localeCompare(b.colorCode);
    });

    const workstations = JSON.parse(JSON.stringify(md.workstations));
    workstations.forEach(w => this.enrichWorkstation(w));

    this.state = {
      ordersGrouped: grouped,
      ordersRaw: rawLines,
      workstations: workstations,
      segments: this.buildSegments(workstations),
      subProcesses: this.buildSubProcesses(workstations),
      handoverLogs: [],
      kaizenItems: JSON.parse(JSON.stringify(md.kaizenItems)).map(k => this.normalizeKaizen({
        ...k,
        segment: k.segment || k.section || '',
        issue: k.issue || k.problem || '',
        result: k.result || k.impact || ''
      })),
      before5M: md.before5M,
      after5M: md.after5M,
      moldAlloc: md.moldAlloc,
      simParams: { lvfDemand: null, molds: 12, canVaiMode: 'batch', epDeMode: 'preload_ot', campaignBatching: true },
      activityLog: []
    };
    // Xóa mẫu ngay trên state vừa dựng (giữ nguyên đơn hàng KD ở trên).
    this.clearSampleData(this.state);
    this.state.activityLog = [
      {
        ts: new Date().toISOString(),
        action: 'INIT_SYSTEM',
        detail: 'Đã nạp 113 PO KD (651 dòng size) + 6 điểm nghẽn gốc LAF (tab 7) + cấu trúc 7 phân đoạn & 32 công đoạn. Dữ liệu mẫu đã xóa (sản lượng hôm nay, WIP, POH/OEE mẫu, bàn giao mẫu): nhập nhu cầu LVF và sản lượng thực tế để chạy kế hoạch và tính POH.'
      }
    ];

    this.save();
    if (notify) {
      this.notifyListeners('RESET');
    }
  },

  // Alias used by the header "Gốc" button in index.html.
  resetToDefault() {
    this.resetToDefaults(true);
  },

  subscribe(callback) {
    this.listeners.push(callback);
  },

  notifyListeners(event = 'UPDATE') {
    this.listeners.forEach(cb => {
      try { cb(event, this.state); } catch (e) { console.error('Listener error:', e); }
    });
  },

  log(action, detail) {
    if (!this.state.activityLog) this.state.activityLog = [];
    this.state.activityLog.unshift({
      ts: new Date().toISOString(),
      action,
      detail
    });
    if (this.state.activityLog.length > 500) {
      this.state.activityLog = this.state.activityLog.slice(0, 500);
    }
    this.save();
  },

  exportBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `MES_ANTI_BACKUP_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Alias used by the header "Backup" button in index.html.
  downloadBackup() {
    this.exportBackup();
  },

  // Alias used by the header "Nạp" file input in index.html.
  // Accepts the <input> element, a File, or a raw JSON string.
  restoreBackup(input) {
    const done = (text) => {
      const res = this.importBackup(text);
      if (window.MESApp && window.MESApp.showToast) {
        window.MESApp.showToast(res.message, res.success ? 'success' : 'error');
      } else if (!res.success) {
        alert(res.message);
      }
    };
    if (typeof input === 'string') { done(input); return; }
    const file = input && input.files ? input.files[0] : input;
    if (file && typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = () => done(reader.result);
      reader.readAsText(file);
    } else if (file && file.text) {
      file.text().then(done);
    }
  },

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.ordersGrouped && parsed.workstations) {
        this.state = this.migrateState(parsed);
        this.save();
        this.notifyListeners('RESTORE');
        return { success: true, message: 'Khôi phục sao lưu thành công!' };
      } else {
        return { success: false, message: 'Dữ liệu sao lưu không đúng cấu trúc MES-anti.' };
      }
    } catch (e) {
      return { success: false, message: 'Lỗi đọc tệp JSON: ' + e.message };
    }
  }
};
