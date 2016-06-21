'use strict';

const Express = require('express');
const moarAmusementRouter = Express.Router();

const moarAmusement = require('../../src/index.js')
.tag('moarAmusement');

moarAmusementRouter.get('/games', moarAmusement('play-games'),
  (req, res) => {
    res.send('I think these might be rigged...');
  }
);

module.exports = moarAmusementRouter;
