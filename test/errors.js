'use strict';

var chai      = require('chai');
var dirtyChai = require('dirty-chai');
var expect    = chai.expect;
chai.use(dirtyChai);

var async = require('async');

var expressPermit = require('../');
var BadRequest = require('../src').error.BadRequest;
var StoreWrapper = require('../src/wrapper');
var tags = require('../src/tags');
var validation = require('../src/validation');
var validators = validation.validators;

// Collect all the errors instead of the results
function reverse(callback) {
  return function (err, result) {
    callback(result, err);
  };
}

describe('Error handling:', function () {
  // Begin validation ==========================================================

  describe('Validation', function () {
    it('Error should pass single messages through', function () {
      var err = new BadRequest('just the one message!');
      expect(err.toString()).to.equal(
        'ValidationError -- just the one message!'
      );
    });

    it('of permission should require a string', function () {
      expect(validators.permission()).to.equal(
        'Permission must be a string. Got undefined'
      );
    });

    it('of suite should require a string', function () {
      expect(validators.suite()).to.equal(
        'Suite must be a string. Got undefined'
      );
    });

    it('of group should require a string', function () {
      expect(validators.group()).to.equal(
        'Group must be a string. Got undefined'
      );
    });

    it('should detect a suite that is not an object', function () {
      expect(validators.permissions({
        bad: [],
      })).to.deep.equal(
        ['Suites must be objects. Got an array']
      );

      expect(validators.permissions({ bad: 'whoops' })).to.deep.equal(
        ['Suites must be objects, or the string \'all\'. Got a string.']
      );
    });

    it('should detect a bad key value pair under permissions', function () {
      expect(validators.permissions(
        { someSuite: { bad: 'bad' } }
      )).to.deep.equal(
        ['Bad permission key/value pair. Got bad']
      );
    });
  });

  // End validation ------------------------------------------------------------

  // Begin express-permit ======================================================
  describe('express-permit', function () {
    it('should TypeError when not provided with a username function',
       function () {
         expect(expressPermit).to.throw(TypeError);
       }
      );
    it('should next(err) any store read errors', function (done) {
      var middleware = expressPermit({
        username: () => 'foo',
        store: {
          NotFoundError: function () {},

          state: 'connected',
          rsop: function (u, cb) {
            cb('Oh noes!');
          },
        },
      });

      middleware({}, { locals: {} }, function (err) {
        expect(err).to.equal('Oh noes!');
        done();
      });
    });
  });

  // End express-permit --------------------------------------------------------

  // Begin API =================================================================
  describe('API', function () {
    it(
      'should next an Error if the underlying store returns an error',
      function (done) {
        var req = {
          params: {
            username: 'foo',
          },
          permitStore: {
            read: function (u, cb) {
              cb('whoops!');
            },
          },
        };
        expressPermit.api.read(
          req,
          {
            locals: {
              permitAPI: {},
            },
          },
          function (err) {
            expect(err).to.exist();
            expect(err).to.equal('whoops!');
            done();
          }
        );
      }
    );
  });

  // End API -------------------------------------------------------------------
  //
  // Begin memory ==============================================================
  describe('In memory permit store', function () {
    var MemoryPermitStore = expressPermit.MemoryPermitStore(expressPermit);
    var memory = new MemoryPermitStore(
      {
        someUser: {
          permissions: {},
          groups: ['someGroup'],
        },
      },
      {
        someGroup: {
          someSuite: {},
        },
      }
    );

    it('should throw a TypeError if initialized improperly', function () {
      var usersArray = function () {
        new expressPermit.InMemoryPermits([]); //jshint ignore:line
      };

      var groupsArray = function () {
        new expressPermit.InMemoryPermits(undefined, []); //jshint ignore:line
      };

      expect(usersArray).to.throw(TypeError);
      expect(groupsArray).to.throw(TypeError);
    });

    it('should throw a Conflict error when creating a user that already exists',
       function (done) {
         memory.create('someUser', undefined, function (err) {
           expect(err).to.be.an.instanceof(memory.Conflict);
           expect(err.message).to.equal('User already exists');
           done();
         });
       }
    );

    it(
      'should throw a Conflict error when creating a group that already exists',
      function (done) {
        memory.createGroup('someGroup', undefined, function (err) {
          expect(err).to.be.an.instanceof(memory.Conflict);
          expect(err.message).to.equal('Group already exists');
          done();
        });
      }
    );
    it(
      'should throw a Conflict when readding a user to a group',
      function (done) {
        memory.addGroup('someUser', 'someGroup', function (err) {
          expect(err).to.be.an.instanceof(memory.Conflict);
          expect(err.message).to.equal('User is already in group');
          done();
        });
      }
    );
    it('should throw a NotFoundError when user/group is not found',
      function (done) {

        var tests = [
          callback => memory.update('notfound', undefined, reverse(callback)),
          callback => memory.destroy('notfound', reverse(callback)),
          callback => memory.addPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.removePermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.removePermission(
            'someUser', 'notfound', 'notfound', reverse(callback)
          ),
          callback => memory.removePermission(
            'someUser', 'notfound', 'someSuite', reverse(callback)
          ),
          callback => memory.blockPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.addGroup('notfound', undefined, reverse(callback)),
          callback => memory.addGroup(
            'someUser', 'notfound', reverse(callback)
          ),
          callback => memory.removeGroup(
            'notfound', undefined, reverse(callback)
          ),
          callback => memory.removeGroup(
            'someUser', 'notfound', reverse(callback)
          ),
          callback => memory.readGroup('notfound', reverse(callback)),
          callback => memory.updateGroup(
            'notfound', undefined, reverse(callback)
          ),
          callback => memory.destroyGroup('notfound', reverse(callback)),
          callback => memory.addGroupPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.removeGroupPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.removeGroupPermission(
            'someGroup', undefined, 'notfoundsuite', reverse(callback)
          ),
          callback => memory.removeGroupPermission(
            'someGroup', 'notfoundpermission', 'someSuite', reverse(callback)
          ),
          callback => memory.removeGroupPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
          callback => memory.blockGroupPermission(
            'notfound', undefined, undefined, reverse(callback)
          ),
        ];

        async.parallel(tests, function (err, result) {
          expect(err).to.not.exist();
          result.forEach(function (r, index) {
            if (!(r instanceof memory.NotFoundError)) {
              throw new Error(`Failure: ${tests[index]}. Got: ${r}}`);
            }
          });

          done();
        });
      });
  });

  // End memory ----------------------------------------------------------------

  // Begin StoreWrapper ========================================================
  describe('StoreWrapper', function () {
    var MemoryPermitStore = expressPermit.MemoryPermitStore(expressPermit);
    var store = new StoreWrapper(new MemoryPermitStore());

    it('should defer ops until store is connected', function (done) {
      this.timeout(0);
      var DeferedMemoryStore = expressPermit.MemoryPermitStore(expressPermit);
      var dcdStore = new StoreWrapper(new DeferedMemoryStore(
        {
          someUser: 'owner',
        }
      ));
      dcdStore.store.changeState('disconnected');

      dcdStore.readAll(function (err, result) {
        expect(result).to.deep.equal({ someUser: 'owner' });
        done();
      });

      setTimeout(function () {
        dcdStore.store.changeState('connected');
      }, 100);
    });

    it('should throw when no callback is supplied', function () {
      var fn = function () {store.create();};

      expect(fn).to.throw(Error, /Callback is required/);
    });

    it('should catch errors and return them in callback', function () {
      store.read({ username: 123 }, function (err) {
        expect(err).to.be.an.instanceof(BadRequest);
        expect(err).to.deep.equal({
          message: 'Username must be a string. Got a number: 123.',
        });
      });
    });
  });

  // Begin tags
  describe('Tags', function () {
    it('should throw an error if Tag is called with an invalid param',
      function () {
        var fn = function () {
          new tags.Tagger(); //jshint ignore:line
        };

        expect(fn).to.throw(Error, /invalid parameters/);
      }
    );
  });
});
