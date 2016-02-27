'use strict';

/*
 *  ____  _
 * / ___|| |_ ___  _ __ ___
 * \___ \| __/ _ \| '__/ _ \
 *  ___) | || (_) | | |  __/
 * |____/ \__\___/|_|  \___|
 */

var errors = require('./errors');
var EventEmitter = require('events').EventEmitter;

class Store extends EventEmitter {
  constructor() {
    super();
    this.NotFoundError = errors.NotFound;
    this.Conflict = errors.Conflict;

    this.state = 'disconnected';
  }

  changeState() {
    let newState = arguments[0];
    let args = Array.prototype.slice.call(arguments, 1);

    if (this.state !== newState) {
      this.state = newState;
      this.emit(newState, ...args);
    }
  }
}

module.exports = Store;
