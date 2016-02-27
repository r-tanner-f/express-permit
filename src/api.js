'use strict';

/*
 *     _    ____ ___
 *    / \  |  _ \_ _|
 *   / _ \ | |_) | |
 *  / ___ \|  __/| |
 * /_/   \_\_|  |___|
 */

var traverse = require('traverse');

/**
 * API module for use as Express middleware
 * @module express-permit/api
 */

/**
 * Generic operation running function. Used by all API middleware.
 * @returns {Function} middleware
 * @param {String} op Key of operation to be called
 * @param {Array} params Parameters of the operation
 * @param {String} [result] Key to store result of operation on permitAPI
 * @private
 */
function runOp(op, params, result) {
  result = result || 'result';

  return function (req, res, next) {
    var args = {};

    params.forEach(function (param) {

      // Check for parameter in req body, query, or param in that order.
      let parse = req.query[param] || req.params[param];
      if (req.body && req.body[param]) {
        parse = req.body[param];
      }

      // Dump the param to res.locals.permitAPI
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

/**
 * Build a list of all permissions used in the app.
 * @param {Object} req
 * @param {Object} res Populates <code>res.locals.permitAPI.list</code>
 * @param {Function} next
 * @example
 * app.get('/list', permissions.api.list, function(req, res) {
 *    // Output
 *    res.locals.permitAPI.list === {
 *       root: [
 *         'enter-park',
 *       ],
 *       amusement: [
 *         'go-on-rides',
 *          'eat-popcorn',
 *        ],
 *     }
 *   res.render('/permissionsList');
 * });
 * @example
 * h1 Permissions List
 * ul
 *  each suite, permissions in permitAPI.list
 *    li= suite
 *      each permission in permissions
 *        li= permission
 */
exports.list = function listSuites(req, res, next) {
  var map = new Map();

  // Scrape permissions off the base app
  scrapePermissions(req.app, map);

  // This is expensive. Consider "caching" the result.
  traverse(req.app._router.stack).forEach(function (node) {
    scrapePermissions(node, map);
  });

  var list = {};

  map.forEach(function (set, key) {

    if (!list[key]) {
      list[key] = [];
    }

    list[key] = list[key].concat(Array.from(set));
  });

  res.locals.permitAPI.list = list;
  next();
};

// Scrape permissions off routers and apps
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

/**
 * Read all users in PermitStore
 * @param {Object} req
 * @param {Object} res Populates <code>res.locals.permitAPI.users</code>
 * @param {Function} next
 * @example
 * app.get('/users', permissions.api.readAll, function(req, res) {
 *    // Output
 *    res.locals.permitAPI.users === [
 *      {
 *        username: 'awesomeUser',
 *        permissions: {
 *          root: { 'enter-park': true },
 *          amusement: { 'go-on-rides': true },
 *        },
 *        groups: ['loyalty-program', 'customers'],
 *      },
 *      {
 *        username: 'awfulUser',
 *        permissions: {
 *          boredom: { 'be-bored': true }
 *        },
 *        groups: ['customer'],
 *      },
 *      {
 *        username: 'manager',
 *        permissions: 'admin',
 *        groups: []
 *      }
 *    ]
 *   res.render('/users');
 * });
 * @example
 * h1 Users
 * each user in permitAPI.users
 *   h2= permitAPI.user.username
 *   h3 Groups
 *   ul
 *     each group in permitAPI.user.groups
 *       li= group
 */
exports.readAll = function (req, res, next) {
  req.permitStore.readAll(function (err, users) {
      if (err) {return next(err);}

      // Put the result on res.locals
      res.locals.permitAPI.users = users;
      return next();
    });
};

/**
 * Read all groups in PermitStore
 * @param {Object} req
 * @param {Object} res Populates <code>res.locals.permitAPI.groups</code>
 * @param {Function} next
 * @example
 * app.get('/groups', permissions.api.readGroups, function(req, res) {
 *   // Output
 *   res.locals.permitAPI.groups === [
 *     'customers',
 *     'loyalty-program',
 *   ]
 *   res.render('/groups');
 * });
 * @example
 * h1 Groups
 * each groups in permitAPI.groups
 *   h2= permitAPI.user.username
 *   h3 Groups
 *   ul
 *     each group in permitAPI.user.groups
 *       li= group
 */
exports.readAllGroups = function (req, res, next) {
  req.permitStore.readAllGroups(function (err, groups) {
      if (err) {return next(err);}

      // Put the result on res.locals
      res.locals.permitAPI.groups = groups;
      return next();
    });
};

/**
 * Create a user
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {User}   req.body∥query∥param.user See <code>User</code> typedef
 * @param {String} req.body∥query∥param.username
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.post('/user/:username', permissions.api.create, function(req, res) {
 *
 *   // All parameters are dumped to res.locals for confirmation page rendering
 *   res.locals.permitAPI.groups === [
 *     'customers',
 *     'loyalty-program',
 *   ]
 *
 *   res.render('/confirmation');
 * });
 * @example
 * h1 User #{permitAPI.user.username} created!
 *
 * h2 Permissions
 * code= #{permitAPI.user.permissions}
 * h2 Groups
 * ul
 *   each group in permitAPI.user.groups
 *     li= group
 */
exports.create = runOp('create', ['username', 'user']);

/**
 * Read a user (without compiled permissions)
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {Object} res Populates <code>res.locals.permitAPI.user</code>
 * @param {Function} next
 * @example
 * app.get('/user/:username', permissions.api.read, function(req, res) {
 *   res.locals.permitAPI.user === {
 *     username: 'awesomeUser',
 *     permissions: {
 *      root: { 'enter-park': true },
 *      amusement: { 'go-on-rides': true },
 *     },
 *     groups: ['loyalty-program', 'customers'],
 *   }
 *   res.render('/user');
 * });
 * @example
 * h1 #{permitAPI.user.username}
 * each group in permitAPI.user.groups
 *   h2= user.username
 *   h3 Groups
 *   ul
 *     each group in user.groups
 *       li= group
 */
exports.read = runOp('read', ['username'], 'user');

/**
 * Read a user and compile permissions
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {Object} res Populates <code>res.locals.permitAPI.user</code>
 * @param {Function} next
 * @example
 * app.get('/user/:username', permissions.api.rsop, function(req, res) {
 *   res.locals.permitAPI.user === {
 *     username: 'awesomeUser',
 *
 *     // Permissions set explicitly for this user
 *     permissions: {
 *      root: { 'enter-park': true },
 *      amusement: { 'go-on-rides': true },
 *     },
 *
 *     // User's group membership
 *     groups: ['loyalty-program', 'customers'],
 *
 *     // Resulting permit compiled from groups and explicit user permissions
 *     permit: {
 *       root: { 'enter-park': true },
 *       amusement: { 'go-on-rides': true, 'eat-popcorn': true },
 *     },
 *   }
 *   res.render('/user');
 * });
 * @example
 * h1 #{permitAPI.user.username}
 * each group in permitAPI.user.groups
 *   h2= user.username
 *   h3 Groups
 *   ul
 *     each group in user.groups
 *       li= group
 */
exports.rsop = runOp('rsop', ['username'], 'user');

/**
 * Update a user
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {Object} req.body∥query∥param.user See <code>User</code> typedef.
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.put('/user/:username', permissions.api.update, function(req, res, next) {
 *  res.render('/confirmation');
 * });
 * @example
 * h1 #{permitAPI.username} updated!
 */
exports.update = runOp('update', ['username', 'user']);

/**
 * Delete a user
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {Object} res
 * @param {Function} next
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @example
 * app.delete('/user/:username', permissions.api.delete, function(req, res, next) {
 *  res.render('/confirmation');
 * });
 * @example
 * h1 #{permitAPI.username} baleted!
 */
exports.destroy = runOp('destroy', ['username']);

/**
 * Sets a user permission in a suite to true. Suite defaults to root.
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} [req.body∥query∥param.suite]
 * @param {String} req.body∥query∥param.permission
 * @param {String} req
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.get('/user/:username/addPermission/:suite?/:permission', permissions.api.addPermission, function(req, res, next) {
 *   res.render('/confirmation');
 *  });
 * @example
 * h1 #{permitAPI.username} now has permission to #{permitAPI.suite} #{permitAPI.permission}!
 */
exports.addPermission = runOp(
  'addPermission',
  ['username', 'permission', 'suite']
);

/**
 * Unsets (but does not explicitly block!) a user permission in a suite. Suite defaults to root.
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} [req.body∥query∥param.suite]
 * @param {String} req.body∥query∥param.permission
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.get('/user/:username/removePermission/:suite?/:permission', permissions.api.removePermission, function(req, res, next) {
 *   res.render('/confirmation');
 *  });
 * @example
 * h1 #{permitAPI.username} now has permission to #{permitAPI.suite} #{permitAPI.permission}!
 */
exports.removePermission = runOp(
  'removePermission',
  ['username', 'permission', 'suite']
);

/**
 * Sets a user permission in a suite to false, blocking any group inheritance (use sparingly). Suite defaults to root.
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} [req.body∥query∥param.suite]
 * @param {String} req.body∥query∥param.permission
 * @param {String} req
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.put('/blockPermission/:username', permissions.api.blockPermission, function(req, res, next) {
 *   res.render('/confirmation');
 *  });
 * @example
 * h1 #{permitAPI.username} now has permission to #{permitAPI.suite} #{permitAPI.permission}!
 */
exports.blockPermission = runOp(
  'blockPermission',
  ['username', 'permission', 'suite']
);

/**
 * Sets a user's permissions to the string 'admin', granting them access to everything.
 * Recommended to pair this with an isAdmin or isOwner check.
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} req
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.get('/setAdmin/:username', permissions.check.isOwner,p ermissions.api.setAdmin,  function(req, res, next) {
 *   res.render('/confirmation');
 *  });
 * @example
 * h1 #{permitAPI.username} is now an admin!
 */
exports.setAdmin = runOp('setAdmin', ['username']);

/**
 * Transfer 'owner' to another user. Performs an isOwner check automatically.
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} req
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.get('/transferOwner/:username', permissions.api.transferOwner, function(req, res, next) {
 *   res.render('/confirmation');
 *  });
 * @example
 * h1 #{permitAPI.username} is now the owner!
 */
exports.setOwner = runOp('setOwner', ['username']);

/**
 * Adds a user to a group
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} req.body∥query∥param.group
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.get('/addGroup/:username', permissions.api.addGroup, function(req, res, next) {
 *   res.render('/confirmation');
 * });
 * @example
 *  h1 #{permitAPI.username} is now part of group #{permitAPI.group} !
 */
exports.addGroup = runOp('addGroup', ['username', 'group']);

/**
 * Removes a user from a group
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.username
 * @param {String} req.body∥query∥param.group
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.put('/removeGroup/:username', permissions.api.removeGroup, function(req, res, next) {
 *   res.render('/confirmation');
 * });
 * @example
 *  h1 #{permitAPI.username} is now part of group #{permitAPI.group} !
 */
exports.removeGroup = runOp('removeGroup', ['username', 'group']);

/**
 * Create a group
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.group
 * @param {User}   req.body∥query∥param.permissions See <code>Permissions</code> typedef
 * @param {Object} res
 * Populates <code>res.locals.permitAPI</code> with parameters used and result (if any).
 * @param {Function} next
 * @example
 * app.post('/group/:group', permissions.api.createGroup, function(req, res) {
 *
 *   // All parameters are dumped to res.locals for confirmation page rendering
 *   res.locals.permitAPI.permissions === {
 *      amusement: {
 *        'go-on-rides': true,
 *        'eat-popcorn': true
 *      }
 *   }
 *
 *   res.render('/confirmation');
 * });
 * @example
 * h1 #{permitAPI.group} group created!
 *
 * h2 Permissions
 * code= #{permitAPI.permissions}
 */
exports.createGroup = runOp('createGroup', ['group', 'permissions']);

/**
 * Read a group
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.group
 * @param {Object} res Populates <code>res.locals.permitAPI.group</code>
 * @param {Function} next
 * @example
 * app.get('/group/:group', permissions.api.readGroup, function(req, res) {
 *   res.locals.permitAPI.group === {
 *     name: 'customers',
 *     permissions: {
 *      root: { 'enter-park': true },
 *      amusement: { 'go-on-rides': true },
 *     },
 *   }
 *   res.render('/user');
 * });
 * @example
 * h1 #{permitAPI.group.name}
 */
exports.readGroup = runOp('readGroup', ['group'], 'group');

/**
 * Update a group
 * @function
 * @param {Object} req
 * @param {Object} req.body∥query∥param
 * @param {String} req.body∥query∥param.group
 * @param {Object} req.body∥query∥param.permissions See <code>Permissions</code> typedef.
 * @param {Object} res Populates <code>res.locals.permitAPI</code>
 * @param {Function} next
 * @example
 * app.put('/user/:username', permissions.api.update, function(req, res, next) {
 *  res.render('/confirmation');
 * });
 * @example
 * h1 #{permitAPI.username} updated!
 */
exports.updateGroup = runOp('updateGroup', ['group', 'permissions']);

exports.destroyGroup = runOp('destroyGroup', ['group']);
