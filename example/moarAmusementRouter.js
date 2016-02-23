'use strict';

var Express = require('express');
var moarAmusementRouter = Express.Router();

var moarAmusement = require('../../src/index.js')
.tag('amusement', moarAmusementRouter);

// Demonstrates a tag suite override.
// The 'moarAmusement' argument overrides the 'amusement' tag, and is tracked.
moarAmusementRouter.get('/games', moarAmusement('play-games', 'moarAmusement'),
  function (req, res) {
    res.send('I think these might be rigged...');
  }
);

module.exports = moarAmusementRouter;
