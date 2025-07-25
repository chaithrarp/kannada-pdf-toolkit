const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { processFiles } = require('../controllers/pdfController');

router.post('/pdf/process', upload.array('files'), processFiles);

module.exports = router;