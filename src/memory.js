'use strict';

/*
 * __  __                                 ____  _
 *|  \/  | ___ _ __ ___   ___  _ __ _   _/ ___|| |_ ___  _ __ ___
 *| |\/| |/ _ \ '_ ` _ \ / _ \| '__| | | \___ \| __/ _ \| '__/ _ \
 *| |  | |  __/ | | | | | (_) | |  | |_| |___) | || (_) | | |  __/
 *|_|  |_|\___|_| |_| |_|\___/|_|   \__, |____/ \__\___/|_|  \___|
 *                                  |___/
 */

const clone = require('lodash.clonedeep');

module.exports = function memoryStore(expressPermit) {
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
      const users = clone(this.users);
      return callback(null, users);
    }

    readAllGroups(callback) {
      const groups = clone(this.groups);
      callback(null, groups);
    }

  // Users =====================================================================

  // CRUD ----------------------------------------------------------------------
    create(username, permit, callback) {
      if (this.users[username]) {
        return callback(new this.error.Conflict('User already exists'));
      }

      this.users[username] = permit;
      return callback();
    }

    read(username, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      const user = clone(this.users[username]);
      return callback(null, user);
    }

    rsop(username, callback) {
      this.read(username, (err, user) => {
        if (err) { return callback(err); }

        if (user.groups) {
          user.groupPermissions = user.groups.map(group => this.groups[group]);
        }

        return callback(null, user);
      });
    }

    updatePermissions(username, permissions, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      this.users[username].permissions = permissions;
      return callback();
    }

    update(username, permit, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      this.users[username] = permit;
      return callback();
    }

    destroy(username, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      delete this.users[username];
      return callback();
    }

  // Group Operations ----------------------------------------------------------

    addGroup(username, group, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      if (this.users[username].groups.indexOf(group) !== -1) {
        return callback(new this.error.Conflict('User is already in group'));
      }

      if (!this.groups[group]) {
        return callback(new this.error.NotFound('Group does not exist'));
      }

      this.users[username].groups.push(group);
      return callback();
    }

    removeGroup(username, group, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      if (this.users[username].groups.indexOf(group) === -1) {
        return callback(
          new this.error.NotFound('User is not a member of group')
        );
      }

      this.users[username].groups = this.users[username].groups.filter(
          g => g !== group
      );
      return callback();
    }

    updateGroups(username, groups, callback) {
      if (!this.users[username]) {
        return callback(new this.error.NotFound('User does not exist'));
      }

      this.users[username].groups = groups;
      return callback();
    }

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
    createGroup(group, permissions, callback) {
      if (this.groups[group]) {
        return callback(new this.error.Conflict('Group already exists'));
      }

      this.groups[group] = permissions;
      return callback();
    }

    readGroup(group, callback) {
      if (!this.groups[group]) {
        return callback(new this.error.NotFound('Group does not exist'));
      }

      group = clone(this.groups[group]);

      return callback(null, group);
    }

    updateGroup(group, permissions, callback) {
      if (!this.groups[group]) {
        return callback(new this.error.NotFound('Group does not exist'));
      }

      this.groups[group] = permissions;
      return callback();
    }

    destroyGroup(group, callback) {
      if (!this.groups[group]) {
        return callback(new this.error.NotFound('Group does not exist'));
      }

      delete this.groups[group];
      return callback();
    }
  }

  return MemoryPermitStore;
};

