'use strict';

var clone    = require('lodash.clonedeep');
var traverse = require('traverse');

function expressPermit(options) {
  var store = options.store;

  return function (req, res, next) {
    store.getUser(eval(options.username), function (err, user) { //jshint ignore:line
      if (err) {next(err);}

      if (!user) {
        req.permits = {};
      } else {
        req.permits = compilePermissions(user);
      }

      next();
    });
  };
}

function compilePermissions(user) {
  let permissions = clone(user.permissions);
  if (!user.groups) {return permissions;}

  debugger;

  // This smells funny...
  for (var i = 0; i < user.groups.length; i++) {
    let group = user.groups[i];

    // If the user part of the admin group, skip everything and give them admin
    if (group === 'admin') {
      permissions = 'admin';
      break;
    }

    for (let suite in group) {
      if (permissions[suite] === 'admin') {continue;}

      if (group[suite] === 'admin') {
        permissions[suite] = 'admin';
        continue;
      }

      if (!permissions[suite]) {permissions[suite] = {};}

      for (let action in group[suite]) {

        if (action === 'admin') {

          // If user is admin of suite, give admin and continue to next suite
          permissions[suite] = 'admin';
          continue;
        }

        if (permissions[suite][action] !== false) {
          permissions[suite][action] = group[suite][action];
        }
      }
    }
  }

  return permissions;
}

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

function initTag() {
  // If params were sent backwards, be kind and rewind
  if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
    let tagger = new Tagger(arguments[1], arguments[0]);
    return tagger.tag.bind(tagger);
  }

  let tagger = new Tagger(...arguments);
  return tagger.tag.bind(tagger);
}

expressPermit.tag = initTag;

function scrapePermissions(node, map) {
  // Check if the node we're looking at is a permissions object
  if (!node || !node.permissions) {return;}

  //Iterate over the permissions Map
  node.permissions.forEach(function (actions, suite) {

    // If the map doesn't currently have that suite, add it
    if (!map.has(suite)) {
      map.set(suite, actions);
    } else {
      // If it does have the suite, combine the sets
      var set = map.get(suite);
      set = new Set([...set, actions]);
    }
  });
}

function permitMap(req, res, next) {
  var map = new Map();

  scrapePermissions(req.app, map);

  traverse(req.app._router.stack).forEach(function (node) {
    scrapePermissions(node, map);
  });

  var permissionSet = {};

  map.forEach(function (set, key) {

    // Combine _root and root.
    // Separated to differentiate between implicit and explicit root.
    // Just in case it's needed later...
    if (key === '_root') {
      key = 'root';
    }

    if (!permissionSet[key]) {
      permissionSet[key] = [];
    }

    permissionSet[key] = permissionSet[key].concat(Array.from(set));
  });

  res.locals.permissionSet = permissionSet;
  next();
}

expressPermit.InMemoryPermits = require('./memoryPermits');
expressPermit.tree = permitMap;
expressPermit.tagger = Tagger;
expressPermit.check = check;
expressPermit.error = PermissionsError;

module.exports = expressPermit;
