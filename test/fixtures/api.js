'use strict';

/*
 *     _    ____ ___   _____ _      _
 *    / \  |  _ \_ _| |  ___(_)_  _| |_ _   _ _ __ ___  ___
 *   / _ \ | |_) | |  | |_  | \ \/ / __| | | | '__/ _ \/ __|
 *  / ___ \|  __/| |  |  _| | |>  <| |_| |_| | | |  __/\__ \
 * /_/   \_\_|  |___| |_|   |_/_/\_\\__|\__,_|_|  \___||___/
 */

var util = require('util');

var Express = require('express');
var session = require('express-session');

var app = Express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

var permissions = require('../../src/index.js');
var MemoryPermitStore = permissions.MemoryPermitStore(permissions);

var api = permissions.api;

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

var users = {
  //jscs: disable disallowSpaceAfterObjectKeys
  rsopUser: {
    permissions: {
      'block-test': { 'block-me': true },
      'group-test': { 'some-perm': true },
    },
    groups: ['rsop-me'],
  },
  someUser: {
    permissions: {
      root: { 'delete-me': true, 'block-me': true },
      suite: { 'delete-me': true, 'block-me': true },
    },
    groups: [
      'remove-me',
    ],
  },
  staticUser: {
    permissions: {
      root: { nochanges: true },
    },
  },
  updatableUser: {},
  deletableUser: {},
  nonAdmin: {},
  nonOwner: {},
};

var groups = {
  'join-me': {},
  'remove-me': {},
  'update-me': {},
  'read-me': { root: { foo: 'bar' } },
  'rsop-me': {
    'block-test': {
      'block-me': false,
    },
    'group-test': {
      'add-me': true,
    },
  },
  'delete-me': {},
  'op-me': { root: { 'remove-me': true } },
};

app.use(permissions({
  store: new MemoryPermitStore(users, groups),
  username: req => req.session.username,
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

function ok(req, res) {
  res.sendStatus(200);
}

// readAll =====================================================================

app.get('/users', api.readAll, function (req, res) {
  res.send(res.locals.permitAPI.users);
});

app.get('/groups', api.readAllGroups, function (req, res) {
  res.send(res.locals.permitAPI.groups);
});

// Users =======================================================================

app.post('/user/:username', api.create, ok);

app.get('/user/:username', api.read, function (req, res) {
  res.send(res.locals.permitAPI.result);
});

app.get('/user/rsop/:username', api.rsop, function (req, res) {
  res.send(res.locals.permitAPI.result);
});

app.put('/user/:username', api.update, ok);
app.delete('/user/:username', api.destroy, ok);

app.get('/setAdmin/:username', api.setAdmin, ok);
app.get('/setOwner/:username', api.setOwner, ok);

// Permission Operations -------------------------------------------------------

app.get('/addPermission/:username/:suite?/:permission', api.addPermission, ok);
app.get(
  '/removePermission/:username/:suite?/:permission',
  api.removePermission, ok
);
app.get(
  '/blockPermission/:username/:suite?/:permission', api.blockPermission, ok
);

// Group Operations ------------------------------------------------------------

app.get('/addGroup/:username/:group', api.addGroup, ok);
app.get('/removeGroup/:username/:group', api.removeGroup, ok);

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

app.post('/group/:group', api.createGroup, ok);

app.get('/group/:group', api.readGroup, function (req, res) {
  res.send(res.locals.permitAPI.result);
});

app.put('/group/:group', api.updateGroup, ok);
app.delete('/group/:group', api.destroyGroup, ok);

// Permission Operations -------------------------------------------------------
app.get(
  '/addGroupPermission/:group/:suite?/:permission', api.addGroupPermission, ok
);
app.get(
  '/removeGroupPermission/:group/:suite?/:permission',
  api.removeGroupPermission, ok
);
app.get(
  '/blockGroupPermission/:group/:suite?/:permission',
  api.blockGroupPermission,
  ok
);

// Error handler
app.use(function (err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error.BadRequest) {
    return res.status(400).send(err.toString());
  }

  if (err instanceof permissions.error.NotFound) {
    return res.status(404).send(err.toString());
  }

  if (err instanceof permissions.error.Forbidden) {
    return res.status(403).send('Go away!!');
  }

  console.error(util.inspect(err, { depth: null }));
  next(err);
});

module.exports = app;

