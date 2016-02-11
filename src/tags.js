'use strict';

class PermissionsError {
  constructor(req, action, suite) {
    this.message = `Permissions Error: Required ${suite} ${action}`;
    this.name = this.constructor.name;
    this.baseUrl = req.baseUrl;
    this.route   = req.route;
    this.action  = action;
    this.suite = suite;
    this.permits = req.permits;
  }
}
exports.PermissionsError = PermissionsError;

class Tagger { //jshint ignore:line
  constructor() {

    // Three possible inputs
    // A suite:
    if (typeof arguments[0] === 'string') {
      this.defaultSuite = arguments[0];
    }

    // A router:
    else if (typeof arguments[0] === 'function' && !arguments[1]) {
      this.defaultSuite = 'root';
      this.router = arguments[0];
    }

    // A router and a suite:
    else if (
      typeof arguments[0] === 'function' &&
      typeof arguments[1] === 'string'
    ) {
      this.router = arguments[0];
      this.defaultSuite = arguments[1];
    } else {
      throw new Error('Tag called with invalid parameters.\n' +
                       'Got ' + arguments[0] + ', ' + arguments[1] + '.\n' +
                       'Need a router, suite, or router + suite.');
    }
  }

  tag(action, suite) {
    suite = suite ? suite : this.defaultSuite;

    // If this a tracked tag
    if (this.router) {
      this._trackTag(action, suite);
    }

    return check(action, suite);
  }

  _trackTag(action, suite) {
    suite = suite ? suite : this.defaultSuite;
    let router = this.router;

    // If the router doesn't already have permissions on it, create a new map
    if (!router.permissions) {
      router.permissions = new Map();
    }

    let permissions = router.permissions;

    //Does the router's permissions have the suite?
    if (!permissions.has(suite)) {

      // Add a new set if not
      permissions.set(suite, new Set([action]));
    }

    // Get the suite and add the permission to the Set
    else {
      permissions.get(suite).add(action);
    }
  }
}
exports.Tagger = Tagger;

// TODO clean up this garbage
function check(action, suite) {
  if (!suite) {suite = 'root';}

  return function permitCheck(req, res, next) {
    // If for some reason there is no req.permits,
    // this will prevent goofy errors from happening.
    if (req.permits) {
      if (suite === 'root' && req.permits[action] === true) {
        return next();
      }

      if (
        req.permits[suite]                     &&
        req.permits[suite][action] === true    ||
        req.permits                === 'admin' ||
        req.permits[suite]         === 'admin'
      ) {
        return next();
      }
    }

    var err = new PermissionsError(req, action, suite);
    next(err);
  };
}

exports.check = check;

function initTag() {
  // If params were sent backwards, be kind and rewind
  if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
    let tagger = new Tagger(arguments[1], arguments[0]);
    return tagger.tag.bind(tagger);
  }

  let tagger = new Tagger(...arguments);
  return tagger.tag.bind(tagger);
}

exports.initTag = initTag;

