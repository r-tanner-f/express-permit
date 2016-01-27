'use strict';

var supertest = require('supertest');

var expressPermit = require('../src/index.js');
var MemoryPermits = require('../src/index.js').MemoryPermits;
var permit = require('../src/index.js').permit;

var Express = require('express');

var session = require('express-session');

var app = Express();
var router = Express.Router();

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

app.use(expressPermit({
  //store: new MongoPermits(options)
  store: new MemoryPermits({
    'awesome-user' : {
      'have-fun' : true,
    },
    'terrible-user' : {
      'have-fun' : false,
    },
  }),
  username: 'req.session.username'
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

describe('simple example', function () {
  it('should forbid access without session', function(done) {
    var agent = supertest.agent(app);

    agent
    .get('/')
    .expect(403, 'Go away!!', done);
  });

  it('should allow access to awesome-user', function(done) {
    var agent = supertest.agent(app);

    agent
    .get('/login/awesome-user')
    .expect(200)
    .end(function(err) {
      if (err) throw err;
      agent
      .get('/')
      .expect(200, done); 
    });
  });
  
  it('should forbid access to terrible-user', function(done) {
    var agent = supertest.agent(app);
    agent
    .get('/login/terrible-user')
    .expect(200)
    .end(function(err) {
      if (err) throw err;
      agent
      .get('/')
      .expect(403, done);
    });
  });
});

