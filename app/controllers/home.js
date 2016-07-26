var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Article = mongoose.model('Article');

var path = require('path');

var Disciplina = require("../models/disciplina");

module.exports = function (app) {
  app.use('/', router);
};

last_date = new Date();

router.get('/disciplinas', function (req, res, next) {
  res.charset = 'ISO-8859-1';
  res.header('Last-Modified', last_date);
  res.sendFile(path.join(__dirname, '../../build/tmp', 'processed.json'));
});

router.get('/horarios', function (req, res, next) {
  res.charset = 'ISO-8859-1';
  res.header('Last-Modified', last_date);
  res.sendFile(path.join(__dirname, '../../build/tmp', 'horarios.json'));
});
