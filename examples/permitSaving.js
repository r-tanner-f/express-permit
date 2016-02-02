'use strict';

var Express = require('express');
var app = Express();

var session = require('express-session');

var permissions = require('../src/index.js');
var MemoryPermits = require('../src/index.js').MemoryPermits;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

app.use(permissions({
  //store: new MongoPermits(options)
  store: new MemoryPermits({
    'awesome-user' : {
      'have-fun' : true,
    },
    'terrible-user' : {
      'have-fun' : false,
    },
  }),
  username: 'req.session.username',
}));

app.get('/login/awesome-user', function(req, res) {
  req.session.username = 'awesome-user';
  res.send('Logged in as awesome-user');
});

app.get('/login/terrible-user', function(req, res) {
  req.session.username = 'terrible-user';
  res.send('Logged in as terrible-user');
});

app.use(require('./permitSaving/funRouter'));
app.use(require('./permitSaving/boringRouter'));

// Error handler
app.use(function(err, req, res, next) { //jshint ignore:line
  res.status(403).send('Go away!!');
});

app.listen(3000, function() {
  console.log('For a good time, go to port 3000');
});
