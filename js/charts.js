/**
 * Charts Manager for MES-anti
 * Powered by Chart.js
 * Provides responsive, interactive manufacturing management visualizations:
 * - Combo Bar + Line (Capacity vs Actual + POH/OEE Trends)
 * - Multi-Line Cumulative Trend / S-Curve (Sales Shipping vs LAF vs LVF)
 * - Donut/Pie (Color, Country, Batch composition)
 * - Radar 5M (Man, Machine, Material, Method, Measurement Before vs After)
 * - Size Distribution & Mold Allocation
 * - WIP Inventory & Bottleneck Stacked Bar
 */

window.MESCharts = {
  instances: {},

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  destroyAll() {
    Object.keys(this.instances).forEach(id => this.destroy(id));
  },

  /**
   * 1. Combo Bar + Line: Capacity, Actual Output & POH/OEE Trends across 7 Segments
   */
  renderCapacityChart(canvasId, segments) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = segments.map(s => {
      // Shorten label for clean display
      return s.segment.replace(/^\d+\.\s*/, '').replace('Chuyền ', '').replace('Cán Luyện - ', '');
    });

    const capacityData = segments.map(s => s.capacity);
    const actualData = segments.map(s => s.actual);
    const pohData = segments.map(s => Math.round((s.poh > 1 ? s.poh : s.poh * 100) * 10) / 10);
    const oeeData = segments.map(s => Math.round((s.oee > 1 ? s.oee : s.oee * 100) * 10) / 10);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Định mức (Đôi/ngày)',
            data: capacityData,
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            borderColor: '#94a3b8',
            borderWidth: 1,
            yAxisID: 'yPairs',
            order: 3
          },
          {
            type: 'bar',
            label: 'Thực tế (Đôi/ngày)',
            data: actualData,
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            yAxisID: 'yPairs',
            order: 2
          },
          {
            type: 'line',
            label: 'POH Đạt (%)',
            data: pohData,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            yAxisID: 'yPercent',
            order: 1
          },
          {
            type: 'line',
            label: 'OEE Máy (%)',
            data: oeeData,
            borderColor: '#6366f1',
            backgroundColor: '#6366f1',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.3,
            pointRadius: 3,
            yAxisID: 'yPercent',
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } } },
          tooltip: {
            callbacks: {
              label(c) {
                if (c.dataset.yAxisID === 'yPercent') {
                  return ` ${c.dataset.label}: ${c.raw}%`;
                }
                return ` ${c.dataset.label}: ${c.raw.toLocaleString('vi-VN')} đôi/ngày`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } },
          yPairs: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Sản lượng (Đôi/ngày)', font: { size: 10 } },
            ticks: { font: { size: 10 } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          yPercent: {
            type: 'linear',
            position: 'right',
            min: 50,
            max: 110,
            title: { display: true, text: 'Tỷ lệ %', font: { size: 10 } },
            ticks: { callback: v => v + '%', font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  },

  /**
   * 2. Multi-Line Cumulative Trend / S-Curve
   * Sales Shipping Milestones vs LAF Production vs LVF Handover
   */
  renderLeadtimeChart(canvasId, orders) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Group by export_date_iso
    const milestoneMap = {};
    orders.forEach(po => {
      const d = po.export_date_iso || po.export_date;
      if (!milestoneMap[d]) {
        milestoneMap[d] = {
          dateStr: po.export_date,
          iso: d,
          pairs: 0
        };
      }
      milestoneMap[d].pairs += (po.total_pairs || po.pairs || 0);
    });

    const sortedDates = Object.keys(milestoneMap).sort();
    const labels = [];
    const periodPairs = [];
    const cumExport = [];
    const cumLaf = [];
    const cumLvf = [];

    let sumExp = 0;
    sortedDates.forEach((d) => {
      const item = milestoneMap[d];
      labels.push(item.dateStr.slice(0, 5)); // dd/mm
      periodPairs.push(item.pairs);
      sumExp += item.pairs;
      cumExport.push(sumExp);
      // LAF is pulled 19 days ahead, so LAF production is buffered in advance
      cumLaf.push(Math.min(64837, Math.round(sumExp * 1.08)));
      cumLvf.push(Math.min(64837, Math.round(sumExp * 1.02)));
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Lũy kế LAF Sản Xuất (-19d)',
            data: cumLaf,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            borderWidth: 2.5,
            tension: 0.25,
            pointRadius: 2,
            yAxisID: 'yCum'
          },
          {
            type: 'line',
            label: 'Lũy kế Bàn Giao LVF (-5d)',
            data: cumLvf,
            borderColor: '#3b82f6',
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 2,
            yAxisID: 'yCum'
          },
          {
            type: 'line',
            label: 'Kế Hoạch Xuất KD Thật',
            data: cumExport,
            borderColor: '#10b981',
            borderWidth: 2.5,
            tension: 0.25,
            pointRadius: 2,
            yAxisID: 'yCum'
          },
          {
            type: 'bar',
            label: 'SL Xuất Mốc (Đôi)',
            data: periodPairs,
            backgroundColor: 'rgba(99, 102, 241, 0.35)',
            borderColor: '#6366f1',
            borderWidth: 1,
            yAxisID: 'yBar'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, family: 'Inter' } } },
          tooltip: {
            callbacks: {
              label(c) {
                return ` ${c.dataset.label}: ${c.raw.toLocaleString('vi-VN')} đôi`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, family: 'Inter' }, maxRotation: 45 }
          },
          yCum: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Lũy kế (Đôi)', font: { size: 10 } },
            ticks: { callback: v => (v / 1000).toFixed(0) + 'k', font: { size: 10 } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          yBar: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Đôi/Mốc', font: { size: 10 } },
            ticks: { font: { size: 9 } },
            grid: { display: false }
          }
        }
      }
    });
  },

  /**
   * 3. Donut/Pie Chart: Switchable between Color, Country, and Batch
   */
  renderDonutChart(canvasId, orders, dimension = 'color') {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const counts = {};
    orders.forEach(po => {
      const p = po.total_pairs || po.pairs || 0;
      let key = 'Khác';
      if (dimension === 'color') {
        key = po.color || 'Không màu';
      } else if (dimension === 'country') {
        key = po.country || 'Khác';
      } else if (dimension === 'batch') {
        key = `Đợt ${po.batch || 1}`;
      }
      counts[key] = (counts[key] || 0) + p;
    });

    // Top entries
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels = [];
    const data = [];
    const maxSlices = dimension === 'country' ? 8 : 10;

    let otherSum = 0;
    sorted.forEach(([k, v], idx) => {
      if (idx < maxSlices) {
        labels.push(k);
        data.push(v);
      } else {
        otherSum += v;
      }
    });
    if (otherSum > 0) {
      labels.push('Các nước khác');
      data.push(otherSum);
    }

    // Color palettes
    const paletteMap = {
      'LC1783': '#334155', // Đen than
      'LC1786': '#4d7c0f', // Xanh olive
      'LC1787': '#1e40af', // Xanh navy
      'LC1784': '#92400e', // Nâu đất
      'LC1785': '#eab308'  // Vàng bảo hộ
    };

    const backgroundColors = labels.map((l, i) => {
      if (paletteMap[l]) return paletteMap[l];
      const fallback = [
        '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
        '#06b6d4', '#14b8a6', '#f97316', '#64748b'
      ];
      return fallback[i % fallback.length];
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, family: 'Inter' } } },
          tooltip: {
            callbacks: {
              label(c) {
                const total = c.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((c.raw / total) * 100).toFixed(1);
                return ` ${c.label}: ${c.raw.toLocaleString('vi-VN')} đôi (${pct}%)`;
              }
            }
          }
        },
        cutout: '58%'
      }
    });
  },

  /**
   * 4. Radar Chart: 5M Benchmark (Before Kaizen vs Plan 1 After 5M Optimization)
   */
  renderRadar5M(canvasId, before5M, after5M) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const axes = ['Man', 'Machine', 'Material', 'Method', 'Measurement'];
    const labels = [
      'Man (Nhân lực & POH)',
      'Machine (OEE & Khuôn)',
      'Material (Vật tư & BTP)',
      'Method (Lịch lùi & Lead-time)',
      'Measurement (QC & 4 Chốt)'
    ];

    const beforeData = axes.map(k => before5M[k] || 75);
    const afterData = axes.map(k => after5M[k] || 95);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Trước Tối Ưu (Hiện trạng TVS)',
            data: beforeData,
            borderColor: '#94a3b8',
            backgroundColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1.5,
            pointRadius: 3
          },
          {
            label: 'Kế Hoạch 1 (Thuật toán 5M)',
            data: afterData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderWidth: 2.5,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 50,
            max: 100,
            ticks: { stepSize: 10, font: { size: 9 }, backdropColor: 'transparent' },
            pointLabels: { font: { size: 10, weight: '600', family: 'Inter' } },
            grid: { color: 'rgba(226, 232, 240, 0.8)' }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10, family: 'Inter' } } }
        }
      }
    });
  },

  /**
   * 5. Size Distribution (UK 3 - UK 9) & Mold Allocation (12 Molds)
   */
  renderSizeDistChart(canvasId, ordersRaw, moldAlloc) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const sizes = ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9'];
    const sizePairs = {};
    sizes.forEach(s => sizePairs[s] = 0);

    ordersRaw.forEach(row => {
      const s = row.size ? row.size.trim() : '';
      if (sizePairs[s] !== undefined) {
        sizePairs[s] += (row.pairs || 0);
      }
    });

    const pairsData = sizes.map(s => sizePairs[s]);
    const moldsData = sizes.map(s => moldAlloc[s] || 1);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sizes,
        datasets: [
          {
            label: 'Số đôi theo Size',
            data: pairsData,
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            yAxisID: 'yPairs'
          },
          {
            type: 'line',
            label: 'Số khuôn Ép đế (12 Bộ)',
            data: moldsData,
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            borderWidth: 3,
            pointRadius: 5,
            yAxisID: 'yMolds'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, family: 'Inter' } } },
          tooltip: {
            callbacks: {
              label(c) {
                if (c.dataset.yAxisID === 'yMolds') {
                  return ` Số khuôn phân bổ: ${c.raw} bộ`;
                }
                const total = pairsData.reduce((a, b) => a + b, 0);
                const pct = ((c.raw / total) * 100).toFixed(1);
                return ` Sản lượng: ${c.raw.toLocaleString('vi-VN')} đôi (${pct}%)`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } },
          yPairs: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Tổng số đôi', font: { size: 10 } },
            ticks: { callback: v => (v / 1000).toFixed(0) + 'k', font: { size: 9 } }
          },
          yMolds: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 5,
            title: { display: true, text: 'Số khuôn (Bộ)', font: { size: 10 } },
            ticks: { stepSize: 1, font: { size: 9 } },
            grid: { display: false }
          }
        }
      }
    });
  },

  /**
   * 6. WIP Inventory Stacked Bar Chart across 7 Segments
   */
  renderWipStackedChart(canvasId, subProcesses) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Group WIP by Segment
    const segWip = {};
    subProcesses.forEach(s => {
      const seg = s.segment.replace(/^\d+\.\s*/, '');
      segWip[seg] = (segWip[seg] || 0) + (s.wip_stock || 0);
    });

    const labels = Object.keys(segWip);
    const data = Object.values(segWip);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tồn kho BTP (Đôi)',
          data,
          backgroundColor: data.map(v => v > 6000 ? '#ef4444' : v > 3000 ? '#f59e0b' : '#10b981'),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(c) {
                return ` Tồn WIP: ${c.raw.toLocaleString('vi-VN')} đôi`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Số đôi tồn kho WIP', font: { size: 10 } },
            ticks: { font: { size: 9 } }
          },
          y: { ticks: { font: { size: 10, family: 'Inter' } } }
        }
      }
    });
  }
};
