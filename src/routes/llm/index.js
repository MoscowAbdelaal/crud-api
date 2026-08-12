const express = require('express');
const { classifyHandler } = require('./classify');

const router = express.Router();

// POST /classify - Classify a support message
router.post('/classify', classifyHandler);

module.exports = router;
