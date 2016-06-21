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

function clearCache() {
  Object.keys(require.cache).forEach(key => {
    delete require.cache[key];
  });
}

const supertest     = require('supertest');
const async         = require('async');
const expect        = require('chai').expect;

const testTree      = require('./helper').testTree;
const login         = require('./helper').login;

const amusementPark = require('./example');

function test(user, tests, callback) {
  const agent = supertest.agent(amusementPark);

  login(user, agent, () => {
    const asyncTests = tests.map(t => innerCallback => {
      t(agent, (err, result) => {
        if (err) { console.log(`This got borked: ${result.req.path}`); }

        innerCallback(err, result);
      });
    });

    async.series(asyncTests, callback);
  });
}

describe('Example usage', () => {
  it('shouldn\'t break 404s', done => {
    test('awesomeUser', [
      (awesomeUser, callback) => {
        awesomeUser
        .get('/foo')
        .expect(404)
        .end(err => {
          if (err) return callback(new Error('Failed to cause 404'));
          return callback();
        });
      },
    ], err => {
      expect(err).to.not.exist();
      done();
    });
  });

  it('should handle explicit suite and root based allows',
    done => {
    test('awesomeUser', [
      (a, cb) => { a.get('/ticket-booth').expect(200, cb); },

      (a, cb) => { a.get('/park/games').expect(200, cb); },

      (a, cb) => { a.get('/park/twiddle').expect(403, cb); },

      (a, cb) => { a.get('/park/shuffle-dirt').expect(403, cb); },

      (a, cb) => { a.get('/park/look-bored').expect(403, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should allow access via group',
    done => {
    test('awesomeUser', [
      (a, cb) => { a.get('/park/rides').expect(200, cb); },

      (a, cb) => { a.get('/park/popcorn').expect(200, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should differentiate between users (sanity check)',
    done => {
    test('terribleUser', [
      (a, cb) => { a.get('/ticket-booth').expect(200, cb); },

      (a, cb) => { a.get('/park/rides').expect(403, cb); },

      (a, cb) => { a.get('/park/popcorn').expect(403, cb); },

      (a, cb) => { a.get('/park/games').expect(403, cb); },

      (a, cb) => { a.get('/park/twiddle').expect(200, cb); },

      (a, cb) => { a.get('/park/shuffle-dirt').expect(200, cb); },

      (a, cb) => { a.get('/park/look-bored').expect(200, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should allow the owner access to everything',
    done => {
    test('proprietor', [
      (a, cb) => { a.get('/ticket-booth').expect(200, cb); },

      (a, cb) => { a.get('/park/rides').expect(200, cb); },

      (a, cb) => { a.get('/park/popcorn').expect(200, cb); },

      (a, cb) => { a.get('/park/games').expect(200, cb); },

      (a, cb) => { a.get('/park/twiddle').expect(200, cb); },

      (a, cb) => { a.get('/park/shuffle-dirt').expect(200, cb); },

      (a, cb) => { a.get('/park/look-bored').expect(200, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should handle an \'all\' permission',
    done => {
    test('employee', [
      (a, cb) => { a.get('/ticket-booth').expect(200, cb); },

      (a, cb) => { a.get('/park/rides').expect(200, cb); },

      (a, cb) => { a.get('/park/popcorn').expect(200, cb); },

      (a, cb) => { a.get('/park/games').expect(200, cb); },

      (a, cb) => { a.get('/park/twiddle').expect(200, cb); },

      (a, cb) => { a.get('/park/shuffle-dirt').expect(200, cb); },

      (a, cb) => { a.get('/park/look-bored').expect(403, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should override via blocking',
    done => {
    test('bankruptUser', [
      (a, cb) => { a.get('/ticket-booth').expect(403, cb); },

      (a, cb) => { a.get('/park/rides').expect(403, cb); },

      (a, cb) => { a.get('/park/popcorn').expect(403, cb); },

      (a, cb) => { a.get('/park/games').expect(403, cb); },

      (a, cb) => { a.get('/park/twiddle').expect(403, cb); },

      (a, cb) => { a.get('/park/shuffle-dirt').expect(403, cb); },

      (a, cb) => { a.get('/park/look-bored').expect(403, cb); },
    ], err => {
      expect(err).to.not.exist();

      done();
    });
  });

  it('should produce an accurate permissions list', done => {
    clearCache();
    const clearAmusementPark = require('./example'); // eslint-disable-line global-require
    const agent = supertest.agent(clearAmusementPark);

    testTree(agent, {
      amusement: [
        'eat-popcorn',
        'go-on-rides',
      ],
      moarAmusement: [
        'play-games',
      ],
      moarBoring: [
        'be-boring',
      ],
      boring: [
        'be-bored',
      ],
      root: [
        'enter-park',
      ],
    }, done);
  });
});

