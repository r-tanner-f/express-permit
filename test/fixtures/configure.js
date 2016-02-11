'use strict';
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
  awesomeUser: {
    permissions: {
      root: { 'enter-park': true, },
      amusement: { 'play-games': true, },
    },
    groups: [
      'someGroup',
    ],
  },
};

var groups = {
  employees: {
    amusement: 'admin',
    boring: 'admin',
  },
};

app.use(permissions({
  store: new permissions.InMemoryPermits(users, groups),
  username: 'req.session.username',
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

app.post('/createUser', api.create, function (req, res) {
  res.sendStatus(200);
});

app.get('/addPermission/:username/:suite?/:permission', api.addPermission,
function (req, res) {
  res.sendStatus(200);
});

// Error handler
app.use(function (err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error) {
    return res.status(403).send('Go away!!');
  }
  console.error(err);
  next(err);
});

module.exports = app;

