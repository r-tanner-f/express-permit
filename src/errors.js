'use strict';

var flatten = require('lodash.flattendeep');

exports.NotFound = class NotFoundError {
  constructor(message) {
    this.message = message;
  }

  toString() {
    return this.message;
  }
};

exports.Conflict = class Conflict {
  constructor(message) {
    this.message = message;
  }

  toString() {
    return this.message;
  }
};

exports.Forbidden = class PermissionsError {
  constructor(res, action, suite) {
    this.message = `Permissions Error: Required ${suite} ${action}`;
    this.name = this.constructor.name;
    this.baseUrl = res.baseUrl;
    this.route   = res.route;
    this.action  = action;
    this.suite = suite;
    this.permits = res.locals.permit;
  }
};

exports.BadRequest = class BadRequest {
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
};
