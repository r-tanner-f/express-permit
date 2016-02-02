'use strict';

var Express = require('express');
var router = new Express.Router();

var permit = require('../src/index.js').permit('boredom', router);

router.get('stare-at-floor', permit('be-boring'), function(req, res) {
  res.send('staring at the floor. it is not interesting...');
});
module.exports = router;
