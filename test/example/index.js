'use strict';

/*
 * _____                           _
 *| ____|_  ____ _ _ __ ___  _ __ | | ___
 *|  _| \ \/ / _` | '_ ` _ \| '_ \| |/ _ \
 *| |___ >  < (_| | | | | | | |_) | |  __/
 *|_____/_/\_\__,_|_| |_| |_| .__/|_|\___|
 *                          |_|
 */

var Express = require('express');
var session = require('express-session');

var app = Express();

var amusementRouter = require('./amusementRouter');
var moarAmusementRouter = require('./moarAmusementRouter');
var boringRouter = require('./boringRouter');
var moarBoringRouter = require('./moarBoringRouter');

var permissions = require('../../src/index.js');
var MemoryPermitStore = permissions.MemoryPermitStore(permissions);
var check = permissions.check;

var users = {
  //jscs: disable disallowSpaceAfterObjectKeys
  awesomeUser: {
    permissions: {
      root: { 'enter-park': true, },
      moarAmusement: { 'play-games': true, },
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
    permissions: 'owner',
  },

  manager: {
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
      boring: 'all',
    },
    groups: ['block-me'],
  },
};

var groups = {
  employees: {
    amusement: 'all',
    moarAmusement: 'all',
    boring: 'all',
  },
  'park-attendee': {
    amusement: {
      'go-on-rides': true,
      'eat-popcorn': true,
    },
  },
  'block-me': {
    root: { 'enter-park': true },
  },
};

//jscs: enable

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

app.use(permissions({
  store: new MemoryPermitStore(users, groups),
  username: req => req.session.username,
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

app.get('/ticket-booth', check('enter-park', 'root'), function (req, res) {
  res.send('you may enter!!');
});

app.use('/park', check('enter-park', 'root'),
  amusementRouter, moarAmusementRouter, boringRouter, moarBoringRouter
);

app.get('/tree', permissions.api.list, function (req, res) {
  res.json(res.locals.permitAPI.list);
});

// Error handler
app.use(function (err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error.Forbidden) {
    return res.status(403).send('Go away!!');
  }

  next(err);
});

module.exports = app;

