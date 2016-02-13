'use strict';
var Express = require('express');
var session = require('express-session');

var app = Express();

var amusementRouter = require('./amusementRouter');
var moarAmusementRouter = require('./moarAmusementRouter');
var boringRouter = require('./boringRouter');
var moarBoringRouter = require('./moarBoringRouter');

var permissions = require('../../src/index.js');
var check = permissions.check;
var tree = permissions.tree;

var users = {
  //jscs: disable disallowSpaceAfterObjectKeys
  awesomeUser: {
    permissions: {
      root: { 'enter-park': true, },
      amusement: { 'play-games': true, },
    },
    groups: [
      'park-attendee',
    ],
  },
  terribleUser: {
    permissions: {
      root:{ 'enter-park': true, },
      boring: {
        'be-bored': true,
      },
      moarBoring: {
        'be-boring': true,
      },
    },
  },

  proprietor: {
    permissions: 'admin',
  },

  employee: {
    permissions: {
      root:{ 'enter-park': true, },
    },
    groups: ['employees'],
  },

  bankruptUser: {
    permissions: {
      root:{ 'enter-park': false, },
      boring: 'admin',
    },
  },
};

var groups = {
  employees: {
    amusement: 'admin',
    boring: 'admin',
  },
  'park-attendee': {
    amusement: {
      'go-on-rides': true,
      'eat-popcorn': true,
    },
  },
};

//jscs: enable

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

app.use(permissions({
  store: new permissions.InMemoryPermits(users, groups),
  username: 'req.session.username',
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

app.get('/ticket-booth', check('enter-park'), function (req, res) {
  res.send('you may enter!!');
});

app.use('/park', check('enter-park'),
  amusementRouter, moarAmusementRouter, boringRouter, moarBoringRouter
);

app.get('/tree', tree, function (req, res) {
  res.json(res.locals.permissionSet);
});

// Error handler
app.use(function (err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error) {
    return res.status(403).send('Go away!!');
  }

  next(err);
});

module.exports = app;

