'use strict';

var validate = require('./validation').validateOp;

function validateAndRun(opname, args, op, callback) {
  if (!callback) {
    throw new Error('Callback is required');
  }

  var err = validate(opname, args);
  if (err) {
    return callback(err);
  }

  op();
}

function defaultSuite(args) {
  if (!args.suite) {
    args.suite = 'root';
  }
}

class StoreWrapper {
  constructor(store) {
    this.store = store;
  }

  // Users =====================================================================

  create(args, callback) {
    validateAndRun(
      'create',
      args,
      () => this.store.create(args.username, args.permit, callback),
      callback
    );
  }

  read(args, callback) {
    validateAndRun(
      'read',
      args,
      () => this.store.read(args.username, callback),
      callback
    );
  }

  update(args, callback) {
    validateAndRun(
      'update',
      args,
      () => this.store.update(args.username, args.permit, callback),
      callback
    );
  }

  destroy(args, callback) {
    validateAndRun(
      'destroy',
      args,
      () => this.store.destroy(args.username, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addPermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'addPermission',
      args,
      () => this.store.addPermission(
        args.username, args.permission, args.suite, callback
      ),
      callback
    );
  }

  removePermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'removePermission',
      args,
      () => this.store.removePermission(
        args.username, args.permission, args.suite, callback
      ),
      callback
    );
  }

  blockPermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'blockPermission',
      args,
      () => this.store.blockPermission(
        args.username, args.permission, args.suite, callback
      ),
      callback
    );
  }

  // Group Operations ----------------------------------------------------------
  addGroup(args, callback) {
    validateAndRun(
      'addGroup',
      args,
      () => this.store.addGroup(args.username, args.group, callback),
      callback
    );
  }

  removeGroup(args, callback) {
    validateAndRun(
      'removeGroup',
      args,
      () => this.store.removeGroup(args.username, args.group, callback),
      callback
    );
  }

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
  createGroup(args, callback) {
    validateAndRun(
      'createGroup',
      args,
      () => this.store.createGroup(args.group, args.permissions, callback),
      callback
    );
  }

  readGroup(args, callback) {
    validateAndRun(
      'readGroup',
      args,
      () => this.store.readGroup(args.group, callback),
      callback
    );
  }

  updateGroup(args, callback) {
    validateAndRun(
      'updateGroup',
      args,
      () => this.store.updateGroup(args.group, args.permissions, callback),
      callback
    );
  }

  destroyGroup(args, callback) {
    validateAndRun(
      'destroyGroup',
      args,
      () => this.store.destroyGroup(args.group, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addGroupPermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'addGroupPermission',
      args,
      () => this.store.addGroupPermission(
        args.group, args.permission, args.suite, callback
      ),
      callback
    );
  }

  removeGroupPermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'removeGroupPermission',
      args,
      () => this.store.removeGroupPermission(
        args.group, args.permission, args.suite, callback
      ),
      callback
    );
  }

  blockGroupPermission(args, callback) {
    defaultSuite(args);

    validateAndRun(
      'blockGroupPermission',
      args,
      () => this.store.blockGroupPermission(
        args.group, args.permission, args.suite, callback
      ),
      callback
    );
  }
}

exports.wrapper = StoreWrapper;
