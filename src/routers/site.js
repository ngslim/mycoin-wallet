const express = require('express');
const router = express.Router();

const siteController = require('../app/controllers/SiteController');

router.use('/transaction', siteController.transactionList);
router.use('/test', siteController.test);
router.use('/', siteController.index);

module.exports = router;