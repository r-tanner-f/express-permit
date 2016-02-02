'use strict';

var util = require('util');
var traverse = require('traverse');

function expressPermit (options) {
  var store = options.store;

  return function(req, res, next) {
    req.permits = store.get(eval(options.username)); //jshint ignore:line
    next();
  };
}

expressPermit.tag = function initPermit(arg, group) {
  function trackedPermit (name) {
    let router = arg;

    // If the router doesn't already have permissions on it, create a new map
    if(!router.permissions) {
      router.permissions = new Map;
    }

    let permissions = router.permissions;

    //Does the router's permissions have the group?
    if(!permissions.has(group)) {

      // Add a new set if not
      permissions.set(group, new Set([name]));
    }

    // Get the group and add the permission to the Set 
    else {
      permissions.get(group).add(name);
    }

    // Reset arg for permitCheck to use
    // This feels hacky
    arg = name;
    return permitCheck;
  }

  function permitCheck (req, res, next) {
    let action = arg;
    if (!req.permits || !req.permits[group] || !req.permits[group][action]) {
      next('Permissions Error');
    }
    next();
  }

  if(!group) {
    group = '_root';
  }

  if (typeof arg === 'string' ) {
    return permitCheck;
  }

  // If we get passed a router or app, return a trackedPermit function
  else if (typeof arg === 'function') {
    return trackedPermit;
  }

  // Throw if we didn't return anything
  var err = new Error('permit received invalid argument type: ' + typeof arg + 
                      '. Need a string, or a router/app if saving permissions');
  Error.captureStackTrace(err, initPermit);
  throw err;
};

expressPermit.tag.group = function permitGroup(group, router) {
  var tag = expressPermit.tag;
  if (router) {
    tag = tag(router); 
  }
  return name => tag(name, group);
};

function permitMap(req, res, next) {
  var map = new Map();

  traverse(req.app._router.stack).forEach(function(node) {

    // Check if the node we're looking at is a permissions object
    if (node && node.permissions) {

      var permissions = node.permissions;

      //Iterate over the permissions Map
      node.permissions.forEach(function(actions, group) {

        // If the map doesn't currently have that group, add it 
        if (!map.has(group)) {
          map.set(group, actions);
        }
        else {

          // If it does have the group, combine the sets
          var set = map.get(group);
          set = new Set([...set, actions]); 
        }
      });
    }
  });

  var permissionSet = {root: []};

  map.forEach(function(set, key){

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

expressPermit.tag.tree = permitMap;

expressPermit.tree = permitMap;

expressPermit.InMemoryPermits = function MemoryPermits(permissions) {
  this.permissions = permissions;

  this.get = id => this.permissions[id];

  this.set = function set(id, permissions) {
    this.permissions[id] = permissions;
  };
};

module.exports = expressPermit;
