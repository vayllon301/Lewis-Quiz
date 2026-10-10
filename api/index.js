// Función de Vercel: todas las rutas /api/* llegan aquí (ver rewrite en vercel.json).
// Usa Upstash Redis; las variables KV_REST_API_URL y KV_REST_API_TOKEN las añade la integración de Vercel.

const { handle } = require('../lib/handler');
const { redisStore } = require('../lib/stores');

const store = redisStore(
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
);

module.exports = async (req, res) => {
  const parts = String(req.query.path || '').split('/').filter(Boolean);
  let out;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    out = await handle(req.method, parts, body, store);
  } catch (e) {
    console.error(e);
    out = { status: 500, body: { error: 'Error del servidor.' } };
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(out.status).json(out.body);
};
