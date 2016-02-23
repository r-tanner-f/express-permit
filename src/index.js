'use strict';

var tags = require('./tags');
var StoreWrapper = require('./wrapper');

module.exports = expressPermit;

module.exports._wrapper = StoreWrapper;
module.exports.Store = require('./store');
module.exports.MemoryPermitStore = require('./memory');
module.exports.api = require('./api');
module.exports.error = require('./errors');

module.exports.tag = tags.initTag;
module.exports.check = tags.check;

/**
 * Configure express-permit middleware for handling and retrieving permissions.
 * Provide a permit store and a username function.
 * @example
 * app.use(permissions({
 *  store: new permissions.MemoryStore(),
 *  username: req => req.session.username
 * }));
 * @param {Object} [options] Properties `store` and `username` are required.
 * @param {Object} [options.store] A permit store such as MemoryStore.
 * @param {Function} [options.username]
 * A function that returns the username (provided with req argument).
 * Example: `req => req.session.username`
 * @param {Object} [options.defaultPermit]
 * The default permit to assign 'new' users. Defaults to:
 * `{ permissions: {}, groups: ['default'] }`
 * @See permit for help building custom defaults.
 */
function expressPermit(options) {
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
          { username: username, permit: defaultPermit },
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

