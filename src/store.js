'use strict';

var validation = require('./validation');
var ValidationError = validation.ValidationError;
var validators = validation.validators;

class ErrCollector {
  constructor() {
    var errs = [];
    Object.defineProperty(errs, 'add', {
      enumerable: false,
      value: function add(err) {
        if (err) {errs.push(err);}
      },
    });
    return errs;
  }
}

function validateAndRun(validation, op, callback) {
  if (!callback) {
    throw new Error('Callback is required');
  }

  var err = new ErrCollector();
  validation.forEach(function (v) {
    err.add(v);
  });

  if (err.length) {
    return callback(new ValidationError(err));
  }

  op();
}

class StoreWrapper {
  constructor(store) {
    this.store = store;
  }

  // Users =====================================================================
  create(username, permit, callback) {
    validateAndRun(
      [
        validators.username(username),
        validators.permit(permit),
      ],
      () => this.store.create(username, permit, callback),
      callback
    );
  }

  read(username, callback) {
    validateAndRun(
      [validators.username(username)],
      () => this.store.read(username, callback),
      callback
    );
  }

  update(username, permit, callback) {
    validateAndRun(
      [
        validators.username(username),
        validators.permit(permit),
      ],
      () => this.store.update(username, permit, callback),
      callback
    );
  }

  destroy(username, callback) {
    validateAndRun(
      [validators.username(username)],
      () => this.store.destroy(username, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addPermission(username, permission, suite, callback) {
    if (typeof suite === 'function' && !callback) {
      callback = suite;
      suite = 'root';
    }

    if (!suite) {
      suite = 'root';
    }

    validateAndRun(
      [
        validators.username(username),
        validators.permission(permission),
        validators.suite(suite),
      ],

      () => this.store.addPermission(username, permission, suite, callback),
      callback
    );
  }

  removePermission(username, permission, suite, callback) {
    if (typeof suite === 'function' && !callback) {
      callback = suite;
      suite = 'root';
    }

    if (!suite) {
      suite = 'root';
    }

    validateAndRun(
      [
        validators.username(username),
        validators.permission(permission),
        validators.suite(suite),
      ],
      () => this.store.removePermission(username, permission, suite, callback),
      callback
    );
  }

  blockPermission(username, permission, suite, callback) {
    if (typeof suite === 'function' && !callback) {
      callback = suite;
      suite = 'root';
    }

    if (!suite) {
      suite = 'root';
    }

    validateAndRun(
      [
        validators.username(username),
        validators.permission(permission),
        validators.suite(suite),
      ],
      () => this.store.blockPermission(username, permission, suite, callback),
      callback
    );
  }

  // Group Operations ----------------------------------------------------------
  addGroup(username, group, callback) {
    validateAndRun(
      [validators.username(username), validators.group(group)],
      () => this.store.addGroup(username, group, callback),
      callback
    );
  }

  removeGroup(username, group, callback) {
    validateAndRun(
      [validators.username(username), validators.group(group)],
      () => this.store.removeGroup(username, group, callback),
      callback
    );
  }

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
  createGroup(group, permissions, callback) {
    validateAndRun(
      [validators.group(group), validators.permissions(permissions)],
      () => this.store.createGroup(group, permissions, callback),
      callback
    );
  }

  readGroup(group, callback) {
    validateAndRun(
      [validators.group(group)],
      () => this.store.readGroup(group, callback),
      callback
    );
  }

  updateGroup(group, permissions, callback) {
    validateAndRun(
      [validators.group(group), validators.permissions(permissions)],
      () => this.store.updateGroup(group, permissions, callback),
      callback
    );
  }

  destroyGroup(group, callback) {
    validateAndRun(
      [validators.group(group)],
      () => this.store.destroyGroup(group, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addGroupPermission(group, permission, suite, callback) {
    if (typeof suite === 'function' && !callback) {
      callback = suite;
      suite = 'root';
    }

    if (!suite) {
      suite = 'root';
    }

    validateAndRun(
      [
        validators.group(group),
        validators.permission(permission),
        validators.suite(suite),
      ],
      () => this.store.addGroupPermission(group, permission, suite, callback),
      callback
    );
  }

  removeGroupPermission(group, permission, suite, callback) {
    if (typeof suite === 'function' && !callback) {
      callback = suite;
      suite = 'root';
    }

    if (!suite) {
      suite = 'root';
    }

    validateAndRun(
      [
        validators.group(group),
        validators.permission(permission),
        validators.suite(suite),
      ],
      () => this.store.removeGroupPermission(
        group, permission, suite, callback
      ),
      callback
    );
  }

  blockGroupPermission(group, permission, suite, callback) {
    validateAndRun(
      [
        validators.group(group),
        validators.permission(permission),
        validators.suite(suite),
      ],
      () => this.store.blockGroupPermission(
        group, permission, suite, callback
      ),
      callback
    );
  }
}

exports.wrapper = StoreWrapper;
