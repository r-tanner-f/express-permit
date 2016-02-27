'use strict';

/*
 * _____
 *|_   _|_ _  __ _ ___
 *  | |/ _` |/ _` / __|
 *  | | (_| | (_| \__ \
 *  |_|\__,_|\__, |___/
 *           |___/
 */

var Forbidden = require('./errors').Forbidden;

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

// Not sure this actually needs to be exported
exports.Tagger = Tagger;

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
        permit[suite]                   &&

        // All is true
        permit[suite].all     === true  &&

        // The permission is NOT explicitly blocked
        permit[suite][action] !== false
      ) {
        return next();
      }
    }

    // If no next() is trigged, pass a Forbidden error the handler
    // "Implicit-deny" in a way
    var err = new Forbidden(res, action, suite);
    next(err);
  };
}

exports.check = check;

function initTag() {
  // If params were sent backwards, be kind and rewind
  if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
    let tagger = new Tagger(arguments[1], arguments[0]);
    return tagger.tag.bind(tagger);
  }

  let tagger = new Tagger(...arguments);
  return tagger.tag.bind(tagger);
}

exports.initTag = initTag;

