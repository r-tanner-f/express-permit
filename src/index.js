'use strict';

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
