'use strict';

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

  // Users =====================================================================

  it('should create a user', function (done) {
    var user = {
      permit: {
        permissions: {
          root: { 'enter-park': true },
        },
        groups: [],
      },
    };

    agent
    .post('/user/someGuy')
    .send(user)
    .expect(200)
    .end(ok(
      () => expect(users.someGuy).to.deep.equal(user.permit),
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

  it('should update a user', function (done) {
    var update = {
      permit: { permissions: { root: { updated: true } }, groups: [], },
    };
    agent
    .put('/user/updatableUser')
    .send(update)
    .expect(200)
    .end(function (err, result) {
      expect(result.err).to.not.exist();
      expect(err).to.not.exist();

      expect(users.updatableUser).to.deep.equal(update.permit);
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

  // Permission Operations -----------------------------------------------------

  it('should add a root permission to a user', function (done) {
    agent
    .get('/addPermission/someUser/add-me')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(someUser.permissions.root['add-me']).to.be.true();
      done();
    });
  });

  it('should add a suite permission to a user', function (done) {
    agent
    .get('/addPermission/someUser/suite/add-me')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(someUser.permissions.suite['add-me']).to.be.true();
      done();
    });
  });

  it('should remove a root permission from user', function (done) {
    agent
    .get('/removePermission/someUser/delete-me')
    .expect(200)
    .end(function (err) {
      if (err) throw err;
      expect(someUser.permissions.root['delete-me']).to.not.exist();
      done();
    });
  });

  it('should block a root permission to a user', function (done) {
    agent
    .get('/blockPermission/someUser/block-me/')
    .expect(200)
    .end(ok(
      () => expect(someUser.permissions.root['block-me']).to.equal(false),
      done
    ));
  });

  it('should block a suite permission to a user', function (done) {
    agent
    .get('/blockPermission/someUser/suite/block-me/')
    .expect(200)
    .end(ok(
      () => expect(someUser.permissions.suite['block-me']).to.equal(false),
      done
    ));
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

  // Permission Operations -----------------------------------------------------

  it('should add a permission to a group', function (done) {
    agent
    .get('/addGroupPermission/op-me/suite/add-me')
    .expect(200)
    .end(ok(
      () => expect(groups['op-me'].suite['add-me']).to.be.true(),
      done
    ));
  });

  it('should remove a permission from a group', function (done) {
    agent
    .get('/removeGroupPermission/op-me/remove-me')
    .expect(200)
    .end(ok(
      () => expect(groups['op-me'].root['remove-me']).to.not.exist(),
      done
    ));
  });

  it('should block a group from a permission', function (done) {
    agent
    .get('/blockGroupPermission/op-me/suite/block-me')
    .expect(200)
    .end(ok(
      () => expect(groups['op-me'].suite['block-me']).to.be.false(),
      done
    ));
  });
});
