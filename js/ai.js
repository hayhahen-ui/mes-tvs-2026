/**
 * MES AI — BYOK (Bring Your Own Key), theo đúng mẫu đã dùng ở 2 dự án
 * trước của user (Trade / NexusPilot và Owly English):
 * - Key do user dán trong UI (tab Vận hành lại), lưu duy nhất ở
 *   localStorage máy user, khóa `mes-ai-key-v1`, UI chỉ hiện ••••abcd.
 * - Key KHÔNG nằm trong repo, KHÔNG log, KHÔNG gửi đi đâu ngoài API
 *   của chính provider mà user chọn. Xóa key = xóa khỏi localStorage.
 * - Provider tự nhận diện từ tiền tố key (như owlyProviders.ts):
 *   gsk_ → Groq, sk-or- → OpenRouter, sk-ant- → Anthropic,
 *   AIza → Gemini, sk- → OpenAI, sk_ → Novita, còn lại DeepSeek
 *   (OpenAI-compatible). User vẫn chọn tay được provider/model.
 *   Ngoại lệ: River AI không có tiền tố riêng — chọn tay 'River AI'
 *   trong danh sách, model mặc định moonshotai/Kimi-K3.
 * - Chưa có key thì mọi phân tích dùng luật xác định (rule-based) ở
 *   app.js — AI chỉ làm giàu thêm lời giải thích, không phải đường
 *   duy nhất để xoay kế hoạch.
 * - Lưu ý CORS: Anthropic không cho gọi trực tiếp từ trình duyệt
 *   (cần proxy server); nếu test Anthropic lỗi mạng/CORS, UI sẽ báo
 *   dùng provider OpenAI-compatible khác (OpenAI/Groq/Novita/DeepSeek).
 */

window.MESAI = {
  KEY_STORAGE: 'mes-ai-key-v1',
  PROVIDER_STORAGE: 'mes-ai-provider-v1',
  MODEL_STORAGE: 'mes-ai-model-v1',

  // Proxy cùng domain (Vercel Function api/mes-ai-proxy.js). Trình duyệt
  // gọi cùng domain nên không bị CORS chặn; proxy (server) gọi tiếp
  // tới provider bằng key BYOK của user, không lưu/log key.
  PROXY_PATH: '/api/mes-ai-proxy',

  PROVIDERS: {
    openai: {
      label: 'OpenAI',
      base: 'https://api.openai.com/v1',
      dialect: 'openai',
      defaultModel: 'gpt-4o-mini'
    },
    groq: {
      label: 'Groq',
      base: 'https://api.groq.com/openai/v1',
      dialect: 'openai',
      defaultModel: 'llama-3.3-70b-versatile'
    },
    openrouter: {
      label: 'OpenRouter',
      base: 'https://openrouter.ai/api/v1',
      dialect: 'openai',
      defaultModel: 'openai/gpt-4o-mini'
    },
    novita: {
      label: 'Novita AI',
      base: 'https://api.novita.ai/v3/openai',
      dialect: 'openai',
      defaultModel: 'deepseek/deepseek-v3.2'
    },
    deepseek: {
      label: 'DeepSeek',
      base: 'https://api.deepseek.com/v1',
      dialect: 'openai',
      defaultModel: 'deepseek-chat'
    },
    // River AI (02/11/2026, theo đúng code mẫu user gửi + endpoint đã dùng
    // ở dự án Owly api/ai-passage.js): OpenAI-compatible, base
    // https://api.river.ai/v1, Bearer, model mặc định moonshotai/Kimi-K3.
    // Key River không có tiền tố nhận diện riêng nên user chọn tay
    // 'River AI' trong danh sách Provider (không dùng tự nhận diện).
    river: {
      label: 'River AI',
      base: 'https://api.river.ai/v1',
      dialect: 'openai',
      defaultModel: 'moonshotai/Kimi-K3',
      models: [
        'moonshotai/Kimi-K3',
        'Qwen/Qwen3.8-27B-FP8',
        'deepseek-ai/DeepSeek-V4.1-Flash-1017',
        'deepseek-ai/DeepSeek-V4.1-Flash',
        'zai-org/GLM-5.3-Flash',
        'GLM-5.3'
      ]
    },
    anthropic: {
      label: 'Anthropic (cần proxy, thường lỗi CORS từ trình duyệt)',
      base: 'https://api.anthropic.com/v1',
      dialect: 'anthropic',
      defaultModel: 'claude-haiku-4-5'
    },
    gemini: {
      label: 'Google Gemini',
      base: 'https://generativelanguage.googleapis.com/v1beta',
      dialect: 'gemini',
      defaultModel: 'gemini-2.0-flash'
    }
  },

  detectProvider(key) {
    if (!key) return null;
    const k = String(key).trim();
    if (k.startsWith('gsk_')) return 'groq';
    if (k.startsWith('sk-or-')) return 'openrouter';
    if (k.startsWith('sk-ant-')) return 'anthropic';
    if (k.startsWith('AIza')) return 'gemini';
    if (k.startsWith('sk_')) return 'novita';
    if (k.startsWith('sk-')) return 'openai';
    return 'deepseek';
  },

  getKey() {
    try { return localStorage.getItem(this.KEY_STORAGE) || ''; } catch (e) { return ''; }
  },

  getProvider() {
    try {
      const saved = localStorage.getItem(this.PROVIDER_STORAGE);
      if (saved && this.PROVIDERS[saved]) return saved;
    } catch (e) { /* ignore */ }
    return this.detectProvider(this.getKey());
  },

  getModel() {
    try {
      const saved = localStorage.getItem(this.MODEL_STORAGE);
      if (saved) return saved;
    } catch (e) { /* ignore */ }
    const prov = this.getProvider();
    return prov ? this.PROVIDERS[prov].defaultModel : '';
  },

  maskedKey() {
    const k = this.getKey();
    if (!k) return '';
    return '••••' + k.slice(-4);
  },

  saveKey(key, provider, model) {
    const k = String(key || '').trim();
    if (!k) return false;
    try {
      localStorage.setItem(this.KEY_STORAGE, k);
      const prov = provider || this.detectProvider(k);
      if (prov) localStorage.setItem(this.PROVIDER_STORAGE, prov);
      if (model) localStorage.setItem(this.MODEL_STORAGE, model);
    } catch (e) { return false; }
    return true;
  },

  clearKey() {
    try {
      localStorage.removeItem(this.KEY_STORAGE);
      localStorage.removeItem(this.PROVIDER_STORAGE);
      localStorage.removeItem(this.MODEL_STORAGE);
    } catch (e) { /* ignore */ }
  },

  // Gọi proxy cùng domain. Trả về:
  //  { via: 'proxy', data } khi proxy trả JSON,
  //  { via: 'proxy-unavailable' } khi proxy không có (404/405) hoặc
  //  không gọi được (app chưa deploy function) → caller fallback trực tiếp.
  async proxyRequest(payload, key) {
    try {
      const res = await fetch(this.PROXY_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + key
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 404 || res.status === 405) return { via: 'proxy-unavailable' };
      const data = await res.json().catch(() => null);
      if (!data) return { via: 'proxy-unavailable' };
      return { via: 'proxy', data };
    } catch (e) {
      return { via: 'proxy-unavailable' };
    }
  },

  providerLabel(provId) {
    return (this.PROVIDERS[provId] && this.PROVIDERS[provId].label) || provId || 'provider';
  },

  // Kiểm tra kết nối: proxy trước, trực tiếp sau (proxy 404 thì fallback).
  async testConnection() {
    const key = this.getKey();
    const provId = this.getProvider();
    if (!key || !provId) return { ok: false, message: 'Chưa có key AI.' };
    const prov = this.PROVIDERS[provId];
    const label = this.providerLabel(provId);
    const viaProxy = await this.proxyRequest({ provider: provId, model: this.getModel() || prov.defaultModel, action: 'test' }, key);
    if (viaProxy.via === 'proxy') {
      const d = viaProxy.data;
      if (d.ok) return { ok: true, message: `Kết nối OK qua proxy của app — ${label} chấp nhận key này.` };
      if (d.status === 401 || d.status === 403) {
        return { ok: false, message: `Key bị ${label} từ chối (401/403) — kiểm tra lại key hoặc quyền của key.` };
      }
      return { ok: false, message: `${label} trả ${d.status || 'lỗi'} qua proxy của app.` };
    }
    try {
      let url, headers;
      if (prov.dialect === 'anthropic') {
        url = prov.base + '/models';
        headers = {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        };
      } else if (prov.dialect === 'gemini') {
        url = prov.base + '/models?key=' + encodeURIComponent(key);
        headers = {};
      } else {
        url = prov.base + '/models';
        headers = { Authorization: 'Bearer ' + key };
      }
      const res = await fetch(url, { headers });
      if (res.ok) return { ok: true, message: `Kết nối OK trực tiếp — ${label} chấp nhận key này.` };
      const status = res.status;
      if (status === 401 || status === 403) {
        return { ok: false, message: `Key bị ${label} từ chối (401/403) — kiểm tra lại key hoặc quyền của key.` };
      }
      return { ok: false, message: `${label} trả ${status} khi gọi trực tiếp.` };
    } catch (e) {
      return {
        ok: false,
        message: `Không gọi được ${label} từ trình duyệt và proxy của app cũng không có/không gọi được (mạng/CORS hoặc Vercel chưa deploy function /api/mes-ai-proxy — mở link đó phải thấy "Chỉ hỗ trợ POST", không phải trang 404).`
      };
    }
  },

  // Tách text model trả về thành JSON phân tích (nếu parse được).
  parseAnalysis(text) {
    const cleaned = String(text || '').replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) { return null; }
    }
    return null;
  },

  buildPrompt(ctx) {
    return `Bạn là kỹ sư công nghiệp (Industrial Engineer) cho phân xưởng giày LAF.
Dữ liệu thật (không bịa thêm số):
- Điểm nghẽn: ${ctx.kaizen.id} — ${ctx.kaizen.segment} — ${ctx.kaizen.issue}
- Giải pháp Kế hoạch 1 đã đề xuất: ${ctx.kaizen.solution}
- Khó khăn gốc (Excel LAF): ${ctx.kaizen.excelDifficulty || '(không có)'}
- Công đoạn bị ảnh hưởng: ${ctx.segmentName} — định mức ${ctx.segmentCapacity} đôi/ngày, thực tế đã nhập ${ctx.segmentActual} đôi, POH hiện tại ${ctx.segmentPoh != null ? ctx.segmentPoh + '%' : 'chưa nhập thực tế'}
- Nhu cầu LVF đã nhập: ${ctx.demand != null ? ctx.demand + ' đôi/ngày' : 'chưa nhập'}
- Kế hoạch hiện tại: ${ctx.planSummary}
- POH nhà máy hiện tại: ${ctx.plantPoh != null ? ctx.plantPoh + '%' : 'chưa tính được'}
Nhiệm vụ: phân tích ngắn gọn bằng tiếng Việt và CHỈ trả về JSON (không giải thích ngoài JSON), đúng dạng:
{"rootCause":"...","actions":["...","..."],"estimatedImpact":{"pohSegment":"...","pohPlant":"...","feasibility":"...","workDays":"..."},"suggestedNorm":null,"suggestedMolds":null,"suggestedEpDeMode":null,"suggestedCanVaiMode":null,"explanation":"..."}
Trong đó suggestedNorm là số đôi/ngày (hoặc null nếu không đề xuất đổi định mức), suggestedMolds là số khuôn (hoặc null), suggestedEpDeMode là một trong "preload_ot"/"regular_only"/"two_shifts" (hoặc null), suggestedCanVaiMode là "batch"/"daily" (hoặc null). Không được bịa số liệu không có trong dữ liệu trên; nếu không đủ dữ liệu thì ghi rõ "chưa đủ dữ liệu" trong explanation.`;
  },

  // Phân tích 1 điểm nghẽn: proxy cùng domain trước (tránh CORS),
  // trực tiếp sau nếu proxy chưa deploy. Lỗi của provider (401/429/...)
  // trả về đúng status, không gộp thành "Failed to fetch" chung chung.
  async analyzeBottleneck(ctx) {
    const key = this.getKey();
    const provId = this.getProvider();
    if (!key || !provId) return { ok: false, error: 'Chưa có key AI.' };
    const prov = this.PROVIDERS[provId];
    const label = this.providerLabel(provId);
    const model = this.getModel() || prov.defaultModel;
    const prompt = this.buildPrompt(ctx);
    const system = 'Bạn là kỹ sư công nghiệp cho phân xưởng giày LAF. Chỉ trả về JSON đúng dạng được yêu cầu, không bịa số liệu.';

    // 1) Qua proxy cùng domain.
    const viaProxy = await this.proxyRequest({ provider: provId, model, action: 'chat', system, prompt }, key);
    if (viaProxy.via === 'proxy') {
      const d = viaProxy.data;
      if (d.ok) return { ok: true, parsed: this.parseAnalysis(d.text), raw: d.text };
      if (d.status === 401 || d.status === 403) {
        return { ok: false, error: `Key bị ${label} từ chối (401/403) — kiểm tra lại key hoặc quyền của key.` };
      }
      if (d.status === 429) {
        return { ok: false, error: `${label} hết lượt (429) — chờ rồi thử lại.` };
      }
      return { ok: false, error: `${label} trả lỗi qua proxy của app (${d.error || 'không rõ'}).` };
    }

    // 2) Fallback trực tiếp (chỉ có tác dụng với provider mở CORS như
    // OpenAI/Groq/OpenRouter; River/Anthropic/DeepSeek thường chặn).
    try {
      let text = '';
      if (prov.dialect === 'anthropic') {
        const res = await fetch(prov.base + '/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model,
            max_tokens: 900,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        text = (data.content || []).map(c => c.text || '').join('');
      } else if (prov.dialect === 'gemini') {
        const res = await fetch(prov.base + '/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        text = ((data.candidates || [])[0] || {}).content?.parts?.map(p => p.text || '').join('') || '';
      } else {
        const res = await fetch(prov.base + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + key
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 900,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt }
            ]
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        text = (data.choices || [])[0]?.message?.content || '';
      }
      return { ok: true, parsed: this.parseAnalysis(text), raw: text };
    } catch (e) {
      const msg = (e && e.message) || '';
      if (/^HTTP 401/.test(msg)) {
        return { ok: false, error: `Key bị ${label} từ chối (401) — kiểm tra lại key.` };
      }
      if (/^HTTP 429/.test(msg)) {
        return { ok: false, error: `${label} hết lượt (429) — chờ rồi thử lại.` };
      }
      return { ok: false, error: `Không gọi được ${label} từ trình duyệt (mạng/CORS — ${label} chặn gọi trực tiếp, cần qua proxy) và proxy của app cũng không có/không gọi được. Kiểm tra Vercel đã deploy function /api/mes-ai-proxy chưa: mở link đó phải thấy "Chỉ hỗ trợ POST", không phải trang 404.` };
    }
  }
};
