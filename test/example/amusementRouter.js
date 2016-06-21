'use strict';

/*
 *                                ____             _
 *  __ _ _ __ ___  _   _ ___  ___|  _ \ ___  _   _| |_ ___ _ __
 * / _` | '_ ` _ \| | | / __|/ _ \ |_) / _ \| | | | __/ _ \ '__|
 *| (_| | | | | | | |_| \__ \  __/  _ < (_) | |_| | ||  __/ |
 * \__,_|_| |_| |_|\__,_|___/\___|_| \_\___/ \__,_|\__\___|_|
 */

const Express = require('express');

const amusementRouter     = Express.Router();

const amusement = require('../../src/index.js')
.tag('amusement');

// Demonstrates a tracked tag with a default suite set
amusementRouter.get('/rides', amusement('go-on-rides'), (req, res) => {
  res.send('whee!');
});

amusementRouter.get('/popcorn', amusement('eat-popcorn'), (req, res) => {
  res.send('omnomnomnomnom');
});

module.exports = amusementRouter;
