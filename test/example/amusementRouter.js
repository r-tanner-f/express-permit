'use strict';

/*
 *                                ____             _
 *  __ _ _ __ ___  _   _ ___  ___|  _ \ ___  _   _| |_ ___ _ __
 * / _` | '_ ` _ \| | | / __|/ _ \ |_) / _ \| | | | __/ _ \ '__|
 *| (_| | | | | | | |_| \__ \  __/  _ < (_) | |_| | ||  __/ |
 * \__,_|_| |_| |_|\__,_|___/\___|_| \_\___/ \__,_|\__\___|_|
 */

var Express = require('express');

var amusementRouter     = Express.Router();

var amusement = require('../../src/index.js')
.tag('amusement');

// Demonstrates a tracked tag with a default suite set
amusementRouter.get('/rides', amusement('go-on-rides'), function (req, res) {
  res.send('whee!');
});

amusementRouter.get('/popcorn', amusement('eat-popcorn'), function (req, res) {
  res.send('omnomnomnomnom');
});

module.exports = amusementRouter;
