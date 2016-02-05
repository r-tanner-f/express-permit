'use strict';
var Express = require('express');
var session = require('express-session');

var app = Express();

var amusementRouter = require('./complex/amusementRouter');
var moarAmusementRouter = require('./complex/moarAmusementRouter');
var boringRouter = require('./complex/boringRouter');
var moarBoringRouter = require('./complex/moarBoringRouter');

var permissions = require('../../src/index.js');
var check = require('../../src/index.js').check;

var tree = require('../../src/index.js').tree;

var users = {
  //jscs: disable disallowSpaceAfterObjectKeys
  awesomeUser: {
    root: {'enter-park': true, },
    amusement: {
      'go-on-rides': true,
      'eat-popcorn': true,
      'play-games' : true,
    },
  },
  terribleUser: {
    root:{ 'enter-park': true, },
    boring: {
      'be-bored' : true,
    },
    moarBoring: {
      'be-boring': true,
    },
  },

  proprietor: 'admin',

  employee: {
    root:{ 'enter-park': true, },
    amusement: 'admin',
    boring   : 'admin',
  },

  bankruptUser: {
    root:{ 'enter-park': false, },
    boring: 'admin',
  },

  //jscs: enable
};

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

app.use(permissions({
  store: new permissions.InMemoryPermits(users),
  username: 'req.session.username',
}));

app.get('/login/:user', function(req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

app.get('/ticket-booth', check('enter-park'), function(req, res) {
  res.send('you may enter!!');
});

app.use('/park', check('enter-park'),
  amusementRouter, moarAmusementRouter, boringRouter, moarBoringRouter
);

app.get('/tree', tree, function(req, res) {
  res.json(res.locals.permissionSet);
});

// Error handler
app.use(function(err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error) {
    debugger;
    res.status(403).send('Go away!!');
  }
});

module.exports = app;

