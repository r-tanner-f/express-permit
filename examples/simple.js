'use strict';

var Express = require('express');
var app = Express();
var router = Express.Router();

var session = require('express-session');

var permissions = require('../src/index.js');
var MemoryPermits = require('../src/index.js').MemoryPermits;
var permit = require('../src/index.js').permit;

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

router.get('/', permit('have-fun'), function(req, res) {
  res.send('yaaay');
});

router.get('/login/awesome-user', function(req, res) {
  req.session.username = 'awesome-user';
  res.send('Logged in as awesome-user');
});

router.get('/login/terrible-user', function(req, res) {
  req.session.username = 'terrible-user';
  res.send('Logged in as terrible-user');
});

app.use(router);

// Error handler
app.use(function(err, req, res, next) { //jshint ignore:line
  res.status(403).send('Go away!!');
});

app.listen(3000, function() {
  console.log('For a good time, go to port 3000');
});
