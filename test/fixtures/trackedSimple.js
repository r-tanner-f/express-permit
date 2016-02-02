'use strict';

var Express = require('express');
var router = Express.Router();

var permit = require('../../src/index.js').tag(router);
var tree = require('../../src/index.js').tree;

router.get('/', permit('have-fun'), function(req, res) {
  res.send('yaaay');
});

router.get('/tree', tree, function(req, res) {
  res.json(res.locals.permissionSet);
});

var app = require('./common')(router, {
      'awesome-user' : {
        '_root' : {
          'have-fun' : true,
        }
      },
      'terrible-user' : {
        '_root' : {
          'have-fun' : false,
        }
      },
    });

module.exports = app;
