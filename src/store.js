'use strict';

/*
 *  ____  _
 * / ___|| |_ ___  _ __ ___
 * \___ \| __/ _ \| '__/ _ \
 *  ___) | || (_) | | |  __/
 * |____/ \__\___/|_|  \___|
 */

const errors = require('./errors');
const EventEmitter = require('events').EventEmitter;

class Store extends EventEmitter {
  constructor() {
    super();
    this.error = {};
    this.error.NotFound = errors.NotFound;
    this.error.Conflict = errors.Conflict;

    this.state = 'disconnected';
  }

  changeState() {
    const newState = arguments[0];

    if (this.state !== newState) {
      this.state = newState;
      this.emit.apply(this, arguments);
    }
  }
}

module.exports = Store;
