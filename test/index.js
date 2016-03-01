'use strict';

/*
 * _____                           _        _____         _
 *| ____|_  ____ _ _ __ ___  _ __ | | ___  |_   _|__  ___| |_ ___
 *|  _| \ \/ / _` | '_ ` _ \| '_ \| |/ _ \   | |/ _ \/ __| __/ __|
 *| |___ >  < (_| | | | | | | |_) | |  __/   | |  __/\__ \ |_\__ \
 *|_____/_/\_\__,_|_| |_| |_| .__/|_|\___|   |_|\___||___/\__|___/
 *                          |_|
 *
 * This file contains unit tests covering most functions of express-permit,
 * aside from the API functions. Fixtures are under test/example/*.js.
 */

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

  it('should handle explicit suite and root based allows',
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

  it('should allow access via group',
    function (done) {
    test('awesomeUser', [
      (a, cb) => {a.get('/park/rides').expect(200, cb);},

      (a, cb) => {a.get('/park/popcorn').expect(200, cb);},
    ], function (err) {
      if (err) {throw err;}

      done();
    });
  });

  it('should differentiate between users (sanity check)',
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

  it('should allow the owner access to everything',
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

  it('should handle an \'all\' permission',
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

  it('should override via blocking',
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
      moarAmusement: [
        'play-games',
      ],
      boring: [
        'be-bored',
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
