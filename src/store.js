'use strict';
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
