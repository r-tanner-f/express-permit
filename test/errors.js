'use strict';

/*
 * _____                       _____         _
 *| ____|_ __ _ __ ___  _ __  |_   _|__  ___| |_ ___
 *|  _| | '__| '__/ _ \| '__|   | |/ _ \/ __| __/ __|
 *| |___| |  | | | (_) | |      | |  __/\__ \ |_\__ \
 *|_____|_|  |_|  \___/|_|      |_|\___||___/\__|___/
 */

/* eslint-disable mocha/no-synchronous-tests */

const chai      = require('chai');
const dirtyChai = require('dirty-chai');
const expect    = chai.expect;
chai.use(dirtyChai);

const async = require('async');

const expressPermit = require('../');
const BadRequest = require('../src').error.BadRequest;
const StoreWrapper = require('../src/wrapper');
const validation = require('../src/validation');
const validators = validation.validators;

// Collect all the errors instead of the results
function reverse(callback) {
  return (err, result) => {
    callback(result, err);
  };
}

describe('Error handling:', () => {
  // Begin validation ==========================================================

  describe('Validation', () => {
    it('Error should pass single messages through', () => {
      const err = new BadRequest('just the one message!');
      expect(err.toString()).to.equal(
        'ValidationError -- just the one message!'
      );
    });

    it('of permission should require a string', () => {
      expect(validators.permission()).to.equal(
        'Permission must be a string. Got undefined'
      );
    });

    it('of suite should require a string', () => {
      expect(validators.suite()).to.equal(
        'Suite must be a string. Got undefined'
      );
    });

    it('of group should require a string', () => {
      expect(validators.group()).to.equal(
        'Group must be a string. Got undefined'
      );
    });

    it('should detect a suite that is not an object', () => {
      expect(validators.permissions({
        bad: [],
      })).to.deep.equal(
        ['Suites must be objects. Got an array']
      );

      expect(validators.permissions({ bad: 'whoops' })).to.deep.equal(
        [
          'Suites must be objects, or the string \'all\'. ' +
          'Got the string whoops.',
        ]
      );
    });

    it('should detect a bad key value pair under permissions', () => {
      expect(validators.permissions(
        { someSuite: { bad: 'bad' } }
      )).to.deep.equal(
        ['Bad permission key/value pair. Got bad']
      );
    });
  });

  // End validation ------------------------------------------------------------

  // Begin express-permit ======================================================
  describe('express-permit', () => {
    it('should TypeError when not provided with a username function',
       () => {
         expect(expressPermit).to.throw(TypeError);
       }
      );
    it('should next(err) any store read errors', done => {
      const middleware = expressPermit({
        username: () => 'foo',
        store: {
          error: {
            NotFound: () => {},
          },
          state: 'connected',
          rsop: (u, cb) => {
            cb('Oh noes!');
          },
        },
      });

      middleware({}, { locals: {} }, err => {
        expect(err).to.equal('Oh noes!');
        done();
      });
    });
  });

  // End express-permit --------------------------------------------------------

  // Begin API =================================================================
  describe('API', () => {
    it(
      'should next an Error if the underlying store returns an error',
      done => {
        const req = {
          query: {},
          params: {
            username: 'foo',
          },
          permitStore: {
            read: (u, cb) => {
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
          err => {
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
  describe('In memory permit store', () => {
    const MemoryPermitStore = expressPermit.MemoryPermitStore(expressPermit);
    const memory = new MemoryPermitStore(
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

    it('should throw a TypeError if initialized improperly', () => {
      const usersArray = () => {
        new expressPermit.InMemoryPermits([]); // eslint-disable-line no-new
      };

      const groupsArray = () => {
        new expressPermit.InMemoryPermits(undefined, []); // eslint-disable-line no-new
      };

      expect(usersArray).to.throw(TypeError);
      expect(groupsArray).to.throw(TypeError);
    });

    it('should throw a Conflict error when creating a user that already exists',
       done => {
         memory.create('someUser', undefined, err => {
           expect(err).to.be.an.instanceof(memory.error.Conflict);
           expect(err.message).to.equal('User already exists');
           done();
         });
       }
    );

    it(
      'should throw a Conflict error when creating a group that already exists',
      done => {
        memory.createGroup('someGroup', undefined, err => {
          expect(err).to.be.an.instanceof(memory.error.Conflict);
          expect(err.message).to.equal('Group already exists');
          done();
        });
      }
    );
    it(
      'should throw a Conflict when readding a user to a group',
      done => {
        memory.addGroup('someUser', 'someGroup', err => {
          expect(err).to.be.an.instanceof(memory.error.Conflict);
          expect(err.message).to.equal('User is already in group');
          done();
        });
      }
    );
    it('should throw a NotFound when user/group is not found',
      done => {
        const tests = [
          callback => memory.update('notfound', undefined, reverse(callback)),
          callback => memory.destroy('notfound', reverse(callback)),
          callback => memory.updatePermissions(
            'notfound', undefined, reverse(callback)
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
        ];

        async.parallel(tests, (err, result) => {
          expect(err).to.not.exist();
          result.forEach((r, index) => {
            if (!(r instanceof memory.error.NotFound)) {
              throw new Error(`Failure: ${tests[index]}. Got: ${r}}`);
            }
          });

          done();
        });
      });
  });

  // End memory ----------------------------------------------------------------

  // Begin StoreWrapper ========================================================
  describe('StoreWrapper', () => {
    const MemoryPermitStore = expressPermit.MemoryPermitStore(expressPermit);
    const store = new StoreWrapper(new MemoryPermitStore());

    it('should defer ops until store is connected', function deferTest(done) {
      this.timeout(0);
      const DeferedMemoryStore = expressPermit.MemoryPermitStore(expressPermit);
      const dcdStore = new StoreWrapper(new DeferedMemoryStore(
        {
          someUser: 'owner',
        }
      ));
      dcdStore.store.changeState('disconnected');

      dcdStore.readAll((err, result) => {
        expect(result).to.deep.equal({ someUser: 'owner' });
        done();
      });

      setTimeout(() => {
        dcdStore.store.changeState('connected');
      }, 100);
    });

    it('should throw when no callback is supplied', () => {
      const fn = () => store.create();

      expect(fn).to.throw(Error, /Callback is required/);
    });

    it('should catch errors and return them in callback', () => {
      store.read({ username: 123 }, err => {
        expect(err).to.be.an.instanceof(BadRequest);
        expect(err).to.deep.equal({
          message: 'Username must be a string. Got a number: 123.',
        });
      });
    });
  });
});
