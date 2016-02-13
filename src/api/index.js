'use strict';

var validation = require('./validation');
var ValidationError = validation.ValidationError;

exports.validation = validation.middleware;
exports.ValidationError = ValidationError;

function op() {
  var op     = arguments[0];
  var params = Array.prototype.slice.call(arguments, 1);

  return function (req, res, next) {
    var err = [];

    var args = params.map(function (param) {
      var required = true;

      // If the param is annotated with a ? at the end, the param is optional
      if (param[param.length - 1] === '?') {
        param = param.slice(0, -1);
        required = false;
      }

      let parse = req.params[param] || req.query[param];
      if (req.body && req.body[param]) {
        parse = req.body[param];
      }

      if (!parse && required) {
        err.push(new ValidationError(`Missing required parameter: ${param}`));
      }

      // Dump the param to res.locals
      // So it can be rendered on confirmation pages and the like
      res.locals.permitAPI[param] = parse;
      return parse;
    });

    if (err.length > 0) {
      return next(new ValidationError(err));
    }

    req.permitStore[op](...args, function (err, result) {
      res.locals.permitAPI.result = result;

      if (err) {
        var error = new Error('An occured error in express-permit\'s store.\n' +
                              'See Error.Additional for more details');
        error.additional = err;
        next(err);
      }

      next();
    });
  };
}

// Users =======================================================================

exports.create = op('create', 'username', 'permit');

exports.read = op('read', 'username');

exports.update = op('update', 'username', 'permit');

exports.destroy = op('destroy', 'username');

// Permission Operations -------------------------------------------------------

exports.addPermission = op('addPermission', 'username', 'permission', 'suite?');

exports.removePermission = op(
  'removePermission', 'username', 'permission', 'suite?'
);

exports.blockPermission = op(
  'blockPermission', 'username', 'permission', 'suite?'
);

// Group Operations ------------------------------------------------------------

exports.addGroup = op('addGroup', 'username', 'group');

exports.removeGroup = op('removeGroup', 'username', 'group');

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

exports.createGroup = op('createGroup', 'group', 'permissions');

exports.readGroup = op('readGroup', 'group');

exports.updateGroup = op('updateGroup', 'group', 'permissions');

exports.destroyGroup = op('destroyGroup', 'group');

// Permission Operations -------------------------------------------------------

exports.addGroupPermission = op(
  'addGroupPermission', 'group', 'permission', 'suite?'
);

exports.removeGroupPermission = op(
  'removeGroupPermission', 'group', 'permission', 'suite?'
);

exports.blockGroupPermission = op(
  'blockGroupPermission', 'group', 'permission', 'suite?'
);

