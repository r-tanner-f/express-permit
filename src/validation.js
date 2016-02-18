'use strict';

var flatten = require('lodash.flattendeep');

class ValidationError {
  constructor(err) {
    if (!Array.isArray(err)) {
      this.message = err;
      return;
    }

    // If passed an array, add it to the details
    err = flatten(err);

    // Remove all falsey values from array
    err = err.filter(function (e) {
      return Boolean(e);
    });

    if (err.length === 1) {
      this.message = err[0];
      return;
    }

    this.message = 'Multiple validation errors occured. See err.details.';
    this.details = err;
  }

  toString() {
    return 'ValidationError -- ' + (this.details || this.message);
  }
}
exports.ValidationError = ValidationError;

const validators = {
  username: u => typeof u === 'string' ? null :
    `Username must be a string. Got ${typeof u}: ${u}`,

  permission: p => typeof p === 'string' ? null :
    `Permission must be a string. Got ${p}`,

  suite: s => typeof s === 'string' ? null : `Suite must be a string. Got ${s}`,

  group: g => typeof g === 'string' ? null : `Group must be a string. Got ${g}`,

  permissions: function (p) {
    var err = [];
    if (!p) {
      err.push(`Missing permissions: Got ${p}.`);
    }

    if (typeof p !== 'object' || Array.isArray(p)) {
      err.push(`Permissions must be an object. Got ${p}`);
    }

    for (var suite in p) {
      if (typeof p[suite] !== 'object') {
        err.push(`Suites must be objects. Got ${typeof p[suite]}`);
        return err;
      }

      if (Array.isArray(p[suite])) {
        err.push('Suites must be objects. Got an array');
        return err;
      }

      for (var permission in p[suite]) {
        var notValid = validators.permissionKeyValue(p[suite][permission]);
        if (notValid) {
          err.push(`Bad permission key/value pair. ` +
                   `Got ${p[suite][permission]}`);
        }
      }
    }

    if (err.length > 0) { return err; }

    // We will silently fix root for simplicity's sake
    if (!p.root) {
      p.root = {};
    }
  },

  permissionKeyValue: p => typeof p === 'boolean' || p === 'admin' ? null :
    `Permission key/value pair must be boolean or 'admin'. Got ${p}`,

  permit: function (p) {
    var err = [];
    if (!p) {
      err.push(`Missing permit: Got ${p}.`);
      return err;
    }

    var pErrs = validators.permissions(p.permissions);
    if (pErrs) {
      err.push(pErrs);
    }

    if (!Array.isArray(p.groups)) {
      err.push(`Groups must be an array (can be empty) Got ${p.groups}.`);
    }

    for (var key in p) {
      if (key !== 'permissions' && key !== 'groups') {
        err.push(`Unknown key in permission. Got: ${key}. ` +
                 'Only "permissions" and "groups" allowed');
      }
    }

    if (err.length) {
      return err;
    }
  },
};
exports.validators = validators;

