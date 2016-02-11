'use strict';

var clone = require('lodash.clonedeep');

class MemoryPermits {
  constructor(users, groups) {
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

    this.users = users   || {};
    this.groups = groups || {};
  }

// Users =======================================================================

// CRUD ------------------------------------------------------------------------
  create(username, permit, callback) {
    if (this.users[username]) {
      return callback(new Error('User already exists'));
    }

    this.users[username] = permit;
    callback();
  }

  read(username, callback) {
    var user = clone(this.users[username]);
    if (user && user.groups) {
      user.groups = user.groups.map(group => (this.groups[group]));
    }

    callback(null, user);
  }

  update(username, permit, callback) {
    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    this.users[username] = permit;
    callback();
  }

  destroy(username, callback) {
    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    delete this.users[username];
    callback();
  }

// Permission Operations -------------------------------------------------------

  addPermission(username, permission, suite, callback) {

    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    if (!this.users[username].permissions[suite]) {
      this.users[username].permissions[suite] = {};
    }

    this.users[username].permissions[suite][permission] = true;
    callback();
  }

  removePermission(username, permission, suite, callback) {

    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    if (
      !this.users[username].permissions[suite] ||
      !this.users[username].permissions[suite][permission]
    ) {
      return callback(new Error('Suite or permission does not exist'));
    }

    delete this.users[username].permissions[suite][permission];
    callback();
  }

  updatePermissions(username, permissions, callback) {
    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    this.users[username].permissions = permissions;
  }

  blockPermission(username, permission, suite, callback) {
    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    if (!this.users[username].permissions[suite]) {
      this.users[username].permissions[suite] = {};
    }

    this.users[username].permissions[suite][permission] = false;
    callback();
  }

// Group Operations ------------------------------------------------------------

  addGroup(username, group, callback) {
    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    if (this.users[username].groups.indexOf(group) !== -1) {
      return callback(new Error('User is already in group'));
    }

    this.users[username].groups.push(group);
  }

  removeGroup(username, group, callback) {
    if (!this.users[username]) {
      return callback(new Error('User does not exist'));
    }

    if (this.users[username].groups.indexOf(group) === -1) {
      return callback(new Error('User is not a member of group'));
    }

    this.users[username].groups = this.users[username].groups.filter(
      function (g) {
        return g !== group;
      }
    );
    callback();
  }

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------
  createGroup(username, group, permissions, callback) {
    if (this.groups[group]) {
      return callback(new Error('Group already exists'));
    }

    this.groups[group] = permissions;
    callback();
  }

  readGroup(group, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    callback(null, this.groups[group]);
  }

  updateGroup(group, permissions, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    this.groups[group] = permissions;
    callback();
  }

  destroyGroup(group, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    delete this.groups[group];
    callback();
  }

// Permission Operations -------------------------------------------------------

  addGroupPermission(group, permission, suite, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.groups[group][suite]) {
      this.groups[group][suite] = {};
    }

    this.groups[group][suite][permission] = true;
    callback();
  }

  removeGroupPermission(group, permission, suite, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.groups[group][suite]) {
      return callback(new Error('Suite does not exist'));
    }

    if (!this.groups[group][suite][permission]) {
      return callback(new Error('Permission does not exist'));
    }

    delete this.groups[group][suite][permission];
    callback();
  }

  blockGroupPermission(group, permission, suite, callback) {
    if (!this.groups[group]) {
      return callback(new Error('Group does not exist'));
    }

    // TODO move this to wrapper
    if (!suite) {
      suite = 'root';
    }

    if (!this.groups[group][suite]) {
      this.groups[group][suite] = {};
    }

    this.groups[group][suite][permission] = false;
    callback();
  }
}
module.exports = MemoryPermits;
