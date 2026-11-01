/**
 * Universal I/O Engine for MES-anti
 * Powered by SheetJS (xlsx.full.min.js)
 * Supports:
 * - Parsing real Excel (.xlsx / .xls), CSV, TSV, and clipboard paste
 * - Exporting multi-sheet formatted Excel (.xlsx) workbooks and UTF-8 BOM CSV files
 * - Data validation and field normalization
 */

window.MESIO = {
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
      // Auto column widths
      if (sh.data.length > 0) {
        const colWidths = Object.keys(sh.data[0]).map(key => {
          const maxLen = Math.max(
            key.length,
            ...sh.data.map(row => String(row[key] || '').length)
          );
          return { wch: Math.min(40, Math.max(12, maxLen + 3)) };
        });
        ws['!cols'] = colWidths;
      }
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31)); // max sheet name length 31
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
   * Parse uploaded file (.xlsx, .xls, .csv, .tsv) or text paste
   */
  async parseFileOrText(fileOrText) {
    // If it's a string (clipboard paste or text)
    if (typeof fileOrText === 'string') {
      return this.parseTextString(fileOrText);
    }

    // If it's a File object
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

    // Determine delimiter (tab or comma)
    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const delim = isTab ? '\t' : ',';

    const parseLine = (line) => {
      if (isTab) return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
      // Basic CSV regex parser
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
