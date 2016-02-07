'use strict';

var clone = require('lodash.clonedeep');

class MemoryPermits {
  constructor(users, groups) {
    this.users = users;
    this.groups = groups;
  }

  getUser(id, callback) {
    var user = clone(this.users[id]);
    if (user && user.groups) {
      user.groups = user.groups.map(group => (this.groups[group]));
    }

    callback(null, user);
  }

  getGroup(id) {
    return this.groups[id];
  }
}

module.exports = MemoryPermits;
