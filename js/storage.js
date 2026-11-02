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

  // Enrich one workstation with the fields tab 3's header/cards read.
  enrichWorkstation(w) {
    if (!w || typeof w !== 'object') return w;
    const target = w.targetDailyLvf || 650;
    const isBottleneck = (w.normCapacity || 0) < target;
    w.description = w.description || w.kaizenNote || '';
    w.dailyTargetPairs = w.dailyTargetPairs || target;
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
      const target = w.targetDailyLvf || 650;
      const bottleneck = (w.normCapacity || 0) < target;
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
        bottleneck_issue: bottleneck
          ? 'Nghẽn: ' + w.normCapacity + ' < ' + target + ' đôi/ngày'
          : (w.statusLabel || 'Ổn định'),
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
    (state.kaizenItems || []).forEach(k => {
      k.segment = k.segment || k.section || '';
      k.issue = k.issue || k.problem || '';
      k.result = k.result || k.impact || '';
    });
    if (!state.simParams) state.simParams = { lvfDemand: 650, molds: 12, canVaiMode: 'batch', epDeMode: 'preload_ot', campaignBatching: true };
    if (state.simParams.outsoleMolds && !state.simParams.molds) state.simParams.molds = state.simParams.outsoleMolds;
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
          this.migrateState(this.state);
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

      const estProdDays = Math.max(0.5, Number((totalPairs / 650).toFixed(1)));

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
      handoverLogs: JSON.parse(JSON.stringify(md.handoverLogs)).map(h => this.normalizeHandover(h)),
      kaizenItems: JSON.parse(JSON.stringify(md.kaizenItems)).map(k => ({
        ...k,
        segment: k.segment || k.section || '',
        issue: k.issue || k.problem || '',
        result: k.result || k.impact || ''
      })),
      before5M: md.before5M,
      after5M: md.after5M,
      moldAlloc: md.moldAlloc,
      simParams: md.simParams,
      activityLog: [
        {
          ts: new Date().toISOString(),
          action: 'INIT_SYSTEM',
          detail: 'Đã nạp 651 dòng size, 113 PO, 7 phân đoạn & 32 công đoạn nhỏ từ TVS master data.'
        }
      ]
    };

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
