'use strict';

/*
 *     _    ____ ___   _____ _      _
 *    / \  |  _ \_ _| |  ___(_)_  _| |_ _   _ _ __ ___  ___
 *   / _ \ | |_) | |  | |_  | \ \/ / __| | | | '__/ _ \/ __|
 *  / ___ \|  __/| |  |  _| | |>  <| |_| |_| | | |  __/\__ \
 * /_/   \_\_|  |___| |_|   |_/_/\_\\__|\__,_|_|  \___||___/
 */

const util = require('util');

const Express = require('express');
const session = require('express-session');

const app = Express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const permissions = require('../../src/index.js');
const MemoryPermitStore = permissions.MemoryPermitStore(permissions);

const api = permissions.api;

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

const users = {
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

const groups = {
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

app.get('/login/:user', (req, res) => {
  req.session.username = req.params.user;
  res.send(`Logged in as ${req.params.user}`);
});

function ok(req, res) {
  res.sendStatus(200);
}

// readAll =====================================================================

app.get('/users', api.readAll, (req, res) => {
  res.send(res.locals.permitAPI.users);
});

app.get('/groups', api.readAllGroups, (req, res) => {
  res.send(res.locals.permitAPI.groups);
});

// Users =======================================================================

app.post('/user/:username', api.create, ok);

app.get('/user/:username', api.read, (req, res) => {
  res.send(res.locals.permitAPI.user);
});

app.get('/user/rsop/:username', api.rsop, (req, res) => {
  res.send(res.locals.permitAPI.user);
});

app.put('/user/:username', api.update, ok);
app.delete('/user/:username', api.destroy, ok);

app.get('/setAdmin/:username', api.setAdmin, ok);
app.get('/setOwner/:username', api.setOwner, ok);

// Group Operations ------------------------------------------------------------

app.get('/addGroup/:username/:group', api.addGroup, ok);
app.get('/removeGroup/:username/:group', api.removeGroup, ok);
app.put('/updateGroups/:username', api.updateGroups, ok);

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

app.post('/group/:group', api.createGroup, ok);

app.get('/group/:group', api.readGroup, (req, res) => {
  res.send(res.locals.permitAPI.group);
});

app.put('/group/:group', api.updateGroup, ok);
app.delete('/group/:group', api.destroyGroup, ok);

// Error handler
app.use((err, req, res, next) => {
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
  return next(err);
});

module.exports = app;

