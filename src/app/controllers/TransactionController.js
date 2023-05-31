const EC = require("elliptic").ec, ec = new EC("secp256k1");
const Wallet = require('../models/Wallet');
const { Block, Transaction, Blockchain, MyChain, MINT_KEY_PAIR } = require("../models/Blockchain");
const { sendMessage, produceMessage } = require("../../index");

const GENESIS_PRIVATE_KEY = "62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d";
const GENESIS_KEY_PAIR = ec.keyFromPrivate(GENESIS_PRIVATE_KEY, "hex");
const GENESIS_PUBLIC_KEY = GENESIS_KEY_PAIR.getPublic("hex");

class TransactionController {
  // [POST] /create-transaction
  createTrasaction(req, res) {
    if(!req.session.Wallet) {
        res.redirect('/');
    }

    const target = req.body.target;
    const amount = req.body.amount;
    const privateKey = req.body.privateKey;
    const balance = MyChain.getBalance(req.session.Wallet.publicKey);

    if(target === '' || amount === '' || privateKey === '') {
        res.locals = { ...res.locals, balance: balance, title: 'Home', message: "Invalid input" };
        res.render('home');
        return;
    }

    if(amount > balance) {
        res.locals = { ...res.locals, balance: balance, title: 'Home', message: "Insufficient amount" };
        res.render('home');
        return;
    }

    setTimeout(() => {
	    const transaction = new Transaction(req.session.Wallet.publicKey, target, amount);

        const keyPair = ec.keyFromPrivate(privateKey, "hex");

        transaction.sign(keyPair);

        sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));

        MyChain.addTransaction(transaction);
    }, 1000);

    res.redirect('/');
  }
}

module.exports = new TransactionController();
