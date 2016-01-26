'use strict';
/*
module.exports = function Permit (app) {
  app.permit = function(req, res, next) {
    console.log('Configuring permissions');
    next();
  };

  return function(permitGroup) {
    return function (req, res, next) {
      console.log('Checking permissions');
    }
  };
};
*/
/*
 * Three ways to collect permissions
 * 1) Manually
 * 2) On the module
 * 3) On the router
 */

function expressPermit (options) {
  var store = options.store;
  return function(req, res, next) {
    req.permits = store.get(eval(options.username));
    next();
  };
}

expressPermit.permit = function permit(name) {
  return function(req, res, next) {
    if (!req.permits[name]) {
      next('Permissions Error');
    }
    next();
  };
};

function MemoryPermits(permissions) {
  this.permissions = permissions;

  this.get = function get(id) {
    return this.permissions[id];
  };

  this.set = function set(id, permissions) {
    this.permissions[id] = permissions;
  };
}
expressPermit.MemoryPermits =  MemoryPermits;

module.exports = expressPermit;
