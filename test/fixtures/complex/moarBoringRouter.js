'use strict';

var Express = require('express');
var moarBoringRouter    = Express.Router();

var moarBoring = require('../../../src/index.js')
.tag('moarBoring', moarBoringRouter);

moarBoringRouter.get('/look-bored', moarBoring('be-boring'),
  function(req, res) {
    res.send('I\'m boooooored.');
  }
);

module.exports = moarBoringRouter;
