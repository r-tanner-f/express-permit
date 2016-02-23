'use strict';

var Express = require('express');
var boringRouter = Express.Router();

var boring = require('../../src/index.js').tag('boring', boringRouter);

// Demonstrates a tracked suite with a default set
boringRouter.get('/twiddle', boring('be-bored'), function (req, res) {
  res.send('twiddling thumbs is actually entertaining after a few hours...');
});

boringRouter.get('/shuffle-dirt', boring('be-bored'), function (req, res) {
  res.send('*cough* cough*');
});

module.exports = boringRouter;
