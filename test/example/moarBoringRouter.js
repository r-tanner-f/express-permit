'use strict';

const Express = require('express');
const moarBoringRouter    = Express.Router();

const check = require('../../src/index.js').check;

// Demonstrates an untracked check with a suite
moarBoringRouter.get('/look-bored', check('be-boring', 'moarBoring'),
  (req, res) => {
    res.send('I\'m boooooored.');
  }
);

module.exports = moarBoringRouter;
