const express = require('express');
const router = express.Router();

const transactionController = require('../app/controllers/TransactionController');

router.use('/create-transaction', transactionController.createTrasaction);

module.exports = router;