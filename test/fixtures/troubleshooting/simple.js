'use strict';

/*
 *  ____  _                 _
 * / ___|(_)_ __ ___  _ __ | | ___
 * \___ \| | '_ ` _ \| '_ \| |/ _ \
 *  ___) | | | | | | | |_) | |  __/
 * |____/|_|_| |_| |_| .__/|_|\___|
 *                   |_|
 */

var Express = require('express');
var router = Express.Router();

var permit = require('../../../src/index.js').check;
router.get('/', permit('haveFun'), function (req, res) {
  res.send('yaaay');
});

var app = require('./common')(router, {
      awesomeUser: {
        permissions: {
          root: {
            haveFun: true,
          },
        },
      },
      terribleUser: {
        permissions: {
          root: {
            haveFun: false,
          },
        },
      },
    });

module.exports = app;
