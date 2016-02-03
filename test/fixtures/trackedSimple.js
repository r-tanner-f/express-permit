'use strict';

var Express = require('express');
var router = Express.Router();

var permit = require('../../src/index.js').tag(router);
var tree = require('../../src/index.js').tree;

router.get('/', permit('haveFun'), function(req, res) {
  res.send('yaaay');
});

router.get('/tree', tree, function(req, res) {
  res.json(res.locals.permissionSet);
});

var app = require('./common')(router, {
      awesomeUser: {
        root: {
          haveFun: true,
        },
      },
      terribleUser: {
        root: {
          haveFun: false,
        },
      },
    });

module.exports = app;
