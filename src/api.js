'use strict';

var traverse = require('traverse');

function runOp(op, params) {
  return function (req, res, next) {
    var args = {};

    params.forEach(function (param) {

      // Check for parameter in req body, param, or query in that order.
      let parse = req.params[param] || req.query[param];
      if (req.body && req.body[param]) {
        parse = req.body[param];
      }

      // Dump the param to res.locals
      // So it can be rendered on confirmation pages and the like.
      res.locals.permitAPI[param] = parse;

      // Add parameter to our arguments object.
      args[param] = parse;
    });

    // Call the op with arguments object we built
    req.permitStore[op](args, function (err, result) {

      // Validation errors may occur here
      if (err) {
        return next(err);
      }

      // Put the result (if any) on the res.locals
      res.locals.permitAPI.result = result;
      return next();
    });
  };
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

exports.list = listSuites;

exports.readAll = function (req, res, next) {
  req.permitStore.readAll(function (err, users) {
      if (err) {return next(err);}

      // Put the result on res.locals
      res.locals.permitAPI.result = users;
      return next();
    });
};

exports.readAllGroups = function (req, res, next) {
  req.permitStore.readAllGroups(function (err, groups) {
      if (err) {return next(err);}

      // Put the result on res.locals
      res.locals.permitAPI.result = groups;
      return next();
    });
};

exports.create = runOp('create', ['username', 'permit']);

exports.read = runOp('read', ['username']);

exports.rsop = runOp('rsop', ['username']);

exports.update = runOp('update', ['username', 'permit']);

exports.destroy = runOp('destroy', ['username']);

exports.addPermission = runOp(
  'addPermission',
  ['username', 'permission', 'suite']
);

exports.removePermission = runOp(
  'removePermission',
  ['username', 'permission', 'suite']
);

exports.blockPermission = runOp(
  'blockPermission',
  ['username', 'permission', 'suite']
);

exports.setAdmin = runOp('setAdmin', ['username']);

exports.setOwner = runOp('setOwner', ['username']);

exports.addGroup = runOp('addGroup', ['username', 'group']);

exports.removeGroup = runOp('removeGroup', ['username', 'group']);

exports.createGroup = runOp('createGroup', ['group', 'permissions']);

exports.readGroup = runOp('readGroup', ['group']);

exports.updateGroup = runOp('updateGroup', ['group', 'permissions']);

exports.destroyGroup = runOp('destroyGroup', ['group']);

exports.addGroupPermission = runOp(
  'addGroupPermission',
  ['group', 'permission', 'suite']
);

exports.removeGroupPermission = runOp(
  'removeGroupPermission',
  ['group', 'permission', 'suite']
);

exports.blockGroupPermission = runOp(
  'blockGroupPermission',
  ['group', 'permission', 'suite']
);

