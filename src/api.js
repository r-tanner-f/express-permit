'use strict';

var descriptors = require('./descriptors');

function runOp(op, params) {
  return function (req, res, next) {
    var args = {};

    params.forEach(function (param) {

      // Remove '?' annotation from descriptor.
      if (param[param.length - 1] === '?') {
        param = param.slice(0, -1);
      }

      // Check for parameter in req body, param, or query in that order.
      let parse = req.params[param] || req.query[param];
      if (req.body && req.body[param]) {
        parse = req.body[param];
      }

      // Dump the param to res.locals.
      // So it can be rendered on confirmation pages and the like.
      res.locals.permitAPI[param] = parse;

      // Add parameter to our arguments object.
      args[param] = parse;
    });
    debugger;
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

// Maybe enumerate the ops manually for the sake of documentation and testing
for (let op in descriptors) {
  exports[op] = runOp(op, descriptors[op]);
}
