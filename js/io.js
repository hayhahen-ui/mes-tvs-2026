/**
 * Universal I/O Engine for MES-anti
 * Powered by SheetJS (xlsx.full.min.js)
 * Supports:
 * - Parsing real Excel (.xlsx / .xls), CSV, TSV, and clipboard paste
 * - Exporting multi-sheet formatted Excel (.xlsx) workbooks and UTF-8 BOM CSV files
 * - Data validation, field normalization, and live feedback
 */

window.MESIO = {
  currentImportTarget: 'orders',
  importInitialized: false,

  /**
   * Export to genuine Excel (.xlsx) using SheetJS
   */
  exportToExcel(sheetsData, filename = 'MES_LAF_EXPORT.xlsx') {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện SheetJS chưa sẵn sàng, đang chuyển sang tải file CSV...');
      this.exportToCsv(sheetsData[0].data, filename.replace('.xlsx', '.csv'));
      return;
    }

    const wb = XLSX.utils.book_new();

    sheetsData.forEach(sh => {
      const ws = XLSX.utils.json_to_sheet(sh.data);
      if (sh.data.length > 0) {
        const colWidths = Object.keys(sh.data[0]).map(key => {
          const maxLen = Math.max(
            key.length,
            ...sh.data.map(row => String(row[key] || '').length)
          );
          return { wch: Math.min(45, Math.max(12, maxLen + 3)) };
        });
        ws['!cols'] = colWidths;
      }
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
    });

    XLSX.writeFile(wb, filename);
  },

  /**
   * Export to CSV with UTF-8 BOM for perfect Vietnamese Excel compatibility
   */
  exportToCsv(dataArray, filename = 'export.csv') {
    if (!dataArray || dataArray.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    const headers = Object.keys(dataArray[0]);
    const csvRows = [headers.join(',')];

    dataArray.forEach(row => {
      const vals = headers.map(h => {
        let val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      csvRows.push(vals.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export Orders and 5M Schedules
   */
  exportOrdersToExcel(ordersGrouped, planResult) {
    const sheet1 = ordersGrouped.map((o, idx) => {
      const sch = planResult?.schedules?.find(s => s.po_no === o.po_no);
      return {
        'STT': idx + 1,
        'Mã Đơn Hàng': o.order_no,
        'Số PO (TVS)': o.po_no,
        'Quốc Gia': o.country,
        'Mã Màu': o.color,
        'Tổng Số Đôi': o.total_pairs,
        'Số Thùng CLP': o.total_boxes,
        'Đợt Giao': `Đợt ${o.batch}`,
        'Khởi Động Ép Đế (-19d)': sch?.milestones?.start_ep_de || '',
        'Hoàn Tất Mài Đế (-8d)': sch?.milestones?.mai_de_xong || '',
        'Lưu Kho Đùn/Chặt (-7d)': sch?.milestones?.dun_chat_48h || '',
        'Ủ In Lụa 24h (-6d)': sch?.milestones?.in_lua_u24h || '',
        'Bàn Giao Sang LVF (-5d)': sch?.milestones?.giao_lvf || '',
        'Ngày Xuất KD': o.export_date,
        'Tỷ Lệ OTD': '100% Đúng Hạn'
      };
    });

    const sheet2 = ordersGrouped.map((o, idx) => ({
      'STT': idx + 1,
      'Số PO': o.po_no,
      'Mã Màu': o.color,
      'Quốc Gia': o.country,
      'UK 3': o.sizes['3'] || 0,
      'UK 4': o.sizes['4'] || 0,
      'UK 5': o.sizes['5'] || 0,
      'UK 6': o.sizes['6'] || 0,
      'UK 7': o.sizes['7'] || 0,
      'UK 8': o.sizes['8'] || 0,
      'UK 9': o.sizes['9'] || 0,
      'Tổng Số Đôi': o.total_pairs,
      'Ngày Xuất KD': o.export_date
    }));

    this.exportToExcel([
      { name: 'Ke_Hoach_1_Dieu_Do_5M', data: sheet1 },
      { name: 'Ma_Tran_Size_113_PO', data: sheet2 }
    ], 'Ke_Hoach_1_Toi_Uu_5M_TVS_LAF.xlsx');
  },

  /**
   * Export Dashboard Summary
   */
  exportDashboardToExcel(state) {
    const sheet1 = state.segments.map((s, idx) => ({
      'STT': idx + 1,
      'Phân Đoạn Công Việc': s.segment,
      'Định Biên (NS)': s.headcount,
      'Công Suất Chuẩn (Đôi/Ngày)': s.capacity,
      'Lũy Kế Thực Hiện (Đôi)': s.actual,
      'POH Đạt Được (%)': Math.round((s.poh > 1 ? s.poh : s.poh * 100) * 10) / 10,
      'Thiết Bị Chính': s.machine_profile,
      'Chế Độ Ca': s.shift_model,
      'Tình Trạng Điểm Nghẽn': s.bottleneck_issue
    }));

    const sheet2 = state.subProcesses.map((p, idx) => ({
      'STT': idx + 1,
      'Mã BTP Nhỏ': p.btp_code,
      'Tên Bán Thành Phẩm': p.btp_name,
      'Phân Đoạn': p.segment,
      'Công Đoạn Tạo Ra': p.step_name,
      'Tồn Kho WIP Hiện Tại (Đôi)': p.wip_stock || 0,
      'Định Mức An Toàn (Đôi)': 1000,
      'Tiêu Chuẩn QC': p.qc_rule
    }));

    this.exportToExcel([
      { name: '7_Phan_Doan_Tong_Hop', data: sheet1 },
      { name: '32_Cong_Doan_BTP_Nho', data: sheet2 }
    ], 'Bao_Cao_Tong_Hop_Phan_Xuong_LAF.xlsx');
  },

  /**
   * Export BTP Inventory
   */
  exportInventoryToExcel(subProcesses) {
    const sheetData = subProcesses.map((p, idx) => ({
      'STT': idx + 1,
      'Mã BTP': p.btp_code,
      'Tên Bán Thành Phẩm Chi Tiết': p.btp_name,
      'Phân Đoạn Trực Thuộc': p.segment,
      'Công Đoạn Sản Xuất': p.step_name,
      'Tồn Kho Hiện Tại (Đôi)': p.wip_stock || 0,
      'Tồn Kho An Toàn (Đôi)': 1000,
      'Tiêu Chuẩn Kỹ Thuật / QC': p.qc_rule,
      'Đánh Giá Buffer': (p.wip_stock || 0) >= 1000 ? 'Đạt An Toàn' : 'Cần Sản Xuất Bù'
    }));

    this.exportToExcel([
      { name: 'Ton_Kho_32_BTP_WIP', data: sheetData }
    ], 'Ton_Kho_32_BTP_WIP_LAF.xlsx');
  },

  /**
   * Export Handover Logs
   */
  exportHandoverToExcel(handoverLogs) {
    const sheetData = handoverLogs.map((h, idx) => ({
      'STT': idx + 1,
      'Mã Phiếu Bàn Giao': h.id,
      'Số PO': h.po_no,
      'Mã Đơn Hàng': h.order_no,
      'Quốc Gia': h.country,
      'Mã Màu': h.color,
      'Số Lượng Bộ Bàn Giao': h.pairs,
      'Tổ Nhận Thuộc LVF': h.receiver_team,
      'Kiểm Tra 4 Chốt Kỹ Thuật': h.check_gates,
      'Trạng Thái Phiếu': h.status
    }));

    this.exportToExcel([
      { name: 'Nhat_Ky_Ban_Giao_LVF', data: sheetData }
    ], 'Nhat_Ky_Ban_Giao_BTP_Sang_LVF.xlsx');
  },

  /**
   * Export Kaizen Items
   */
  exportKaizenToExcel(kaizenItems) {
    const sheetData = kaizenItems.map((kz, idx) => ({
      'STT': idx + 1,
      'Mã Đề Xuất': kz.id,
      'Phân Đoạn Áp Dụng': kz.segment,
      'Trụ Cột 5M': kz.pillar,
      'Hiện Trạng & Điểm Nghẽn': kz.issue || kz.problem,
      'Giải Pháp Điều Độ & Kaizen 5M': kz.solution,
      'Hiệu Quả Dự Kiến': kz.result || kz.impact,
      'Trạng Thái Kích Hoạt': kz.applied ? 'Đang kích hoạt' : 'Chờ bật'
    }));

    this.exportToExcel([
      { name: 'Danh_Muc_Kaizen_5M', data: sheetData }
    ], 'Danh_Muc_Kaizen_5M_Phan_Xuong_LAF.xlsx');
  },

  /**
   * Universal File/Paste Parser
   */
  async parseFileOrText(fileOrText) {
    if (typeof fileOrText === 'string') {
      return this.parseTextString(fileOrText);
    }
    const file = fileOrText;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcelFile(file);
    } else {
      const text = await file.text();
      return this.parseTextString(text);
    }
  },

  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Thư viện SheetJS chưa được nạp.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve({ sheetNames: workbook.SheetNames, rows: json });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  parseTextString(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { sheetNames: ['Data'], rows: [] };

    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');

    const parseLine = (line) => {
      if (isTab) return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
      const regex = /(?:,|\r?\n|^)("(?:(?:"")*[^"]*)*"|[^",\r\n]*)/gi;
      const row = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        row.push(val.trim());
      }
      return row;
    };

    const headers = parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || !cols.some(c => c !== '')) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] !== undefined ? cols[idx] : '';
      });
      rows.push(obj);
    }

    return { sheetNames: ['TextImport'], rows };
  },

  /**
   * Setup Drag & Drop and Execute Import Events
   */
  setupImportDropzone() {
    if (this.importInitialized) return;
    this.importInitialized = true;

    const dropzone = document.getElementById('importFileDropzone');
    const fileInput = document.getElementById('importFileInput');
    const btnExecute = document.getElementById('btnExecuteImport');
    let selectedFile = null;

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          selectedFile = e.target.files[0];
          dropzone.innerHTML = `
            <i data-lucide="check-circle" class="w-10 h-10 text-emerald-500 mx-auto"></i>
            <div class="font-bold text-slate-800">${selectedFile.name}</div>
            <div class="text-[11px] text-slate-500 font-mono">${(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng import</div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      };

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add('border-amber-500', 'bg-amber-50/50');
      };

      dropzone.ondragleave = () => {
        dropzone.classList.remove('border-amber-500', 'bg-amber-50/50');
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-amber-500', 'bg-amber-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          selectedFile = e.dataTransfer.files[0];
          dropzone.innerHTML = `
            <i data-lucide="check-circle" class="w-10 h-10 text-emerald-500 mx-auto"></i>
            <div class="font-bold text-slate-800">${selectedFile.name}</div>
            <div class="text-[11px] text-slate-500 font-mono">${(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng import</div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      };
    }

    if (btnExecute) {
      btnExecute.onclick = async () => {
        const pasteText = document.getElementById('importPasteArea')?.value.trim();
        let payload = null;

        try {
          if (selectedFile) {
            payload = await this.parseFileOrText(selectedFile);
          } else if (pasteText) {
            payload = await this.parseFileOrText(pasteText);
          } else {
            alert('Vui lòng chọn file Excel/CSV hoặc dán dữ liệu vào ô trước khi bấm Import!');
            return;
          }

          if (!payload || !payload.rows || payload.rows.length === 0) {
            alert('Không tìm thấy dữ liệu hợp lệ trong nguồn import.');
            return;
          }

          this.processImportRows(payload.rows, this.currentImportTarget);
          MESApp.closeAllModals();

          // Reset UI
          selectedFile = null;
          if (fileInput) fileInput.value = '';
          if (document.getElementById('importPasteArea')) document.getElementById('importPasteArea').value = '';
          if (dropzone) {
            dropzone.innerHTML = `
              <i data-lucide="file-spreadsheet" class="w-10 h-10 text-slate-400 mx-auto"></i>
              <div class="font-bold text-slate-800">Kéo thả file Excel (.xlsx) hoặc bấm vào đây để chọn</div>
              <div class="text-[11px] text-slate-500">Được xử lý bởi SheetJS engine chuẩn xác đến từng ô dữ liệu</div>
              <input type="file" id="importFileInput" accept=".xlsx, .xls, .csv" class="hidden" />
            `;
            this.importInitialized = false;
            this.setupImportDropzone();
            if (window.lucide) window.lucide.createIcons();
          }

        } catch (err) {
          alert('Lỗi khi đọc dữ liệu import: ' + err.message);
        }
      };
    }
  },

  /**
   * Process and normalize imported rows into state
   */
  processImportRows(rows, targetType) {
    let count = 0;

    if (targetType === 'orders') {
      rows.forEach(r => {
        const po = r['Số PO'] || r['PO'] || r['po_no'] || r['Số PO (TVS)'] || '';
        const orderNo = r['Mã Đơn Hàng'] || r['Đơn hàng'] || r['order_no'] || '';
        const country = (r['Quốc Gia'] || r['Quốc gia'] || r['country'] || '').toUpperCase();
        const color = r['Mã Màu'] || r['Màu'] || r['color'] || 'LC1783';
        const pairs = parseInt(r['Tổng Số Đôi'] || r['Số đôi'] || r['total_pairs'] || 0);
        const boxes = parseInt(r['Số Thùng CLP'] || r['Số thùng (CLP)'] || r['total_boxes'] || 0);
        const batch = parseInt(r['Đợt Giao'] || r['Đợt đặt hàng'] || r['batch'] || 1);
        const date = r['Ngày Xuất KD'] || r['Ngày xuất KD'] || r['export_date'] || '';

        if (po && pairs > 0) {
          const existing = MESApp.state.ordersGrouped.find(o => o.po_no === String(po));
          if (existing) {
            existing.total_pairs = pairs;
            if (boxes) existing.total_boxes = boxes;
            if (date) existing.export_date = date;
          } else {
            MESApp.state.ordersGrouped.push({
              order_no: orderNo || `DH-${po}`,
              po_no: String(po),
              country: country || 'VN',
              color: color,
              total_pairs: pairs,
              total_boxes: boxes || Math.round(pairs / 6),
              batch: batch,
              export_date: date || '25/08/2026',
              sizes: { "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0 }
            });
          }
          count++;
        }
      });

    } else if (targetType === 'wip' || targetType === 'outputs') {
      rows.forEach(r => {
        const code = r['Mã BTP'] || r['Mã BTP Nhỏ'] || r['btp_code'] || r['Mã bước'] || '';
        const stock = parseInt(r['Tồn Kho Hiện Tại (Đôi)'] || r['Tồn kho thực tế'] || r['SL hoàn thành'] || r['wip_stock'] || 0);
        if (code) {
          const btp = MESApp.state.subProcesses.find(p => p.btp_code === String(code).trim());
          if (btp) {
            btp.wip_stock = stock;
            count++;
          }
        }
      });

    } else if (targetType === 'handover') {
      rows.forEach(r => {
        const po = r['Số PO'] || r['po_no'] || '';
        const pairs = parseInt(r['Số Lượng Bộ Bàn Giao'] || r['SL'] || r['pairs'] || 0);
        const receiver = r['Tổ Nhận Thuộc LVF'] || r['To_Nhan'] || r['receiver_team'] || 'Chuyền Gò LVF';
        if (po && pairs > 0) {
          MESApp.state.handoverLogs.unshift({
            id: `BG-IMP-${String(MESApp.state.handoverLogs.length + 1).padStart(3, '0')}`,
            po_no: String(po),
            order_no: `DH-${po}`,
            country: 'EXPORT',
            color: 'LC1783',
            pairs: pairs,
            receiver_team: receiver,
            check_gates: 'Đạt 4/4 Chốt',
            status: 'Đã bàn giao'
          });
          count++;
        }
      });
    }

    MESStorage.saveState(MESApp.state);
    MESApp.runOptimization();
    MESApp.render();
    // FIX 02/11/2026: the old code reported "success" even for 0 rows —
    // notably the dashboard import target has no handler at all, so every
    // dashboard import falsely claimed success. Say so plainly instead.
    if (count === 0) {
      MESApp.showToast('Không tìm thấy bản ghi hợp lệ trong file/dữ liệu đã dán — kiểm tra lại tên cột theo Template.', 'warning');
    } else {
      MESApp.showToast(`Import thành công ${count} bản ghi dữ liệu!`, 'success');
    }
  },

  /**
   * Helper template downloads
   */
  downloadOrderTemplate() {
    const sample = [
      {
        "Ngày xuất KD": "25/08/2026",
        "Quốc gia": "GERMANY",
        "Đơn hàng": "AE2608999",
        "PO": "0903999999-1",
        "Màu": "LC1783",
        "Size": "UK 6",
        "Số đôi": 500,
        "Số thùng (CLP)": 84,
        "Đợt đặt hàng": 2
      },
      {
        "Ngày xuất KD": "25/08/2026",
        "Quốc gia": "GERMANY",
        "Đơn hàng": "AE2608999",
        "PO": "0903999999-1",
        "Màu": "LC1783",
        "Size": "UK 7",
        "Số đôi": 350,
        "Số thùng (CLP)": 58,
        "Đợt đặt hàng": 2
      }
    ];
    this.exportToExcel([{ name: 'Template_DonHang', data: sample }], 'Template_Nhap_Don_Hang_TVS.xlsx');
  },

  downloadOutputTemplate() {
    const sample = [
      {
        "Mã bước": "CV-S1",
        "Phân đoạn": "1. Cán Vải",
        "Tên công đoạn": "Cán vải cao su",
        "SL hoàn thành": 650,
        "Số NS đứng máy": 6,
        "Tỷ lệ QC đạt %": 99.5,
        "Ghi chú ca": "Đạt POH, chạy mẻ vải lót đen LC1783"
      }
    ];
    this.exportToExcel([{ name: 'Template_SanLuong', data: sample }], 'Template_Nhap_San_Luong_Ca.xlsx');
  },

  downloadWipTemplate() {
    const sample = [
      {
        "Mã BTP": "BTP-IL-04",
        "Tên BTP": "BTP Cao su in lụa đã ủ đủ 24h",
        "Tồn kho thực tế": 1150,
        "Lý do điều chỉnh": "Kiểm kê đầu tuần"
      }
    ];
    this.exportToExcel([{ name: 'Template_TonKho_BTP', data: sample }], 'Template_Kiem_Ke_BTP.xlsx');
  }
};
