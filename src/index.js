'use strict';

var clone    = require('lodash.clonedeep');
var traverse = require('traverse');

var api = require('./api/');
var tags = require('./tags');

expressPermit.tree = listSuites;
expressPermit.InMemoryPermits = require('./memoryPermits');
expressPermit.tag = tags.initTag;
expressPermit.Tagger = tags.Tagger;
expressPermit.check = tags.check;
expressPermit.error = tags.PermissionsError;
expressPermit.api = api;
module.exports = expressPermit;

class NotFoundError {
  constructor(message) {
    this.message = message;
  }

  toString() {
    return this.message;
  }
}

function expressPermit(options) {
  var store = options.store;
  options.store.NotFoundError = NotFoundError;

  return function (req, res, next) {
    res.locals.permitAPI = {};
    res.locals.permitAPI.NotFoundError = NotFoundError;
    res.locals.permitAPI.PermissionsError = tags.PermissionsError;
    res.locals.permitAPI.ValidationError = api.ValidationError;

    store.read(eval(options.username), function (err, user) { //jshint ignore:line
      if (err) {next(err);}

      if (!user) {
        req.permits = {};
      } else {
        req.permits = compilePermissions(user);
      }

      req.permitStore = store;
      next();
    });
  };
}

function compilePermissions(user) {
  let permissions = clone(user.permissions);
  if (!user.groups) {return permissions;}

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

function listSuites(req, res, next) {
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

