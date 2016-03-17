'use strict';

/*
 *     _    ____ ___   _____         _
 *    / \  |  _ \_ _| |_   _|__  ___| |_ ___
 *   / _ \ | |_) | |    | |/ _ \/ __| __/ __|
 *  / ___ \|  __/| |    | |  __/\__ \ |_\__ \
 * /_/   \_\_|  |___|   |_|\___||___/\__|___/
 */

var util           = require('util'); //jshint ignore:line

var chai      = require('chai');
var dirtyChai = require('dirty-chai');
var expect    = chai.expect;
chai.use(dirtyChai);

var supertest = require('supertest');
var rewire    = require('rewire');

var app = rewire('./fixtures/api');

function ok(test, done) {
  return function (err, result) {
    expect(result.text).to.equal('OK');
    expect(err).to.not.exist();
    if (Array.isArray(test)) {
      test.forEach((t => t(err, result)));
    } else {test(err, result);}

    done();
  };
}

describe('API', function () {
  var users = app.__get__('users');
  var groups = app.__get__('groups');
  var someUser = users.someUser;
  var agent = supertest.agent(app);

  // Validation ================================================================
  it('should puke on invalid garbage', function (done) {
    var user = {
      permit: {
        root: { 'enter-park': 'whaaaarrrrgaaarbbbllll' },
      },
    };

    agent
    .post('/user/someGuy')
    .send(user)
    .expect(400, done);
  });

  // readAll ===================================================================

  it('should read all users', function (done) {
    agent
    .get('/users')
    .expect(200)
    .end(function (err, result) {
      if (err) {throw err;}

      expect(result.body).to.deep.equal(users);
      done();
    });
  });

  it('should read all groups', function (done) {
    agent
    .get('/groups')
    .expect(200)
    .end(function (err, result) {
      if (err) {throw err;}

      expect(result.body).to.deep.equal(groups);
      done();
    });
  });

  // Users =====================================================================

  it('should create a user', function (done) {
    var body = {
      user: {
        permissions: {
          root: { 'enter-park': true },
        },
        groups: [],
      },
    };

    agent
    .post('/user/someGuy')
    .send(body)
    .expect(200)
    .end(ok(
      () => expect(users.someGuy).to.deep.equal(body.user),
      done
    ));
  });

  it('should read a user', function (done) {
    agent
    .get('/user/staticUser')
    .expect(200)
    .end(function (err, result) {
      if (err) throw err;
      expect(result.body).to.deep.equal(users.staticUser);
      done();
    });
  });

  it('should get the rsop for a user', function (done) {
    agent
    .get('/user/rsop/rsopUser')
    .expect(200)
    .end(function (err, result) {
      if (err) throw err;
      expect(result.body.permit).to.deep.equal({
        'block-test': { 'block-me': false },
        'group-test': { 'some-perm': true, 'add-me': true },
      });
      done();
    });
  });

  it('should update a user', function (done) {
    var update = {
      user: { permissions: { root: { updated: true } }, groups: [], },
    };
    agent
    .put('/user/updatableUser')
    .send(update)
    .expect(200)
    .end(function (err, result) {
      expect(result.err).to.not.exist();
      expect(err).to.not.exist();

      expect(users.updatableUser).to.deep.equal(update.user);
      done();
    });
  });

  it('should delete a user', function (done) {
    agent
    .delete('/user/deletableUser')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(users.deletableUser).to.not.exist();
      done();
    });
  });

  it('should set a user to admin'); /*,  function (done) {
    agent
    .get('/setAdmin/nonAdmin')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(users.nonAdmin.permissions).to.equal('admin');
      done();
    });
  });
 */

  it('should set a user to owner'); /*, function (done) {
    agent
    .get('/setOwner/nonOwner')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(users.nonOwner.permissions).to.equal('owner');
      done();
    });
  }); */

  // Permission Operations -----------------------------------------------------

  it('should NOT default suite', function (done) {
    agent
    .get('/addPermission/someUser/add-me')
    .expect(400)
    .end(function (err) {
      if (err) throw err;
      done();
    });
  });

  // Group Operations ----------------------------------------------------------

  it('should add a group to a user', function (done) {
    agent
    .get('/addGroup/someUser/join-me')
    .expect(200)
    .end(ok(
      () => expect(someUser.groups).to.include('join-me'),
      done
    ));
  });

  it('should remove a user from a group', function (done) {
    agent
    .get('/removeGroup/someUser/remove-me')
    .expect(200)
    .end(ok(
      () => expect(someUser.groups).to.not.include('remove-me'),
      done
    ));
  });

  it('should update a user\'s groups', function (done) {
    agent
    .put('/updateGroups/someUser')
    .send({ groups: ['updated-all'] })
    .expect(200)
    .end(ok(
      () => expect(someUser.groups).to.deep.equal(['updated-all']),
      done
    ));
  });

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
  it('should create a group', function (done) {
    var group = {
      permissions: {},
    };
    agent
    .post('/group/new-group')
    .send(group)
    .expect(200)
    .end(ok(
      () => expect(groups['new-group']).to.exist(),
      done
    ));
  });

  it('should read a group', function (done) {
    agent
    .get('/group/read-me')
    .expect(200)
    .end(function (err, result) {
      expect(err).to.not.exist();
      expect(result.body).to.deep.equal(groups['read-me']);
      done();
    });
  });

  it('should update a group', function (done) {
    var update = {
      permissions: { root: { updated: true } },
    };
    agent
    .put('/group/update-me')
    .send(update)
    .expect(200)
    .end(ok(
      () => expect(groups['update-me']).to.deep.equal(update.permissions),
      done
    ));
  });

  it('should delete a group', function (done) {
    agent
    .delete('/group/delete-me')
    .expect(200)
    .end(ok(
      () => expect(groups.deletableGroup).to.not.exist(),
      done
    ));
  });
});

