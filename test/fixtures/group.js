'use strict';

var Express = require('express');
var router = Express.Router();

var permit = require('../../src/index.js').tag.group('amusement');

router.get('/', permit('have-fun'), function(req, res) {
  res.send('yaaay');
});

var app = require('./common')(router, {
      'awesome-user' : {
        'amusement' : {
          'have-fun' : true,
        }
      },
      'terrible-user' : {
        'amusement': {
          'have-fun' : false,
        }
      },
    });

module.exports = app;
