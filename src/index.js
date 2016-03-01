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

module.exports.api = require('./api');

module.exports.Store = require('./store');
module.exports.MemoryPermitStore = require('./memory');
module.exports._wrapper = StoreWrapper;

module.exports.tag = tag;
module.exports.check = check;

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

    // Add the store to req for use in another middleware
    req.permitStore = store;

    // Execute the supplied username function to retrieve the username.
    var username = options.username(req);

    // If the user is not logged on, `next();` without adding permissions.
    if (!username) {
      return next();
    }

    // Attempt to retrieve the user's permit
    store.rsop({ username: username }, function (err, permit) {

      // If no permissions are found for this user...
      if (err instanceof options.store.NotFoundError) {

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
        res.locals.permit = permit;
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
 * The Tagger class is instantiated when tracked tagging or a default suite
 * is being used.
 * @private
 * @param {String} [suite] The default suite to be used.
 * @param {Function} [router] The we're tracking.
 */
class Tagger {
  constructor() {

    // Three possible inputs
    // Suite:
    if (typeof arguments[0] === 'string') {
      this.defaultSuite = arguments[0];
    }

    // Router:
    else if (typeof arguments[0] === 'function' && !arguments[1]) {
      this.defaultSuite = 'root';
      this.router = arguments[0];
    }

    // Router and Suite:
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

  // This function is exposed to the user. Documented elsewhere.
  tag(action, suite) {
    suite = suite ? suite : this.defaultSuite;

    // If this a tracked tag
    if (this.router) {
      this._trackTag(action, suite);
    }

    return check(action, suite);
  }

  /**
   * Used to dump permissions on to the router for later collection.
   * @param {String} Action
   * The action we are applying a permissions check to.
   * @param {String} Suite
   * The collection, or suite, of actions we are applying a permissions check to.
   */
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
 * The name of the suite the action is found under. Defaults to 'root'.
 * @example
 * app.get('/rollercoaster', check('go-on-rides', 'amusement'), function(req, res, next) {
 *    res.send('wheee!');
 * });
 *
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
  if (!suite) {suite = 'root';}

  return function permitCheck(req, res, next) {
    // If for some reason there is no res.locals.permit,
    // this will prevent goofy errors from happening.
    if (res.locals.permit) {
      var permit = res.locals.permit;

      // If owner or admin, permit any action
      if (permit === 'owner' || permit === 'admin') {
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
        permit[suite].all === true  &&

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

/**
 * Returns a tagged permit check (See <code>check</code> function).
 * Used for setting a default suite and/or for
 * tracking permissions used throughout the app.
 * @param {String} [suite] The default suite to be used.
 * @param {Function} [router] The we're tracking.
 * @returns check See <code>check</code> function documentation.
 * @example <caption>Tracking and Default Suite</caption>
 * var app    = Express.Router();
 *
 * // Tracked with default suite:
 * var permit = require('express-permit').tag(app, 'amusement');
 *
 * app.get('/rollercoaster', permit('go-on-rides'), function(req, res, next) {
 *   res.send('wheee!');
 * }):
 * @example <caption>Default suite</caption>
 * var app    = Express.Router();
 *
 * // Default suite only:
 * var permit = require('express-permit').tag('amusement');
 *
 * app.get('/rollercoaster', permit('go-on-rides'), function(req, res, next) {
 *   res.send('wheee!');
 * }):
 * @example <caption>Tracking only</caption>
 * var app    = Express.Router();
 *
 * // Tracking only:
 * var permit = require('express-permit').tag(app);
 *
 * app.get('/rollercoaster', permit('go-on-rides', 'amusement'), function(req, res, next) {
 *   res.send('wheee!');
 * }):
 */
function tag() {
  // If params were sent backwards, be kind and rewind
  if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
    let tagger = new Tagger(arguments[1], arguments[0]);
    return tagger.tag.bind(tagger);
  }

  let tagger = new Tagger(...arguments);
  return tagger.tag.bind(tagger);
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
