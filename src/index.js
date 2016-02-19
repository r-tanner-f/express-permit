'use strict';

var clone    = require('lodash.clonedeep');
var traverse = require('traverse');

var api = require('./api');
var tags = require('./tags');
var validation = require('./validation');
var StoreWrapper = require('./store').wrapper;

expressPermit.tree = listSuites;
expressPermit.InMemoryPermits = require('./memory');
expressPermit.tag = tags.initTag;
expressPermit.Tagger = tags.Tagger;
expressPermit.check = tags.check;
expressPermit.error = tags.PermissionsError;
expressPermit.api = api;
module.exports = expressPermit;

function expressPermit(options) {
  if (typeof options.username !== 'function') {
    throw new TypeError(
      `express-permit requires a username function. Got ${options.username}.`
    );
  }

  var store = new StoreWrapper(options.store);

  return function (req, res, next) {
    res.locals.permitAPI = {};

    res.locals.permitAPI.NotFoundError = options.store.NotFoundError;
    res.locals.permitAPI.Conflict = options.store.Conflict;

    res.locals.permitAPI.PermissionsError = tags.PermissionsError;
    res.locals.permitAPI.ValidationError = validation.ValidationError;

    req.permitStore = store;

    if (!options.username(req)) {
      return next();
    }

    store.read({ username: options.username(req) }, function (err, user) {

      // TODO Nail down behavior when user does not exist but is supplied
      if (err instanceof options.store.NotFoundError) {
        req.permits = false;
      } else if (err) {
        return next(err);
      } else {
        req.permits = compilePermissions(user);
      }

      return next();
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

    if (!permissionSet[key]) {
      permissionSet[key] = [];
    }

    permissionSet[key] = permissionSet[key].concat(Array.from(set));
  });

  res.locals.permissionSet = permissionSet;
  next();
}

