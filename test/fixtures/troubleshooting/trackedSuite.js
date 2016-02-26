'use strict';

var Express = require('express');
var router = Express.Router();

var permit = require('../../../src/index.js').tag(router, 'amusement');
var list = require('../../../src/index.js').api.list;

router.get('/', permit('haveFun'), function (req, res) {
  res.send('yaaay');
});

router.get('/tree', list, function (req, res) {
  res.json(res.locals.permitAPI.list);
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
