'use strict';

var supertest     = require('supertest');
var async         = require('async');

var testTree      = require('./helper').testTree;
var login         = require('./helper').login;
var amusementPark = require('./example');

describe('Example usage', function () {
  it('shouldn\'t break 404s', function (done) {

    test('awesomeUser', [
      function (awesomeUser, callback) {
        awesomeUser
        .get('/foo')
        .expect(404)
        .end(function (err) {
          if (err) return callback(new Error('Failed to cause 404'));
          callback();
        });
      },
    ], function (err) {
      if (err) throw err;
      done();
    });
  });

  it('should allow awesomeUser access to amusement & deny boredeom',
    function (done) {
    test('awesomeUser', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},

      (a, cb) => {a.get('/park/games').expect(200, cb);},

      (a, cb) => {a.get('/park/twiddle').expect(403, cb);},

      (a, cb) => {a.get('/park/shuffle-dirt').expect(403, cb);},

      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should allow awesomeUser access based on group',
    function (done) {
    test('awesomeUser', [
      (a, cb) => {a.get('/park/rides').expect(200, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should allow terribleUser access to bored & deny amusement',
    function (done) {
    test('terribleUser', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},

      (a, cb) => {a.get('/park/rides').expect(403, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(403, cb);},

      (a, cb) => {a.get('/park/games').expect(403, cb);},

      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},

      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},

      (a, cb) => {a.get('/park/look-bored').expect(200, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should allow the proprietor access to everything',
    function (done) {
    test('proprietor', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},

      (a, cb) => {a.get('/park/rides').expect(200, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},

      (a, cb) => {a.get('/park/games').expect(200, cb);},

      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},

      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},

      (a, cb) => {a.get('/park/look-bored').expect(200, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should allow the employee access to everything except look-bored',
    function (done) {
    test('employee', [
      (a, cb) => {a.get('/ticket-booth').expect(200, cb);},

      (a, cb) => {a.get('/park/rides').expect(200, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},

      (a, cb) => {a.get('/park/games').expect(200, cb);},

      (a, cb) => {a.get('/park/twiddle').expect(200, cb);},

      (a, cb) => {a.get('/park/shuffle-dirt').expect(200, cb);},

      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should deny bankruptUser access to the park',
    function (done) {
    test('bankruptUser', [
      (a, cb) => {a.get('/ticket-booth').expect(403, cb);},

      (a, cb) => {a.get('/park/rides').expect(403, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(403, cb);},

      (a, cb) => {a.get('/park/games').expect(403, cb);},

      (a, cb) => {a.get('/park/twiddle').expect(403, cb);},

      (a, cb) => {a.get('/park/shuffle-dirt').expect(403, cb);},

      (a, cb) => {a.get('/park/look-bored').expect(403, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should produce an accurate permissions list', function (done) {
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

  login(user, agent, function () {
    let asyncTests = tests.map(function (test) {
      return function (callback) {
        test(agent, function (err, result) {
          if (err) {console.log(`This got borked: ${result.req.path}`);}

          callback(err, result);
        });
      };
    });

    async.series(asyncTests, callback);
  });
}
