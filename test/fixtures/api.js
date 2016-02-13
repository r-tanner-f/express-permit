'use strict';
var util = require('util');

var Express = require('express');
var session = require('express-session');

var app = Express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

var permissions = require('../../src/index.js');
var check = permissions.check; //jshint ignore:line
var api = permissions.api;

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

var users = {
  //jscs: disable disallowSpaceAfterObjectKeys
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
};

var groups = {
  'join-me': {},
  'remove-me': {},
  'update-me': {},
  'read-me': { root: { foo: 'bar' } },
  'delete-me': {},
  'op-me': { root: { 'remove-me': true } },
};

app.use(permissions({
  store: new permissions.InMemoryPermits(users, groups),
  username: 'req.session.username',
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

function ok(req, res) {
  res.sendStatus(200);
}

app.use(api.validation);

// Users =======================================================================

app.post('/user/:username', api.create, ok);

app.get('/user/:username', api.read, function (req, res) {
  res.send(res.locals.permitAPI.result);
});

app.put('/user/:username', api.update, ok);
app.delete('/user/:username', api.destroy, ok);

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
  if (err instanceof res.locals.permitAPI.ValidationError) {
    return res.status(400).send(err.toString());
  }

  if (err instanceof res.locals.permitAPI.NotFoundError) {
    return res.status(404).send(err.toString());
  }

  if (err instanceof permissions.error) {
    return res.status(403).send('Go away!!');
  }

  console.error(util.inspect(err, { depth: null }));
  next(err);
});

module.exports = app;

