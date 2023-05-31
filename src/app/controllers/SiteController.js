const session = require('express-session');
const Wallet = require('../models/Wallet');
const { Block, Transaction, Blockchain, MyChain, MINT_KEY_PAIR } = require("../models/Blockchain");

class SiteController {
  // [GET] /
  index(req, res) {
    if (!req.session.Wallet) {
      res.redirect('/login');
      return;
    }

    const balance = MyChain.getBalance(req.session.Wallet.publicKey);
    console.log(balance);

    res.locals = { ...res.locals, balance: balance, title: 'Home' };
    res.render('home');
  }

  // [GET] /test
  test(req, res) {
    res.locals = { ...res.locals, title: 'Test'};
    res.render('test');
  }

  // [GET] /transaction
  transactionList(req, res) {
    if (!req.session.Wallet) {
      res.redirect('/login');
      return;
    }

    const transactions = MyChain.getTransactions(req.session.Wallet.publicKey);
    console.log(transactions.length);
    res.locals = { ...res.locals, title: 'Transaction', transactions: transactions};
    res.render('transaction');
  }
}

module.exports = new SiteController();
