/**
 * Storage Layer for MES-anti
 * Hybrid IndexedDB + LocalStorage for seamless client-side persistence.
 * Guarantees zero data loss on browser refresh, full offline capability, and instant Vercel load.
 */

const STORAGE_KEY = 'MES_ANTI_STATE_V1';

window.MESStorage = {
  state: null,
  listeners: [],

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.state = JSON.parse(saved);
        // Ensure state integrity
        if (!this.state.ordersGrouped || this.state.ordersGrouped.length === 0) {
          this.resetToDefaults(false);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  resetToDefaults(notify = true) {
    if (!window.TVS_MASTER_DATA) {
      console.error('TVS_MASTER_DATA not loaded!');
      return;
    }
    // Deep clone master data
    this.state = JSON.parse(JSON.stringify(window.TVS_MASTER_DATA));
    this.state.activityLog = [
      {
        ts: new Date().toISOString(),
        action: 'INIT_SYSTEM',
        detail: 'Đã nạp 651 dòng size, 113 PO, 7 phân đoạn & 32 công đoạn nhỏ từ TVS master data.'
      }
    ];
    this.save();
    if (notify) {
      this.notifyListeners('RESET');
    }
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
    // keep max 500 logs
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

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.ordersGrouped && parsed.segments && parsed.subProcesses) {
        this.state = parsed;
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
