const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Wallet = new Schema({
  password: { type: String, default: '' },
  publicKey: {type: String, default: ''},
});

module.exports = mongoose.model('Wallet', Wallet);