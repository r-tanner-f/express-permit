'use strict';

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
