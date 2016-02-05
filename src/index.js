'use strict';

var traverse = require('traverse');

function expressPermit(options) {
  var store = options.store;

  return function(req, res, next) {
    var user = store.get(eval(options.username)); //jshint ignore:line
    if (!user) {
      req.permits = {};
    } else {
      req.permits = user;
    }

    next();
  };
}

class PermissionsError {
  constructor(req, action, group) {
    this.message = `Permissions Error: Required ${group} ${action}`;
    this.name = this.constructor.name;
    this.baseUrl = req.baseUrl;
    this.route   = req.route;
    this.action  = action;
    this.group   = group;
    this.permits = req.permits;
  }
}

// TODO clean up this garbage
function check(action, group) {
  if (!group) {group = 'root';}

  return function permitCheck(req, res, next) {
    // If for some reason there is no req.permits,
    // this will prevent goofy errors from happening.
    if (req.permits) {
      if (group === 'root' && req.permits[action] === true) {
        return next();
      }

      if (
        req.permits[group]                     &&
        req.permits[group][action] === true    ||
        req.permits                === 'admin' ||
        req.permits[group]         === 'admin'
      ) {
        return next();
      }
    }

    var err = new PermissionsError(req, action, group);
    next(err);
  };
}

class Tagger { //jshint ignore:line
  constructor() {

    // Three possible inputs
    // A group:
    if (typeof arguments[0] === 'string') {
      this.defaultGroup = arguments[0];
    }

    // A router:
    else if (typeof arguments[0] === 'function' && !arguments[1]) {
      this.defaultGroup = 'root';
      this.router = arguments[0];
    }

    // A router and a group:
    else if (
      typeof arguments[0] === 'function' &&
      typeof arguments[1] === 'string'
    ) {
      this.router = arguments[0];
      this.defaultGroup  = arguments[1];
    } else {
      throw new Error('Tag called with invalid parameters.\n' +
                       'Got ' + arguments[0] + ', ' + arguments[1] + '.\n' +
                       'Need a router, group, or router + group.');
    }
  }

  tag(action, group) {
    group = group ? group : this.defaultGroup;

    // If this a tracked tag
    if (this.router) {
      this._trackTag(action, group);
    }

    return check(action, group);
  }

  _trackTag(action, group) {
    group = group ? group : this.defaultGroup;
    let router = this.router;

    // If the router doesn't already have permissions on it, create a new map
    if (!router.permissions) {
      router.permissions = new Map();
    }

    let permissions = router.permissions;

    //Does the router's permissions have the group?
    if (!permissions.has(group)) {

      // Add a new set if not
      permissions.set(group, new Set([action]));
    }

    // Get the group and add the permission to the Set
    else {
      permissions.get(group).add(action);
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
  node.permissions.forEach(function(actions, group) {

    // If the map doesn't currently have that group, add it
    if (!map.has(group)) {
      map.set(group, actions);
    } else {
      // If it does have the group, combine the sets
      var set = map.get(group);
      set = new Set([...set, actions]);
    }
  });
}

function permitMap(req, res, next) {
  var map = new Map();

  scrapePermissions(req.app, map);

  traverse(req.app._router.stack).forEach(function(node) {
    scrapePermissions(node, map);
  });

  var permissionSet = {};

  map.forEach(function(set, key) {

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

function MemoryPermits(permissions) {
  this.permissions = permissions;

  this.get = id => this.permissions[id];

  this.set = function set(id, permissions) {
    this.permissions[id] = permissions;
  };
}

expressPermit.InMemoryPermits = MemoryPermits;
expressPermit.tree = permitMap;
expressPermit.tagger = Tagger;
expressPermit.check = check;
expressPermit.error = PermissionsError;

module.exports = expressPermit;
