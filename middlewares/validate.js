// middlewares/validate.js
module.exports = (schema) => async (req, res, next) => {
  if (!schema || typeof schema.validateAsync !== 'function') {
    console.error('❌ Joi schema is invalid or undefined');
    return res.status(500).json({ error: 'Internal Server Error - Invalid Schema' });
  }

  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (err) {
    res.status(400).json({ error: err.details.map(e => e.message) });
  }
};
