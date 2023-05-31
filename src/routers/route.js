const express = require('express');

const siteRouter = require('./site');
const authRouter = require('./auth');
const transactionRouter = require('./transaction');

module.exports = function (app) {
  app.use((req, res, next) => {
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
      const query = req.url.slice(req.path.length);
      const safepath = req.path.slice(0, -1).replace(/\/+/g, '/');
      res.redirect(301, safepath + query);
    } else {
      next();
    }
  });

  app.use('/', authRouter);
  app.use('/', transactionRouter);
  app.use('/', siteRouter);
};
