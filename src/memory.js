'use strict';

var clone = require('lodash.clonedeep');

module.exports = function (expressPermit) {
  const Store = expressPermit.Store;

  class MemoryPermitStore extends Store {
    constructor(users, groups) {
      super();
      if (users && Array.isArray(users)) {
        throw new TypeError(
          'MemoryPermits constructor expected an object of users NOT an array'
        );
      }

      if (groups && Array.isArray(groups)) {
        throw new TypeError(
          'MemoryPermits constructor expected an object of groups NOT an array'
        );
      }

      this.changeState('connected');
      this.users = users   || {};
      this.groups = groups || {};
    }

  // readAll ===================================================================

    readAll(callback) {
      var users = clone(this.users);
      return callback(null, users);
    }

    readAllGroups(callback) {
      var groups = clone(this.groups);
      callback(null, groups);
    }

  // Users =====================================================================

  // CRUD ----------------------------------------------------------------------
    create(username, permit, callback) {
      if (this.users[username]) {
        return callback(new this.Conflict('User already exists'));
      }

      this.users[username] = permit;
      callback();
    }

    read(username, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      var user = clone(this.users[username]);
      callback(null, user);
    }

    rsop(username, callback) {
      this.read(username, (err, user) => {
        if (err) {return callback(err);}

        if (user.groups) {
          user.groups = user.groups.map(group => this.groups[group]);
        }

        callback(null, user);
      });
    }

    update(username, permit, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      this.users[username] = permit;
      callback();
    }

    destroy(username, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      delete this.users[username];
      callback();
    }

    setAdmin(username, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      this.users[username].permissions = 'admin';
      callback();
    }

    setOwner(username, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      this.users[username].permissions = 'owner';
      callback();
    }

  // Permission Operations -----------------------------------------------------

    addPermission(username, permission, suite, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      if (!this.users[username].permissions[suite]) {
        this.users[username].permissions[suite] = {};
      }

      this.users[username].permissions[suite][permission] = true;
      callback();
    }

    removePermission(username, permission, suite, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      if (
        !this.users[username].permissions[suite] ||
        !this.users[username].permissions[suite][permission]
      ) {
        return callback(new this.NotFoundError(
          'Suite or permission does not exist'
        ));
      }

      delete this.users[username].permissions[suite][permission];
      callback();
    }

    blockPermission(username, permission, suite, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      if (!this.users[username].permissions[suite]) {
        this.users[username].permissions[suite] = {};
      }

      this.users[username].permissions[suite][permission] = false;
      callback();
    }

  // Group Operations ----------------------------------------------------------

    addGroup(username, group, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      if (this.users[username].groups.indexOf(group) !== -1) {
        return callback(new this.Conflict('User is already in group'));
      }

      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      this.users[username].groups.push(group);
      callback();
    }

    removeGroup(username, group, callback) {
      if (!this.users[username]) {
        return callback(new this.NotFoundError('User does not exist'));
      }

      if (this.users[username].groups.indexOf(group) === -1) {
        return callback(
          new this.NotFoundError('User is not a member of group')
        );
      }

      this.users[username].groups = this.users[username].groups.filter(
        function (g) {
          return g !== group;
        }
      );
      callback();
    }

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
    createGroup(group, permissions, callback) {
      if (this.groups[group]) {
        return callback(new this.Conflict('Group already exists'));
      }

      this.groups[group] = permissions;
      callback();
    }

    readGroup(group, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      group = clone(this.groups[group]);

      callback(null, group);
    }

    updateGroup(group, permissions, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      this.groups[group] = permissions;
      callback();
    }

    destroyGroup(group, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      delete this.groups[group];
      callback();
    }

  // Permission Operations -----------------------------------------------------

    addGroupPermission(group, permission, suite, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      if (!this.groups[group][suite]) {
        this.groups[group][suite] = {};
      }

      this.groups[group][suite][permission] = true;
      callback();
    }

    removeGroupPermission(group, permission, suite, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      if (!this.groups[group][suite]) {
        return callback(new this.NotFoundError('Suite does not exist'));
      }

      if (!this.groups[group][suite][permission]) {
        return callback(new this.NotFoundError('Permission does not exist'));
      }

      delete this.groups[group][suite][permission];
      callback();
    }

    blockGroupPermission(group, permission, suite, callback) {
      if (!this.groups[group]) {
        return callback(new this.NotFoundError('Group does not exist'));
      }

      if (!this.groups[group][suite]) {
        this.groups[group][suite] = {};
      }

      this.groups[group][suite][permission] = false;
      callback();
    }
  }

  return MemoryPermitStore;
};

