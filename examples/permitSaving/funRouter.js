'use strict';

var Express = require('express');
var router = new Express.Router();

var permit = require('../src/index.js').permitGroup('amusement', router);

router.get('/', permit('have-fun'), function(req, res) {
  res.send('yaaay');
});

router.get('ferris-wheel', permit('go-on-rides'), function(req, res) {
  res.send('riding on the ferrris wheel. wheee!')
});

module.exports = router;
