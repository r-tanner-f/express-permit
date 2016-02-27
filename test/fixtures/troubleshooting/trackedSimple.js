'use strict';

/*
 * _                  _            _ ____  _                 _
 *| |_ _ __ __ _  ___| | _____  __| / ___|(_)_ __ ___  _ __ | | ___
 *| __| '__/ _` |/ __| |/ / _ \/ _` \___ \| | '_ ` _ \| '_ \| |/ _ \
 *| |_| | | (_| | (__|   <  __/ (_| |___) | | | | | | | |_) | |  __/
 * \__|_|  \__,_|\___|_|\_\___|\__,_|____/|_|_| |_| |_| .__/|_|\___|
 *                                                    |_|
 */

var Express = require('express');
var router = Express.Router();

var permit = require('../../../src/index.js').tag(router);
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
          root: {
            haveFun: true,
          },
        },
      },
      terribleUser: {
        root: {
          permissions: {
            haveFun: false,
          },
        },
      },
    });

module.exports = app;
