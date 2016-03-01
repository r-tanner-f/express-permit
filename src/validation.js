'use strict';

/*
 *__     __    _ _     _       _   _
 *\ \   / /_ _| (_) __| | __ _| |_(_) ___  _ __
 * \ \ / / _` | | |/ _` |/ _` | __| |/ _ \| '_ \
 *  \ V / (_| | | | (_| | (_| | |_| | (_) | | | |
 *   \_/ \__,_|_|_|\__,_|\__,_|\__|_|\___/|_| |_|
 */

const flatten = require('lodash.flattendeep');
const BadRequest = require('./errors').BadRequest;

// Parameters required for operations
const descriptors = {

  // Users =====================================================================
  create: ['username', 'user'],

  read: ['username'],

  rsop: ['username'],

  update: ['username', 'user'],

  destroy: ['username'],

  setAdmin: ['username'],

  setOwner: ['username'],

  // Permission Operations -----------------------------------------------------
  addPermission: ['username', 'permission', 'suite'],

  removePermission: ['username', 'permission', 'suite'],

  blockPermission: ['username', 'permission', 'suite'],

  // Group Operations ----------------------------------------------------------
  addGroup: ['username', 'group'],

  removeGroup: ['username', 'group'],

  // Groups:===================================================================

  // CRUD ----------------------------------------------------------------------

  createGroup: ['group', 'permissions'],

  readGroup: ['group'],

  updateGroup: ['group', 'permissions'],

  destroyGroup: ['group'],

  // Permission Operations -----------------------------------------------------

  addGroupPermission: ['group', 'permission', 'suite'],

  removeGroupPermission: ['group', 'permission', 'suite'],

  blockGroupPermission: ['group', 'permission', 'suite'],
};

// Validators for each parameter
const validators = {
  username: u => typeof u === 'string' ? null :
    `Username must be a string. Got a ${typeof u}: ${u}.`,

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
      if (typeof p[suite] !== 'object' && p[suite] !== 'all') {
        err.push(`Suites must be objects, or the string 'all'. ` +
                 `Got a ${typeof p[suite]}.`);
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

  },

  permissionKeyValue: p =>
    typeof p === 'boolean' ? null :
    `Permission key/value pair must be boolean. Got ${p}`,

  user: function (p) {
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

// Validate an operation.
function validateOp(op, args) {

  // Get our list of parameters from the op descriptors.
  var params = descriptors[op];

  var err = [];

  // Iterate over each param we need
  params.forEach(function (param) {
    // If we don't have the required param then create an error string.
    if (!args[param]) {
      err.push(`Missing required parameter: ${param}`);
    } else {
      err.push(validators[param](args[param]));
    }

  });

  // Certain validators return an array; flatten these.
  err = flatten(err);

  // Remove all falsey values from array -- validators return null if no err.
  err = err.filter(function (e) {
    return Boolean(e);
  });

  // If we have any errs, wrap them in a ValidationError and return.
  if (err.length) {
    return new BadRequest(err);
  }
}

exports.validators = validators;
exports.validateOp = validateOp;
