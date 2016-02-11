'use strict';

class ValidationError {
  constructor(err) {
    this.message = err;

    // If passed an array of errors, create with attached errors
    if (Array.isArray(err) && err.length > 1) {
      this.message = 'Multiple validation errors occured. See err.details.';
      this.details = err;
    }

    // If only one error in the array, simply pass the error through
    if (err.length === 1) {
      return err[0];
    }
  }
}

exports.ValidationError = ValidationError;

const validators = {
  username: u => u === typeof 'string' ? null :
    new ValidationError(
    `Username must be a string: ${u}`
    ),

  permission: p => p === typeof 'string' ? null :
    new ValidationError(
      `Permission must be a string: ${p}`
    ),

  suite: s => s === typeof 'string' ? null :
    new ValidationError(
      `Suite must be a string: ${s}`
    ),

  group: g => g === typeof 'string' ? null :
    new ValidationError(
      `Group must be a string: ${g}`
    ),

  permissions: function (p) {
    if (typeof p !== 'object' || Array.isArray(p)) {
      return new ValidationError(`Permissions must be an object: ${p}`);
    }

    for (var suite in p) {
      if (typeof p[suite] !== 'object' || Array.isArray(p[suite])) {
        return new ValidationError(`Suites must be objects: ${p[suite]}`);
      }

      for (var permission in p[suite]) {
        var notValid = validate.permissionKeyValue(p[suite][permission]);
        if (notValid) {
          return new ValidationError(
            `Bad permission key/value pair: ${p[suite][permission]}`
          );
        }
      }
    }

    if (!p.root) {
      p.root = {};
    }
  },

  permissionKeyValue: p => typeof p === 'boolean' || p === 'admin' ? null :
    new ValidationError(
      `Permission key/value pair must be boolean or 'admin': ${p}`
    ),
};

function validate(params) {
  var err = [];
  for (var key in params) {
    if (validators[key]) {
      err.push(validators[key]);
    }
  }
}

exports.middleware = function validation(req, res, next) {
  var err = Array.prototype.concat(validate(req.params), validate(req.query));
  if (req.body) {
    err.push(...validate(req.body));
  }

  // Remove all falsey values from array
  err = err.filter(function (e) {
    return Boolean(e);
  });

  if (err) {
    return next(new ValidationError(err));
  }

  next();
};

