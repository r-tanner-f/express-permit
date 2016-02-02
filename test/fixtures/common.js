'use strict';

module.exports = function(router, users) {
  var permissions = require('../../src/index.js');
  var InMemoryPermits = require('../../src/index.js').InMemoryPermits;

  var Express = require('express');

  var session = require('express-session');

  var app = Express();

  app.use(session({
    secret: 'keyboard cat',
    resave: 'false',
    saveUninitialized: true,
  }));

  app.use(permissions({
    //store: new MongoPermits(options)
    store: new InMemoryPermits(users),
    username: 'req.session.username'
  }));

  app.get('/login/awesome-user', function(req, res) {
    req.session.username = 'awesome-user';
    res.send('Logged in as awesome-user');
  });

  app.get('/login/terrible-user', function(req, res) {
    req.session.username = 'terrible-user';
    res.send('Logged in as terrible-user');
  });

  app.use(router);

  // Error handler
  app.use(function(err, req, res, next) { //jshint ignore:line
    if (err !== 'Permissions Erorr') {next(err);}
    res.status(403).send('Go away!!');
  });

  return app;
};
