// Cloudflare Worker — приймає заявки з сайту і пересилає їх у Telegram-чат.
// Токен бота лишається тут, на сервері, і ніколи не потрапляє в HTML сторінки.
//
// Змінні середовища (Settings → Variables у панелі Worker'а, обидві як Secret):
//   TELEGRAM_BOT_TOKEN — токен від @BotFather
//   TELEGRAM_CHAT_ID   — id чату/групи, куди слати заявки
//
// Примітка щодо CORS нижче: обмеження Access-Control-Allow-Origin — це гігієна,
// а не захист від спаму. Браузер блокує лише читання відповіді чужим сайтом,
// але не сам запит — тому від спам-ботів захищає саме honeypot-перевірка нижче,
// а не цей заголовок.
const ALLOWED_ORIGIN = 'https://yakovyshynn-afk.github.io';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'bad json' }), { status: 400, headers: cors });
    }

    // Honeypot: real visitors never fill this hidden field, unsophisticated bots often do.
    if (data.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
    }

    const text = [
      '🦷 Нова заявка з сайту «Атланта»',
      `Ім'я: ${data.name || '-'}`,
      `Телефон: ${data.phone || '-'}`,
      `Напрямок: ${data.service || '-'}`,
      data.doctor ? `Лікар: ${data.doctor}` : null,
      data.message ? `Коментар: ${data.message}` : null,
      `Джерело: ${data.source || '-'}`,
    ].filter(Boolean).join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    });

    if (!tgRes.ok) {
      return new Response(JSON.stringify({ ok: false }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  },
};
