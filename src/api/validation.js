'use strict';

var flatten = require('lodash.flattendeep');

class ValidationError {
  constructor(err) {

    // If passed an array, add it to the details
    if (Array.isArray(err)) {
      err = flatten(err);

      // Remove all falsey values from array
      err = err.filter(function (e) {
        return Boolean(e);
      });

      if (err.length > 1) {
        this.message = 'Multiple validation errors occured. See err.details.';
        this.details = err;
        return;
      }

      // If passed only one message, just make it the message
      err = err[0];
    }

    this.message = err;
    if (!this.message) {
      debugger; //jshint ignore:line
      throw 'Missing ValidationError message';
    }
  }

  toString() {
    return 'ValidationError -- ' + (this.details || this.message);
  }
}

exports.ValidationError = ValidationError;

const validators = {
  username: u => u === typeof 'string' ? null :
    `Username must be a string. Got ${u}`,

  permission: p => p === typeof 'string' ? null :
    `Permission must be a string. Got ${p}`,

  suite: s => s === typeof 'string' ? null : `Suite must be a string. Got ${s}`,

  group: g => g === typeof 'string' ? null : `Group must be a string. Got ${g}`,

  permissions: function (p) {
    var err = [];
    if (!p) {
      err.push(`Missing permissions: Got ${p}.`);
    }

    if (typeof p !== 'object' || Array.isArray(p)) {
      err.push(`Permissions must be an object. Got ${p}`);
    }

    for (var suite in p) {
      if (typeof p[suite] !== 'object' || Array.isArray(p[suite])) {
        err.push(`Suites must be objects. Got ${p[suite]}`);
      }

      for (var permission in p[suite]) {
        var notValid = validators.permissionKeyValue(p[suite][permission]);
        if (notValid) {
          err.push(`Bad permission key/value pair.` +
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

    if (err) {
      return err;
    }
  },
};

function validate(params, puke) {
  var err = [];
  for (var key in params) {
    if (!validators[key] && puke) {
      throw new Error(`No validator for key: ${key}`);
    }

    if (validators[key]) {
      err.push(validators[key](params[key]));
    }
  }

  if (err) {return err;}
}

exports.middleware = function validation(req, res, next) {
  var err = Array.prototype.concat(
    validate(req.params, true),
    validate(req.query, true)
  );

  if (req.body) {
    err.push(...validate(req.body, true));
  }

  err = flatten(err);

  // Remove all falsey values from array
  err = err.filter(function (e) {
    return Boolean(e);
  });

  if (err.length > 0) {
    return next(new ValidationError(err));
  }

  next();
};

