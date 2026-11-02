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

  // Giá mỗi 1M token (input/output, USD) để công cụ so sánh ước tính
  // chi phí mỗi lần phân tích. Nguồn: ảnh console River + Experiential
  // user gửi 02/11/2026. Model không có giá thì chi phí hiện "—".
  PRICES: {
    'moonshotai/Kimi-K3': { input: 3, output: 15 },
    'Qwen/Qwen3.8-27B-FP8': { input: 0.1, output: 2 },
    'deepseek-ai/DeepSeek-V4.1-Flash': { input: 0.12, output: 0.48 },
    'deepseek-ai/DeepSeek-V4.1-Flash-1017': { input: 0.12, output: 0.48 },
    'zai-org/GLM-5.3-Flash': { input: 0.12, output: 0.4 },
    'GLM-5.3': { input: 1.12, output: 3.52 },
    'nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4': { input: 0.07, output: 0.37 },
    'gpt-6-luna': { input: 0.10, output: 0.50 }
  },

  estimateCost(model, usage) {
    const pr = this.PRICES[model];
    if (!pr || !usage) return null;
    const inp = usage.prompt_tokens != null ? usage.prompt_tokens : 0;
    const out = usage.completion_tokens != null ? usage.completion_tokens : 0;
    return (inp * pr.input + out * pr.output) / 1000000;
  },

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
    experiential: {
      label: 'Experiential Labs',
      base: 'https://api.experientiallabs.ai/v1',
      dialect: 'openai',
      defaultModel: 'gpt-6-luna',
      models: ['gpt-6-luna', 'gpt-6-luna-decisions'],
      // gpt-6-luna-decisions KHÔNG phải model chat — chỉ dùng cho endpoint
      // /v1/decisions (xem decideProposal). Guard ở analyzeBottleneck chặn
      // nó khỏi đường chat (bài học 08/10: route chat của model này từng
      // trả 503 unavailable_route trên gateway).
      decisionsModel: 'gpt-6-luna-decisions'
    },
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

  // Tách text model trả về thành JSON phân tích, đa tầng (bài học
  // parser Owly 27/10): (1) JSON sạch, (2) đoạn {...} cân bằng ngoặc
  // lớn nhất + khử dấu phẩy thừa trước } hoặc ], (3) đoạn từ '{'
  // đầu tới '}' cuối. Trả null nếu mọi tầng đều rớt — caller sẽ gọi
  // lại 1 lần với prompt siết chặt, rồi mới báo cho user kèm rawPreview.
  parseAnalysis(text) {
    const cleaned = String(text || '').replace(/```json|```/g, '').trim();
    if (!cleaned) return null;
    try { return JSON.parse(cleaned); } catch (e) { /* tầng 2 */ }
    // Đoạn cân bằng ngoặc: quét từ '{' đầu, đếm ngoặc (bỏ qua ngoặc
    // trong chuỗi có escape đơn giản — đủ cho JSON phân tích này).
    let start = cleaned.indexOf('{');
    while (start >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') inStr = false;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              const candidate = cleaned.slice(start, i + 1).replace(/,\s*([}\]])/g, '$1');
              try { return JSON.parse(candidate); } catch (e) { break; }
            }
          }
        }
      }
      start = cleaned.indexOf('{', start + 1);
    }
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1')); } catch (e) { return null; }
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
${ctx.objective ? `- Mục tiêu tối ưu do người dùng chọn: ${ctx.objective}` : ''}
${ctx.demandOverride != null ? `- Nhu cầu LVF dùng cho phân tích lần này: ${ctx.demandOverride} đôi/ngày (ghi đè nhu cầu đã nhập)` : ''}
${ctx.maxMolds != null ? `- Số khuôn tối đa được dùng: ${ctx.maxMolds}` : ''}
${ctx.targetPoh != null ? `- POH mục tiêu: ${ctx.targetPoh}%` : ''}
${ctx.allowOvertime != null ? `- Cho tăng ca: ${ctx.allowOvertime ? 'có' : 'không'}` : ''}
${ctx.allowTwoShifts != null ? `- Cho đi 2 ca: ${ctx.allowTwoShifts ? 'có' : 'không'}` : ''}
${ctx.context ? `- Bối cảnh thực tế do người dùng nhập thêm: ${ctx.context}` : ''}
Nhiệm vụ: phân tích ngắn gọn bằng tiếng Việt và CHỈ trả về JSON, không lời chào, không giải thích ngoài JSON, không markdown ngoài JSON (tốt nhất là JSON trần), đúng dạng:
{"rootCause":"...","actions":["...","..."],"estimatedImpact":{"pohSegment":"...","pohPlant":"...","feasibility":"...","workDays":"..."},"suggestedNorm":null,"suggestedMolds":null,"suggestedEpDeMode":null,"suggestedCanVaiMode":null,"explanation":"..."}
Trong đó suggestedNorm là số đôi/ngày (hoặc null nếu không đề xuất đổi định mức), suggestedMolds là số khuôn (hoặc null), suggestedEpDeMode là một trong "preload_ot"/"regular_only"/"two_shifts" (hoặc null), suggestedCanVaiMode là "batch"/"daily" (hoặc null). Không được bịa số liệu không có trong dữ liệu trên; nếu không đủ dữ liệu thì ghi rõ "chưa đủ dữ liệu" trong explanation.`;
  },

  // Phân tích 1 điểm nghẽn: proxy cùng domain trước (tránh CORS),
  // trực tiếp sau nếu proxy chưa deploy. Lỗi của provider (401/429/...)
  // trả về đúng status, không gộp thành "Failed to fetch" chung chung.
  // Nếu lần 1 parse rớt JSON (model trả văn bản), gọi lại 1 lần duy nhất
  // với prompt siết chặt (bài học parser Owly 27/10) rồi mới trả về.
  async analyzeBottleneck(ctx, override) {
    const key = this.getKey();
    const provId = this.getProvider();
    if (!key || !provId) return { ok: false, error: 'Chưa có key AI.' };
    const prov = this.PROVIDERS[provId];
    const label = this.providerLabel(provId);
    const model = (override && override.model) || this.getModel() || prov.defaultModel;
    // Safety net: model Decisions không được đi đường chat.
    if (model === 'gpt-6-luna-decisions') {
      return { ok: false, error: 'Model gpt-6-luna-decisions là model Decisions, không dùng cho chat phân tích — dùng nút “Đánh giá đề xuất bằng Decisions” thay thế.' };
    }
    const prompt = this.buildPrompt(ctx);
    const system = 'Bạn là kỹ sư công nghiệp cho phân xưởng giày LAF. Chỉ trả về JSON đúng dạng được yêu cầu, không bịa số liệu.';
    const strictSystem = 'CHỈ trả về JSON trần, không lời chào, không giải thích, không markdown. Bạn là kỹ sư công nghiệp cho phân xưởng giày LAF. Không bịa số liệu.';

    const runOnce = async (sys, prm) => {
      // 1) Qua proxy cùng domain.
      const viaProxy = await this.proxyRequest({ provider: provId, model, action: 'chat', system: sys, prompt: prm, maxTokens: 2000 }, key);
      if (viaProxy.via === 'proxy') {
        const d = viaProxy.data;
        if (d.ok) {
          if (!d.text) return { ok: false, error: `Model ${model} trả về rỗng — thử lại hoặc đổi model.` };
          return { ok: true, parsed: this.parseAnalysis(d.text), raw: d.text, usage: d.usage || null, model, provider: provId };
        }
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
        let usage = null;
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
              max_tokens: 2000,
              temperature: 0.2,
              messages: [{ role: 'user', content: prm }]
            })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          text = (data.content || []).map(c => c.text || '').join('');
          usage = data.usage || null;
        } else if (prov.dialect === 'gemini') {
          const res = await fetch(prov.base + '/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prm }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
            })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          text = ((data.candidates || [])[0] || {}).content?.parts?.map(p => p.text || '').join('') || '';
          usage = data.usageMetadata || null;
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
              max_tokens: 2000,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: prm }
              ]
            })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const msg = (data.choices || [])[0]?.message || {};
          text = msg.content || msg.reasoning_content || '';
          usage = data.usage || null;
        }
        if (!text) return { ok: false, error: `Model ${model} trả về rỗng — thử lại hoặc đổi model.` };
        return { ok: true, parsed: this.parseAnalysis(text), raw: text, usage, model, provider: provId };
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
    };

    const first = await runOnce(system, prompt);
    if (first.ok && !first.parsed && first.raw) {
      // Parse rớt: gọi lại 1 lần với prompt siết chặt.
      const second = await runOnce(strictSystem, prompt + '\n\nLƯU Ý: Lần trả trước không đúng dạng JSON. Lần này CHỈ trả JSON trần, không thêm bất kỳ chữ nào ngoài JSON.');
      if (second.ok && second.parsed) return { ...second, retried: true };
      return { ...first, retried: true };
    }
    return first;
  },

  // Đánh giá đề xuất bằng Decisions API (Experiential Labs):
  // POST {base}/decisions, model gpt-6-luna-decisions, câu hỏi accept /
  // review với bằng chứng. Kết quả CHỈ ĐỂ XEM — caller không được tự
  // áp dụng lựa chọn (đúng comment trong code mẫu user gửi: "Inspect
  // only; do not auto-execute a choice."). Cần key Experiential Labs
  // (provider hiện tại phải là Experiential, vì key theo provider).
  // Lưu ý lịch sử 08/10: route chat của model này từng 503
  // unavailable_route trên gateway — đó là lỗi phía provider, nếu
  // endpoint decisions cũng 503 thì báo đúng như vậy, không đổ cho key.
  async decideProposal(input, customQuestions) {
    const key = this.getKey();
    const provId = this.getProvider();
    if (!key) return { ok: false, error: 'Chưa có key AI.' };
    if (provId !== 'experiential') {
      return { ok: false, error: 'Đánh giá Decisions cần key Experiential Labs — chọn provider “Experiential Labs” ở tab 9, nhập key rồi thử lại (key provider khác không dùng được cho endpoint này).' };
    }
    const questions = customQuestions || [{
      type: 'choice',
      name: 'review',
      instructions: 'Does the supplied evidence support accepting this change, or does it need further review? Treat missing evidence as a reason to review.',
      choices: [
        { value: 'accept', description: 'The described change meets the task and the supplied evidence covers its relevant behavior.' },
        { value: 'review', description: 'Evidence is missing, the tests are insufficient, or the change may be incorrect.' }
      ]
    }];
    const viaProxy = await this.proxyRequest({ provider: 'experiential', model: 'gpt-6-luna-decisions', action: 'decide', input, questions }, key);
    if (viaProxy.via === 'proxy') {
      const d = viaProxy.data;
      if (d.ok) return { ok: true, answers: d.answers || [], usage: d.usage || null, raw: d.raw || null };
      if (d.status === 503) {
        return { ok: false, error: 'Endpoint Decisions trả 503 (unavailable_route) — lỗi phía gateway của provider, không phải do key hay thao tác. Thử lại sau.' };
      }
      if (d.status === 401 || d.status === 403) {
        return { ok: false, error: 'Key bị Experiential Labs từ chối (401/403) — kiểm tra lại key.' };
      }
      return { ok: false, error: `Decisions trả lỗi qua proxy (${d.error || 'không rõ'}).` };
    }
    // Fallback trực tiếp (Experiential mở CORS cho chat; decisions thử
    // trực tiếp tương tự).
    try {
      const res = await fetch('https://api.experientiallabs.ai/v1/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: 'gpt-6-luna-decisions', input, questions })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return { ok: true, answers: data.answers || [], usage: data.usage || null, raw: data };
    } catch (e) {
      return { ok: false, error: 'Không gọi được Decisions (mạng/CORS hoặc proxy chưa deploy): ' + (e && e.message ? e.message : '') };
    }
  }
};
