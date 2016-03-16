'use strict';

/*
 *  _____  ___ __  _ __ ___  ___ ___       _ __   ___ _ __ _ __ ___ (_) |_
 * / _ \ \/ / '_ \| '__/ _ \/ __/ __|_____| '_ \ / _ \ '__| '_ ` _ \| | __|
 *|  __/>  <| |_) | | |  __/\__ \__ \_____| |_) |  __/ |  | | | | | | | |_
 * \___/_/\_\ .__/|_|  \___||___/___/     | .__/ \___|_|  |_| |_| |_|_|\__|
 *          |_|                           |_|
 *
 * This file is the starting point that exposes the module.
 * It contains the primary piece of middleware loaded by Express: 'permissions'.
 */

var StoreWrapper = require('./wrapper');

/**
 * Express middleware for fine-grained permissions
 * @module express-permit
 */
module.exports = permissions;

var errors = require('./errors');
module.exports.error = errors;

var api = require('./api');
module.exports.api = api;

module.exports.Store = require('./store');
module.exports.MemoryPermitStore = require('./memory');
module.exports._wrapper = StoreWrapper;

module.exports.tag = tag;

module.exports.check = check;

module.exports.check.isAdmin = isAdminMiddleware;
module.exports.check.isSuperadmin = isSuperadminMiddleware;
module.exports.check.isOwner = isOwnerMiddleware;

/**
 * Configure express-permit middleware for handling and retrieving permissions.
 * Provide a permit store and a username function.
 * @example
 * var permissions = require('express-permit');
 *
 * app.use(permissions({
 *  store: MemoryPermitStore(),
 *  username: req => req.session.username
 * }));
 * @param {Object} options
 * Properties <code>store</code> and <code>username</code> are required.
 * @param {Object} options.store A permit store such as MemoryStore.
 * @param {Function} options.username
 * A function that returns the username (provided with req argument).
 * Example: <code>req => req.session.username</code>
 * @param {Object} [options.defaultPermit]
 * The default permit to assign 'new' users. Defaults to:
 * <code>{ permissions: {}, groups: ['default'] }</code>
 * @return middleware
 * @static
 * @public
 */
function permissions(options) {
  if (typeof options.username !== 'function') {
    throw new TypeError(
      `express-permit requires a username function. Got ${options.username}.`
    );
  }

  // Wrap the store for validation.
  var store = new StoreWrapper(options.store);

  // Return middleware for Express to execute on each request.
  return function (req, res, next) {
    res.locals.permitAPI = {};

    // local helpers

    function defaultPermit(permit, fn) {
      if (!permit) { permit = res.locals.permit; }

      return fn(permit);
    }

    res.locals.permitAPI.hasAction = function (action, suite, permit) {
      return defaultPermit(permit, permit => hasAction(action, suite, permit));
    };

    res.locals.permitAPI.isAdmin = function (permit) {
      return defaultPermit(permit, isAdmin);
    };

    res.locals.permitAPI.isSuperadmin = function (permit) {
      return defaultPermit(permit, isSuperadmin);
    };

    res.locals.permitAPI.isOwner = function (permit) {
      return defaultPermit(permit, isOwner);
    };

    // Add the store to req for use in another middleware
    req.permitStore = store;

    // Execute the supplied username function to retrieve the username.
    var username = options.username(req);

    // If the user is not logged on, `next();` without adding permissions.
    if (!username) {
      return next();
    }

    // Attempt to retrieve the user's permit
    store.rsop({ username: username }, function (err, user) {

      // If no permissions are found for this user...
      if (err instanceof options.store.error.NotFound) {

        // then build defaults
        var defaultPermit = options.defaultPermit || {
          permissions: {},
          groups: ['default'],
        };

        // and create the user.
        store.create(
          { username: username, user: defaultPermit },
          function (err) {
            if (err) {return next(err);}

            return next();
          }
        );

        // Add the permits to the new user's request.
        res.locals.permit = defaultPermit;

      } else if (err) {
        return next(err);
      } else {

        // Otherwise, add the user to res.locals.permit
        res.locals.permit = user.permit;
        return next();
      }
    });
  };
}

/*
 * _____                                 _    ____ _               _
 *|_   _|_ _  __ _ ___    __ _ _ __   __| |  / ___| |__   ___  ___| | _____
 *  | |/ _` |/ _` / __|  / _` | '_ \ / _` | | |   | '_ \ / _ \/ __| |/ / __|
 *  | | (_| | (_| \__ \ | (_| | | | | (_| | | |___| | | |  __/ (__|   <\__ \
 *  |_|\__,_|\__, |___/  \__,_|_| |_|\__,_|  \____|_| |_|\___|\___|_|\_\___/
 *           |___/
 *
 * This section contains the logic that checks if a user is permitted to perform
 * an action, and tracking the permissions created within the app.
 */

/**
 * Express middleware that performs a check of user permissions.
 * Will <code>next()</code> an instanceof <code>Forbidden</code>
 * if action is not permitted.
 * @function
 * @returns Middleware
 * @param {String} action
 * The name of the action performed in this controller,
 * or name of permissions requried.
 * @param {String} [suite]
 * The name of the suite the action is found under.
 * @example
 * app.get('/rollercoaster', check('go-on-rides', 'amusement'), function(req, res, next) {
 *    res.send('wheee!');
 * });
 *
 * // Forbidden handler
 * app.use(function(err, req, res, next) {
 *   if (err instanceof permissions.error.Forbidden) {
 *     return res.status(403).send('go away!!');
 *   } else {
 *   next(err);
 *   }
 * });
 */
function check(action, suite) {

  //Add to tracking
  var map = api.map;

  if (!map.has(suite)) {
    map.set(suite, new Set([action]));
  } else {
    map.get(suite).add(action);
  }

  return function permitCheck(req, res, next) {
    // If for some reason there is no res.locals.permit,
    // this will prevent goofy errors from happening.
    if (res.locals.permit) {
      var permit = res.locals.permit;

      // If owner or admin, permit any action
      if (permit === 'owner' || permit === 'superadmin' || permit === 'admin') {
        return next();

      /**
       * If action is explicitly permitted: continue.
       * @example
       * var permit = {
       *   'amusement-park': {
       *     'go-on-rides': true
       *   }
       * }
       */
      } else if (permit[suite] && permit[suite][action] === true) {
        return next();

      /**
       * If user has 'all' actions AND permission isn't explicitly forbidden
       * @example
       * // Permitted
       * var permit = {
       *   'amusement-park': {
       *     all: true,
       *   }
       * }
       * @example
       * // Not permitted
       * var permit = {
       *   'amusement-park': {
       *     all: true,
       *     'go-on-rides': false
       *   }
       * }
       */
      } else if (

        // Suite exists
        permit[suite] &&

        // All is true
        permit[suite].all === true &&

        // The permission is NOT explicitly blocked
        permit[suite][action] !== false
      ) {
        return next();
      }
    }

    // If no next() is trigged, pass a Forbidden error the handler
    // "Implicit-deny" in a way
    var err = new errors.Forbidden(res, action, suite);
    next(err);
  };
}

function isAdminMiddleware(req, res, next) {
  if (isAdmin(res.locals.permit)) {
    return next();
  }

  next(new errors.Forbidden(res, 'admin', 'is'));
}

function isSuperadminMiddleware(req, res, next) {
  if (isSuperadmin(res.locals.permit)) {
    return next();
  }

  next(new errors.Forbidden(res, 'superadmin', 'is'));
}

function isOwnerMiddleware(req, res, next) {
  if (isOwner(res.locals.permit)) {
    return next();
  }

  next(new errors.Forbidden(res, 'owner', 'is'));
}

/**
 * Returns a tagged permit check (See <code>check</code> function).
 * Used for setting a default suite.
 * @example
 * var app    = Express.Router();
 * var permit = require('express-permit').tag('amusement');
 *
 * app.get('/rollercoaster', permit('go-on-rides'), function(req, res, next) {
 *   res.send('wheee!');
 * }):
 */
function tag(suite) {
  return function (action) {
    return check(action, suite);
  };
}

/*
 * _   _      _
 *| | | | ___| |_ __   ___ _ __ ___
 *| |_| |/ _ \ | '_ \ / _ \ '__/ __|
 *|  _  |  __/ | |_) |  __/ |  \__ \
 *|_| |_|\___|_| .__/ \___|_|  |___/
 *             |_|
 */

function isAdmin(permit) {
  return Boolean(
    permit === 'admin' ||
    permit === 'superadmin' ||
    permit === 'owner'
  );
}

function isSuperadmin(permit) {
  return Boolean(
    permit === 'superadmin' ||
    permit === 'owner'
  );
}

function isOwner(permit) {
  return Boolean(permit === 'owner');
}

function hasAction(action, suite, permit) {
  if (!permit) {
    permit = res.locals.permit;
  }

  if (permit[suite] === 'all') {
    return true;
  }

  if (permit[suite] && permit[suite][action]) {
    return true;
  }

  return false;
}

/*
 * _                        _       __
 *| |_ _   _ _ __   ___  __| | ___ / _|___
 *| __| | | | '_ \ / _ \/ _` |/ _ \ |_/ __|
 *| |_| |_| | |_) |  __/ (_| |  __/  _\__ \
 * \__|\__, | .__/ \___|\__,_|\___|_| |___/
 *     |___/|_|
 */

/**
 * A user stored in the PermitStore. Consists of a username, permissions, and an
 * array of groups.
 * @name user
 * @global
 * @typedef {object} user
 * @property {string} username A unique ID with which we can find the user
 * @property {string[]} groups An array of strings the user
 * @property {permissions|string} permissions
 * A set of permissions, the string 'admin', or the string 'owner'.
 * @property {permit} [permit]
 * A compiled set of permissions, including permissions inherited from groups.
 * @example
 * var user = {
 *   username: 'awesomeUser',
 *   permissions: {
 *     root: {
 *       'enter-park': true
 *     },
 *     'amusement-park': {
 *       'go-on-rides': true
 *     }
 *   },
 *   groups: [ 'customer' ]
 * }
 * @example
 * var user = 'admin'
 * @example
 * var user = 'owner'
 */

/**
 * The user's compiled permissions, or RSOP (resulting set of permissions).
 * Includes permissions inherited from groups.
 * @name permit
 * @global
 * @typedef {Object} permit
 * @property {...suite} suites
 * @example
 *
 * var permissions = {
 *   root: {
 *     'enter-park': true
 *   },
 *   'amusement-park': {
 *     'go-on-rides': true
 *   },
 *   'basic-things': 'all'
 * }
 */

/**
 * A set of permissions attached to either a group or a user. Contains 'suites'
 * as properties, and actions as booleans under suites.
 * @name permissions
 * @global
 * @typedef {Object} permissions
 * @property {...suite} suites
 * @example
 * var permissions = {
 *   root: {
 *     'enter-park': true
 *   },
 *   'amusement-park': {
 *     'go-on-rides': true
 *   },
 *   'basic-things': 'all'
 * }
 */

/**
 * A set of actions related to each other.
 * @name suite
 * @global
 * @typedef {object|string} suite
 * @property {string} [all]
 * The string 'all' allows permission to every action under the suite
 * @property {...boolean} actions
 * @example
 * var suite = {
 *   'enter-park': true,
 *   'go-on-rides': true
 * }
 * @example
 * var suite = 'all'
 */

/**
 * A group with permissions. Users inherit permissions from groups.
 * @name group
 * @global
 * @typedef {object} group
 * @property {permissions} permissions
 * @example
 * var group = {
 *   root: {
 *     'enter-park': true
 *   },
 *   'amusement-park': {
 *     'go-on-rides': true
 *   },
 *   'basic-things': 'all'
 * }
 */
