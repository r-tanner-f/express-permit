'use strict';

/*
 *  _____  ___ __  _ __ ___  ___ ___       _ __   ___ _ __ _ __ ___ (_) |_
 * / _ \ \/ / '_ \| '__/ _ \/ __/ __|_____| '_ \ / _ \ '__| '_ ` _ \| | __|
 *|  __/>  <| |_) | | |  __/\__ \__ \_____| |_) |  __/ |  | | | | | | | |_
 * \___/_/\_\ .__/|_|  \___||___/___/     | .__/ \___|_|  |_| |_| |_|_|\__|
 *          |_|                           |_|
 *
 * +express-permit
 *
 * This file is the 'starting point' that exposes the module.
 * It contains the primary piece of middleware loaded by Express.
 */

/**
 * Express middleware for fine-grained permissions
 * @module express-permit
 */

const EventEmitter = require('events').EventEmitter;

const StoreWrapper = require('./wrapper');
const errors = require('./errors');
const api = require('./api');

/*
 * _   _      _
 *| | | | ___| |_ __   ___ _ __ ___
 *| |_| |/ _ \ | '_ \ / _ \ '__/ __|
 *|  _  |  __/ | |_) |  __/ |  \__ \
 *|_| |_|\___|_| .__/ \___|_|  |___/
 *             |_|
 * +helpers
 */

// FIXME Could be a little more DRY...
function isAdmin(permit) {
  return Boolean(
    permit === 'admin'      ||
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

const userLevel = {
  user: 0,
  admin: 1,
  superadmin: 2,
  owner: 3,
};
function getLevel(user) {
  if (userLevel[user.permit]) { return userLevel[user.permit]; }
  return userLevel.user;
}

function hasAction(action, suite, permit) {
  if (!permit) {
     return false;
 }

  // If owner, admin, or superadmin, then permit any action
  if (permit === 'owner' || permit === 'superadmin' || permit === 'admin') {
    return true;

  /**
   * If action is explicitly permitted: continue.
   * @example
   * const permit = {
   *   'amusement-park': {
   *     'go-on-rides': true
   *   }
   * }
   */
  } else if (permit[suite] && permit[suite][action] === true) {
    return true;

  /**
   * If user has 'all' actions AND permission isn't explicitly forbidden
   * @example
   * // Permitted
   * const permit = {
   *   'amusement-park': {
   *     all: true,
   *   }
   * }
   * @example
   * // Not permitted
   * const permit = {
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
    return true;
  }

  return false;
}

/*
 * ____             _   _      _
 *|  _ \ ___  ___  | | | | ___| |_ __   ___ _ __ ___
 *| |_) / _ \/ __| | |_| |/ _ \ | '_ \ / _ \ '__/ __|
 *|  _ <  __/\__ \ |  _  |  __/ | |_) |  __/ |  \__ \
 *|_| \_\___||___/ |_| |_|\___|_| .__/ \___|_|  |___/
 *                              |_|
 * +reshelpers
 */

/**
 * addLocalHelpers appends various helper functions to res.locals.permit.
 * This is primarily used for Jade/Pug rendering.
 * @private
 * @example
 * // Only show nav links if user has permissions to 'rides'.
 * if permit.hasAny('rides')
 *   a(href='/rollercoaster') Rollercoaster
 */
function addLocalHelpers(res) {
  if (!res.locals.permit) {
    res.locals.permit = {};
  }

  res.locals.permit.isAdmin = () => isAdmin(res.locals.permitAPI.currentUser.permit);
  res.locals.permit.isSuperadmin = () => isSuperadmin(res.locals.permitAPI.currentUser.permit);
  res.locals.permit.isOwner = () => isOwner(res.locals.permitAPI.currentUser.permit);

  res.locals.permit = function hasActionMiddleware(action, suite, permissions) {
    return hasAction(
      action,
      suite,
      permissions || res.locals.permitAPI.currentUser.permit
    );
  };


  res.locals.permit.isHigherThan = function isHigherThan(user) {
    if (getLevel(res.locals.permitAPI.currentUser) > getLevel(user)) {
      return true;
    }

    return false;
  };

  res.locals.permit.hasAny = function hasAny(suite) {
    // If they're an admin or anything, return true
    if (
      res.locals.permitAPI.currentUser.permit === 'admin'      ||
      res.locals.permitAPI.currentUser.permit === 'superadmin' ||
      res.locals.permitAPI.currentUser.permit === 'owner'
    ) { return true; }

    // If they have all in the suite, return true
    if (res.locals.permitAPI.currentUser.permit[suite] === 'all') {
      return true;
    }

    // Loop through all of it to see if there's any
    for (const action in res.locals.permitAPI.currentUser.permit[suite]) {
      if (res.locals.permitAPI.currentUser.permit[suite][action] === true) {
        return true;
      }
    }

    return false;
  };
}

/*
 * __  __ _     _     _ _
 *|  \/  (_) __| | __| | | _____      ____ _ _ __ ___
 *| |\/| | |/ _` |/ _` | |/ _ \ \ /\ / / _` | '__/ _ \
 *| |  | | | (_| | (_| | |  __/\ V  V / (_| | | |  __/
 *|_|  |_|_|\__,_|\__,_|_|\___| \_/\_/ \__,_|_|  \___|
 *
 * +middleware
 *
 * Return middleware for Express to execute on each request. */

/**
 * Configure express-permit middleware for handling and retrieving permissions.
 * Provide a permit store and a username function.
 * @example
 * const permissions = require('express-permit');
 *
 * app.use(permissions({
 *  store: MemoryPermitStore(),
 *  username: req => req.session.username
 * }));
 * @param {Object} options
 * Properties <code>store</code> and <code>username</code> are required.
 * @param {Object} options.store A permit store such as MemoryStore.
 * @param {Function} options.username
 * A function that returns the username (called with req as only argument).
 * Example: <code>req => req.session.username</code>
 * @param {Object} [options.defaultPermit]
 * The default permit to assign 'new' users. Defaults to:
 * <code>{ permissions: {}, groups: ['default'] }</code>
 * @return middleware
 * @static
 * @public
 */
function middleware(options) {
  // Blow up if we don't get a username function
  if (typeof options.username !== 'function') {
    throw new TypeError(
      `express-permit requires a username function. Got ${options.username}.`
    );
  }

  // Wrap the store for validation.
  const store = new StoreWrapper(options.store);

  return function expressPermitMiddleware(req, res, next) {
    res.locals.permitAPI = {};

    // Add the store to req for direct access by user
    req.permitStore = store;

    // Execute the supplied username function to retrieve the username.
    const username = options.username(req);

    // If the user is not logged in, call `next();` without adding permissions.
    if (!username) {
      next();
      return;
    }

    // See +reshelpers
    addLocalHelpers(res);

    // Attempt to retrieve the user's permit
    store.rsop({ username }, (err, user) => {
      // If no permissions are found for this user...
      if (err instanceof options.store.error.NotFound) {
        // then build defaults
        const defaultPermit = options.defaultPermit || {
          permissions: {},
          groups: ['default'],
        };

        // and create the user.
        store.create({ username, user: defaultPermit }, createErr => {
          if (createErr) { return next(createErr); }

          // Load the new user (kinda clunky...)
          return store.rsop({ username }, (rsopErr, rsopUser) => {
            if (rsopErr) { return next(rsopErr); }

            res.locals.permitAPI.currentUser = rsopUser;

            return next();
          });
        });

      // If we receive anything other than a NotFound error
      // when attempting to retrieve the user, pass to error handler
      } else if (err) {
        return next(err);
      }

      // If user exists and is retrieved succesfully,
      // add the user to res.locals.permitAPI.currentUser.permit
      res.locals.permitAPI.currentUser = user;
      return next();
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
 * +tagsandchecks
 *
 * This section tracks permissions,
 * and supplies middleware that checks if the user is permitted to perform action
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
  // Add permission to tracking (for enumeration by user)
  // This relies on the require cache... which has some caveats.
  // See the Node.js documentation:
  // https://nodejs.org/api/modules.html#modules_module_caching_caveats
  const map = api.map;

  if (!map.has(suite)) {
    map.set(suite, new Set([action]));
  } else {
    map.get(suite).add(action);
  }

  return function permitCheck(req, res, next) {
    // If for some reason there is no res.locals.permitAPI.currentUser.permit,
    // this will prevent goofy errors from happening.
    if (
      res.locals.permitAPI.currentUser.permit &&
      // If the user is allowed to perform this action then next
      hasAction(action, suite, res.locals.permitAPI.currentUser.permit)
    ) {
      return next();
    }

    // Otherwise, pass a Forbidden to the error handler
    const err = new errors.Forbidden(res, action, suite);
    return next(err);
  };
}

/**
 * @name isAdmin
 * @description
 * Calls <code>next()</code> if user is an admin,
 * and <code>next(new Forbidden())</code> if not.
 * @example
 * app.get('/managers-lounge', permissions.isAdmin, (req, res, next) => {
 *   res.send('Break time!');
 * });
 */
function isAdminMiddleware(req, res, next) {
  if (isAdmin(res.locals.permitAPI.currentUser.permit)) {
    return next();
  }

  return next(new errors.Forbidden(res, 'admin', 'is'));
}

/**
 * @name isSuperadmin
 * @description
 * Calls <code>next()</code> if user is a Superadmin,
 * and <code>next(new Forbidden())</code> if not.
 * @example
 * app.get('/managers-lounge', permissions.isSuperadmin, (req, res, next) => {
 *   res.send('Break time!');
 * });
 */
function isSuperadminMiddleware(req, res, next) {
  if (isSuperadmin(res.locals.permitAPI.currentUser.permit)) {
    return next();
  }

  return next(new errors.Forbidden(res, 'superadmin', 'is'));
}

/**
 * @name isOwner
 * @description
 * Calls <code>next()</code> if user is the Owner,
 * and <code>next(new Forbidden())</code> if not.
 * @example
 * app.get('/managers-lounge', permissions.isOwner, (req, res, next) => {
 *   res.send('Break time!');
 * });
 */
function isOwnerMiddleware(req, res, next) {
  if (isOwner(res.locals.permitAPI.currentUser.permit)) {
    return next();
  }

  return next(new errors.Forbidden(res, 'owner', 'is'));
}

/**
 * Returns a tagged permit check (See <code>check</code> function).
 * Used for setting a default suite.
 * @param {String} suite
 * @example
 * var app    = Express.Router();
 * const permit = require('express-permit').tag('amusement');
 *
 * app.get('/rollercoaster', permit('go-on-rides'), function(req, res, next) {
 *   res.send('wheee!');
 * }):
 */
function tag(suite) {
  return action => check(action, suite);
}

/*
 *  ____  _
 * / ___|| |_ ___  _ __ ___
 * \___ \| __/ _ \| '__/ _ \
 *  ___) | || (_) | | |  __/
 * |____/ \__\___/|_|  \___|
 *
 * +store
 */


/**
 * Base class used for creating new data stores
 */
class Store extends EventEmitter {
  constructor() {
    super();
    this.error = {};
    this.error.NotFound = errors.NotFound;
    this.error.Conflict = errors.Conflict;

    this.state = 'disconnected';
  }

  changeState() {
    const newState = arguments[0];

    if (this.state !== newState) {
      this.state = newState;
      this.emit.apply(this, arguments);
    }
  }
}

/*
 * _____                       _
 *| ____|_  ___ __   ___  _ __| |_ ___
 *|  _| \ \/ / '_ \ / _ \| '__| __/ __|
 *| |___ >  <| |_) | (_) | |  | |_\__ \
 *|_____/_/\_\ .__/ \___/|_|   \__|___/
 *           |_|
 * +exports
 */

module.exports = middleware;

module.exports.error = errors;

module.exports.api = api;

module.exports.Store = Store;
module.exports.MemoryPermitStore = require('./memory');
module.exports._wrapper = StoreWrapper;

module.exports.tag = tag;

module.exports.check = check;

module.exports.check.isAdmin = isAdminMiddleware;
module.exports.check.isSuperadmin = isSuperadminMiddleware;
module.exports.check.isOwner = isOwnerMiddleware;

/*
 * _                        _       __
 *| |_ _   _ _ __   ___  __| | ___ / _|___
 *| __| | | | '_ \ / _ \/ _` |/ _ \ |_/ __|
 *| |_| |_| | |_) |  __/ (_| |  __/  _\__ \
 * \__|\__, | .__/ \___|\__,_|\___|_| |___/
 *     |___/|_|
 * +typedefs
 *
 * These are only here for the benefit of JSDocs.
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
 * const user = {
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
 * const user = 'admin'
 * @example
 * const user = 'owner'
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
 * let permissions = {
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
 * let permissions = {
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
 * let suite = {
 *   'enter-park': true,
 *   'go-on-rides': true
 * }
 * @example
 * let suite = 'all'
 */

/**
 * A group with permissions. Users inherit permissions from groups.
 * @name group
 * @global
 * @typedef {object} group
 * @property {permissions} permissions
 * @example
 * let group = {
 *   root: {
 *     'enter-park': true
 *   },
 *   'amusement-park': {
 *     'go-on-rides': true
 *   },
 *   'basic-things': 'all'
 * }
 */

