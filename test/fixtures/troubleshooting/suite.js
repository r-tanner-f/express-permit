'use strict';

/*
 *  ____        _ _
 * / ___| _   _(_) |_ ___
 * \___ \| | | | | __/ _ \
 *  ___) | |_| | | ||  __/
 * |____/ \__,_|_|\__\___|
 */

var Express = require('express');
var router = Express.Router();

var permit = require('../../../src/index.js').tag('amusement');
router.get('/', permit('haveFun'), function (req, res) {
  res.send('yaaay');
});

var app = require('./common')(router, {
      awesomeUser: {
        permissions: {
          amusement: {
            haveFun: true,
          },
        },
      },
      terribleUser: {
        permissions: {
          amusement: {
            haveFun: false,
          },
        },
      },
    });

module.exports = app;
