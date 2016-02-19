'use strict';
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