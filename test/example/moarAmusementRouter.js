'use strict';

var Express = require('express');
var moarAmusementRouter = Express.Router();

var moarAmusement = require('../../src/index.js')
.tag('moarAmusement');

moarAmusementRouter.get('/games', moarAmusement('play-games'),
  function (req, res) {
    res.send('I think these might be rigged...');
  }
);

module.exports = moarAmusementRouter;
