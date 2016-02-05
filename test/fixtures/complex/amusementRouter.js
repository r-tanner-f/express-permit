'use strict';

var Express = require('express');

var amusementRouter     = Express.Router();
var amusement = require('../../../src/index.js')
.tag('amusement', amusementRouter);

amusementRouter.get('/rides', amusement('go-on-rides'), function(req, res) {
  res.send('whee!');
});

amusementRouter.get('/popcorn', amusement('eat-popcorn'), function(req, res) {
  res.send('omnomnomnomnom');
});

module.exports = amusementRouter;
