const router = require('express').Router();

/** Фронт на Vercel; корень API — подсказка, без public/index.html */
router.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'webEducation API',
    docs: 'Используйте префикс /api (например /api/auth/login)',
  });
});

module.exports = router;
