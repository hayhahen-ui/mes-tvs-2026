/**
 * Vercel Serverless Function — proxy AI cho app MES (cùng domain app).
 *
 * Vì sao cần proxy này (lỗi 02/11/2026): gọi trực tiếp từ trình duyệt
 * tới api.river.ai bị trình duyệt chặn (Failed to fetch — River không
 * trả CORS cho origin của web, giống Anthropic). Dự án Owly cũng gọi
 * River qua proxy server (api/ai-passage.js) chứ không gọi trực tiếp
 * từ browser. Proxy này chạy cùng domain app nên trình duyệt không
 * chặn, rồi proxy (server) gọi tiếp tới provider.
 *
 * Bảo mật:
 * - BYOK: key do user dán trong app, trình duyệt gửi kèm từng request
 *   qua header Authorization Bearer. Proxy CHỈ chuyển tiếp key, KHÔNG
 *   lưu, KHÔNG log, KHÔNG trả key về trong bất kỳ response nào.
 * - Không có key server fallback: proxy không tự có key riêng nên
 *   không ai dùng ké được — muốn dùng phải có key của chính mình.
 * - Allowlist cứng các host provider (chống biến proxy thành open-proxy).
 * - Lỗi trả về chỉ có status chung, không kèm nội dung lỗi chứa key.
 *
 * API: POST /api/mes-ai-proxy
 *   Body: { provider, model, action: 'test' | 'chat', system?, prompt? }
 *   Header: Authorization: Bearer <key>
 *   Trả về: { ok: true, text? } hoặc { ok: false, error, status? }
 */

const PROVIDERS = {
  openai: { base: 'https://api.openai.com/v1', dialect: 'openai' },
  groq: { base: 'https://api.groq.com/openai/v1', dialect: 'openai' },
  openrouter: { base: 'https://openrouter.ai/api/v1', dialect: 'openai' },
  novita: { base: 'https://api.novita.ai/v3/openai', dialect: 'openai' },
  deepseek: { base: 'https://api.deepseek.com/v1', dialect: 'openai' },
  river: { base: 'https://api.river.ai/v1', dialect: 'openai' },
  anthropic: { base: 'https://api.anthropic.com/v1', dialect: 'anthropic' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta', dialect: 'gemini' }
};

function getKey(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const alt = req.headers['x-mes-ai-key'];
  return typeof alt === 'string' ? alt.trim() : '';
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Chỉ hỗ trợ POST' });
  }
  const body = parseBody(req);
  const prov = PROVIDERS[body.provider];
  if (!prov) {
    return res.status(400).json({ ok: false, error: 'Provider không hỗ trợ' });
  }
  const key = getKey(req);
  if (!key) {
    return res.status(401).json({ ok: false, error: 'Thiếu key AI' });
  }
  const model = String(body.model || '').trim();
  if (!model) {
    return res.status(400).json({ ok: false, error: 'Thiếu model' });
  }

  try {
    // ---- Kiểm tra kết nối: GET /models (không tốn token) ----
    if (body.action === 'test') {
      let url;
      let headers = {};
      if (prov.dialect === 'anthropic') {
        url = prov.base + '/models';
        headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
      } else if (prov.dialect === 'gemini') {
        url = prov.base + '/models?key=' + encodeURIComponent(key);
      } else {
        url = prov.base + '/models';
        headers = { Authorization: 'Bearer ' + key };
      }
      const r = await fetchWithTimeout(url, { headers }, 30000);
      return res.status(200).json({ ok: r.ok, status: r.status });
    }

    // ---- Chat ----
    if (body.action !== 'chat') {
      return res.status(400).json({ ok: false, error: 'action không hợp lệ' });
    }
    const prompt = String(body.prompt || '');
    const system = String(body.system || '');
    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Thiếu prompt' });
    }

    let url;
    let headers = { 'Content-Type': 'application/json' };
    let payload;
    if (prov.dialect === 'anthropic') {
      url = prov.base + '/messages';
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      payload = {
        model,
        max_tokens: 900,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      };
      if (system) payload.system = system;
    } else if (prov.dialect === 'gemini') {
      url = prov.base + '/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
      const text = system ? system + '\n\n' + prompt : prompt;
      payload = {
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
      };
    } else {
      url = prov.base + '/chat/completions';
      headers.Authorization = 'Bearer ' + key;
      payload = {
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt }
        ]
      };
    }

    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }, 60000);
    if (!r.ok) {
      return res.status(200).json({ ok: false, error: 'HTTP ' + r.status, status: r.status });
    }
    const data = await r.json();
    let text = '';
    if (prov.dialect === 'anthropic') {
      text = (data.content || []).map(c => c.text || '').join('');
    } else if (prov.dialect === 'gemini') {
      text = ((data.candidates || [])[0] || {}).content?.parts?.map(p => p.text || '').join('') || '';
    } else {
      text = (data.choices || [])[0]?.message?.content || '';
    }
    return res.status(200).json({ ok: true, text });
  } catch (e) {
    // Không trả chi tiết lỗi (có thể chứa host/key trong message).
    return res.status(200).json({ ok: false, error: 'Không gọi được provider' });
  }
};
