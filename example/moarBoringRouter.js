'use strict';

var Express = require('express');
var moarBoringRouter    = Express.Router();

var check = require('../../src/index.js').check;

// Demonstrates an untracked check with a suite
moarBoringRouter.get('/look-bored', check('be-boring', 'moarBoring'),
  function (req, res) {
    res.send('I\'m boooooored.');
  }
);

module.exports = moarBoringRouter;
