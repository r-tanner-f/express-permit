'use strict';

var supertest      = require('supertest');
var expect         = require('chai').expect;

var async          = require('async');

var simple         = require('./fixtures/simple');
var group          = require('./fixtures/group');
var trackedSimple  = require('./fixtures/trackedSimple');
var trackedGroup   = require('./fixtures/trackedGroup');

var amusementPark  = require('./fixtures/complex');

var sharedBehavior = require('./fixtures/sharedBehavior.js');

describe('Troubleshooting Tests: ', function() {
  describe('Simple use', function() {
    sharedBehavior(simple);
  });

  describe('Group use', function() {
    sharedBehavior(group);
  });

  describe('Tracked simple use', function() {
    sharedBehavior(trackedSimple);
    it('should create a permissions tree', function(done) {
      var agent = supertest.agent(trackedSimple);

      var expectedSimpleMap = {root: ['haveFun']};
      testTree(agent, expectedSimpleMap, done);
    });
  });

  describe('Tracked group use', function() {
    sharedBehavior(trackedGroup);
    it('should create a permissions tree', function(done) {
      var agent = supertest.agent(trackedGroup);
      var expectedSimpleMap = {amusement: ['haveFun']};
      testTree(agent, expectedSimpleMap, done);
    });
  });
});

describe('Complex use', function() {
  it('shouldn\'t break 404s', function(done) {

    test('awesomeUser', [
      function(awesomeUser, callback) {
        awesomeUser
        .get('/foo')
        .expect(404)
        .end(function(err) {
          if (err) return callback(new Error('Failed to cause 404'));
          callback();
        });
      },
    ], function(err) {
      if (err) throw err;
      done();
    });
  });

  // jscs:disable requirePaddingNewLinesAfterBlocks
  it('should allow awesomeUser access to amusement & deny boredeom',
    function(done) {
    test('awesomeUser', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},
      (a, cb) => {a.get('/park/rides').expect(200, cb);},
      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},
      (a, cb) => {a.get('/park/games').expect(200, cb);},
      (a, cb) => {a.get('/park/twiddle').expect(403, cb);},
      (a, cb) => {a.get('/park/shuffle-dirt').expect(403, cb);},
      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function(err) {
      if (err) {throw err;}
      done();
    });
  });

  it('should allow terribleUser access to bored & deny amusement',
    function(done) {
    test('terribleUser', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},
      (a, cb) => {a.get('/park/rides').expect(403, cb);},
      (a, cb) => {a.get('/park/popcorn').expect(403, cb);},
      (a, cb) => {a.get('/park/games').expect(403, cb);},
      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},
      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},
      (a, cb) => {a.get('/park/look-bored').expect(200, cb);},
    ], function(err) {
      if (err) {throw err;}
      done();
    });
  });

  it('should allow the proprietor access to everything',
    function(done) {
    test('proprietor', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},
      (a, cb) => {a.get('/park/rides').expect(200, cb);},
      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},
      (a, cb) => {a.get('/park/games').expect(200, cb);},
      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},
      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},
      (a, cb) => {a.get('/park/look-bored').expect(200, cb);},
    ], function(err) {
      if (err) {throw err;}
      done();
    });
  });

  it('should allow the employee access to everything except look-bored',
    function(done) {
    test('employee', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},
      (a, cb) => {a.get('/park/rides').expect(200, cb);},
      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},
      (a, cb) => {a.get('/park/games').expect(200, cb);},
      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},
      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},
      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function(err) {
      if (err) {throw err;}
      done();
    });
  });

  it('should deny bankruptUser access to the park',
    function(done) {
    test('bankruptUser', [
      (a, cb) => {a.get('/ticket-booth').expect(403, cb);},
      (a, cb) => {a.get('/park/rides').expect(403, cb);},
      (a, cb) => {a.get('/park/popcorn').expect(403, cb);},
      (a, cb) => {a.get('/park/games').expect(403, cb);},
      (a, cb) => {a.get('/park/twiddle').expect(403, cb);},
      (a, cb) => {a.get('/park/shuffle-dirt').expect(403, cb);},
      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function(err) {
      if (err) {throw err;}
      done();
    });
  });

  // jscs:enable

  it.only('should produce an accurate permissions lsit', function(done) {
    var agent = supertest.agent(amusementPark);

    testTree(agent, {
      amusement: [
        'go-on-rides',
        'eat-popcorn',
      ],
      boring: [
        'be-bored',
      ],
      moarBoring: [
        'be-boring',
      ],
    }, done);
  });

});

function test(user, tests, callback) {
  var agent = supertest.agent(amusementPark);

  login(user, agent, function() {
    let asyncTests = tests.map(function(test) {
      return function(callback) {
        test(agent, function(err, result) {
          if (err) {console.log(`This got borked: ${result.req.path}`);}

          callback(err, result);
        });
      };
    });

    async.series(asyncTests, callback);
  });
}

function testTree(agent, expectedTree, done) {
  login('awesome-user', agent, function() {
    agent
    .get('/tree')
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body).to.deep.equal(expectedTree);
      done();
    });
  });
}

function login(user, agent, callback) {
  agent
  .get('/login/' + user)
  .expect(200)
  .end(function(err) {
    if (err) throw err;
    callback();
  });
}
