'use strict';

var validation = require('./validation');
var ValidationError = validation.ValidationError;

// Users =======================================================================

exports.create = function create(req, res, next) {
  parse(req, next, 'username', 'permit', function (args) {
    req.permitStore.create(...args, errOr(next));
  });
};

exports.read = function get(req, res, next) {
  var args = parse(req, 'username');
  req.permitStore.read(...args, errOr(next));
};

exports.update = function update(req, res, next) {
  req.permitStore.update(...parse(req, 'username', 'permit'), errOr(next));
};

exports.destroy = function destroy(req, res, next) {
  req.permitStore.destroy(...parse(req, 'username'), errOr(next));
};

// Permission Operations -------------------------------------------------------

exports.addPermission = function addPermission(req, res, next) {
  var args = parse(req, 'username', 'permission', 'suite?');
  if (args instanceof ValidationError) {
    return next(args);
  }

  req.permitStore.addPermission(...args, errOr(next));
};

exports.removePermission = function removePermission(req, res, next) {
  var args = parse(req, 'username', 'permission', 'suite?');
  if (args instanceof ValidationError) {
    return next(args);
  }

  req.permitStore.removePermission(...args, errOr(next));
};

exports.blockPermission = function blockPermission(req, res, next) {
  req.permitStore.blockPermission(
    ...parse(req, 'username', 'permission', 'suite?'), errOr(next)
  );
};

// Group Operations ------------------------------------------------------------

exports.addGroup = function addGroup(req, res, next) {
  req.permitStore.addGroup(...parse(req, 'username', 'group'), errOr(next));
};

exports.removeGroup = function removeGroup(req, res, next) {
  req.permitStore.removeGroup(...parse(req, 'username', 'group'), errOr(next));
};

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

exports.createGroup = function createGroup(req, res, next) {
  req.permitStore.createGroup(
    ...parse(req, 'group', 'permissions'), errOr(next)
  );
};

exports.readGroup = function readGroup(req, res, next) {
  req.permitStore.readGroup(...parse(req, 'group'), errOr(next));
};

exports.updateGroup = function updateGroup(req, res, next) {
  req.permitStore.updateGroup(
    ...parse(req, 'group', 'permissions'),
    errOr(next));
};

exports.destroyGroup = function destroyGroup(req, res, next) {
  req.permitStore.deleteGroup(...parse(req, 'group'), errOr(next));
};

// Permission Operations -------------------------------------------------------

exports.addGroupPermission = function addGroupPermission(req, res, next) {
  req.permitStore.addGroupPermission(
    ...parse(req, 'group', 'permission', 'suite?'),
    errOr(next)
  );
};

exports.removeGroupPermission = function removeGroupPerm(req, res, next) {
  req.permitStore.removeGroupPermission(
    ...parse(req, 'group', 'permission', 'suite?'), errOr(next)
  );
};

exports.blockGroupPermission = function blockGroupPermission(req, res, next) {
  req.permitStore.blockGroupPermission(
    ...parse(req, 'group', 'permission', 'suite?'), errOr(next)
  );
};

// Helpers =====================================================================
function parse() {
  var err = [];
  var req = arguments[0];
  var params = Array.prototype.slice.call(arguments, 1);

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

    return parse;
  });

  if (err.length > 0) {
    return new ValidationError(err);
  }

  return args;
}

function errOr(next) {
  return function (err) {
    if (err) {
      var error = new Error('An occured error in express-permit\'s store.\n' + //jshint ignore:line
                            'See Error.Additional for more details');
      error.additional = err;
    }

    next();
  };
}
