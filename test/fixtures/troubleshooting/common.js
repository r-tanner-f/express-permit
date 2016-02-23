'use strict';

module.exports = function (router, users) {
  var permissions = require('../../../src/index.js');
  var MemoryPermitStore = permissions.MemoryPermitStore(permissions);

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
    store: new MemoryPermitStore(users),
    username: req => req.session.username,
  }));

  app.get('/login/awesome-user', function (req, res) {
    req.session.username = 'awesomeUser';
    res.send('Logged in as awesomeUser');
  });

  app.get('/login/terrible-user', function (req, res) {
    req.session.username = 'terribleUser';
    res.send('Logged in as terribleUser');
  });

  app.use(router);

  // Error handler
  app.use(function (err, req, res, next) { //jshint ignore:line
    if (err instanceof permissions.error.Forbidden) {
      return res.status(403).send('Go away!!');
    }

    next(err);
  });

  return app;
};
