const EC = require("elliptic").ec, ec = new EC("secp256k1");
const Wallet = require('../models/Wallet');
const { Block, Transaction, Blockchain, MyChain, MINT_KEY_PAIR } = require("../models/Blockchain");
const { sendMessage, produceMessage } = require("../../index");

const GENESIS_PRIVATE_KEY = "62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d";
const GENESIS_KEY_PAIR = ec.keyFromPrivate(GENESIS_PRIVATE_KEY, "hex");
const GENESIS_PUBLIC_KEY = GENESIS_KEY_PAIR.getPublic("hex");

class AuthController {
  // [GET] /login
  login(req, res) {
    if (req.session.Wallet) {
      res.redirect('/');
      return;
    }
    res.locals = { title: 'Login', layout: 'null' };
    res.render('login');
  }
  //[POST] /verify
  async verify(req, res, next) {
    const _password = req.body.password;

    const wallet = await Wallet.findOne({
      password: _password,
    }).exec();

    if (wallet === null) {
      res.locals = {
        title: 'Login',
        layout: 'null',
        message: 'Account does not exist.',
      };
      res.render('login');
    } else {
      req.session.Wallet = {
        password: _password,
        publicKey: wallet.publicKey,
      };
      res.locals.session = req.session;
      res.redirect('/');
    }
  }

  // [GET] /register
  register(req, res) {
    if (req.session.Wallet) {
      res.redirect('/');
      return;
    }
    res.locals = { title: 'Register', layout: 'null' };
    res.render('register');
  }

  // [POST] /create-user
  async create(req, res, next) {
    const _password = req.body.password;

    const wallet = await Wallet.findOne({
      password: _password,
    }).exec();

    if (wallet === null) {
      const keyPair = ec.genKeyPair();
      console.log(keyPair.getPublic("hex"));
      Wallet.create({
        password: _password,
        publicKey: keyPair.getPublic("hex"),
      });

      setTimeout(() => {
	      const transaction = new Transaction(GENESIS_KEY_PAIR.getPublic("hex"), keyPair.getPublic("hex"), 100);

        transaction.sign(GENESIS_KEY_PAIR);

        sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));

        MyChain.addTransaction(transaction);
      }, 1000);

      req.session.Wallet = {
        password: _password,
        publicKey: keyPair.getPublic("hex"),
      };
      res.locals.session = req.session;
      res.locals = { ...res.locals, privateKey: keyPair.getPrivate("hex") }
      res.render('post-register');
    } else {
      res.locals = {
        title: 'Register',
        layout: 'null',
        message: 'Password has been used',
      };
      res.render('register');
    }
  }

  post_register(req, res) {
    if (!req.session.Wallet) {
      res.redirect('/');
      return;
    }
    res.locals = { ...res.locals, title: 'Register' };
    res.render('post-register', { layout: 'null' });
  }

  logout(req, res) {
    req.session.destroy();
    res.redirect('/');
  }
}

module.exports = new AuthController();
