'use strict';

/*
 *  ____  _               __        __
 * / ___|| |_ ___  _ __ __\ \      / / __ __ _ _ __  _ __   ___ _ __
 * \___ \| __/ _ \| '__/ _ \ \ /\ / / '__/ _` | '_ \| '_ \ / _ \ '__|
 *  ___) | || (_) | | |  __/\ V  V /| | | (_| | |_) | |_) |  __/ |
 * |____/ \__\___/|_|  \___| \_/\_/ |_|  \__,_| .__/| .__/ \___|_|
 *                                            |_|   |_|
 */

var validate = require('./validation').validateOp;

/**
 * Compile a user's permission.
 * @param {Object} [user] User returned by the Permit Store.
 * @private
 */
function compilePermissions(user) {
  var permit = user.permissions;

  // If the user is no groups, is an admin, or is owner,
  // simply return the permissions.
  if (!user.groups || permit === 'admin' || permit === 'owner') {
    return permit;
  }

  // Otherwise, loop through
  for (var i = 0; i < user.groups.length; i++) {
    let group = user.groups[i];

    for (let suite in group) {

      // If user has no permissions in suite, initialize suite
      if (!permit[suite]) {permit[suite] = {};}

      // If user already has 'all' permissions in suite or the group sets 'all'
      // Set permissions in suite to 'all' and continue
      if (permit[suite].all === true || group[suite] === 'all') {
        permit[suite].all = true;
        continue;
      }

      for (let action in group[suite]) {

        // If the current action is not false, set it to the group's value
        if (permit[suite][action] !== false) {
          permit[suite][action] = group[suite][action];
        }
      }
    }
  }

  return permit;
}

function defaultSuite(args) {
  if (!args.suite) {
    args.suite = 'root';
  }
}

function fixRoot(permissions) {
  // We will silently fix root for simplicity's sake
  if (!permissions.root) {
    permissions.root = {};
  }

  return permissions;
}

class StoreWrapper {
  constructor(store) {
    this.store = store;
  }

  _defer(op) {
    if (this.store.state === 'error') {
      throw new Error('PermitStore is in an error state.');
    }

    if (this.store.state !== 'connected') {
      return this.store.once('connected', op);
    }

    return op();
  }

  _validateAndRun(opname, args, op, callback) {
    if (!callback) {
      throw new Error('Callback is required');
    }

    var err = validate(opname, args);
    if (err) {
      return callback(err);
    }

    this._defer(op);
  }

  // readAll ===================================================================

  readAll(callback) {
    this._defer(() => this.store.readAll(callback));
  }

  readAllGroups(callback) {
    this._defer(() => {
      this.store.readAllGroups(function (err, result) {
        callback(err, result);
      });
    });
  }

  // Users =====================================================================

  create(args, callback) {
    this._validateAndRun(
      'create',
      args,
      () => this.store.create(args.username, args.user, callback),
      callback
    );
  }

  read(args, callback) {
    this._validateAndRun(
      'read',
      args,
      () => this.store.read(args.username, callback),
      callback
    );
  }

  rsop(args, callback) {
    this._validateAndRun(
      'rsop',
      args,
      () => this.store.rsop(args.username, function (err, result) {
        if (err) {
          return callback(err);
        }

        callback(null, compilePermissions(result));
      }),

      callback
    );
  }

  update(args, callback) {
    this._validateAndRun(
      'update',
      args,
      () => this.store.update(args.username, args.user, callback),
      callback
    );
  }

  destroy(args, callback) {
    this._validateAndRun(
      'destroy',
      args,
      () => this.store.destroy(args.username, callback),
      callback
    );
  }

  setAdmin(args, callback) {
    this._validateAndRun(
      'setAdmin',
      args,
      () => this.store.setAdmin(args.username, callback),
      callback
    );
  }

  setOwner(args, callback) {
    this._validateAndRun(
      'setOwner',
      args,
      () => this.store.setOwner(args.username, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addPermission(args, callback) {
    defaultSuite(args);

    this._validateAndRun(
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

    this._validateAndRun(
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

    this._validateAndRun(
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
    this._validateAndRun(
      'addGroup',
      args,
      () => this.store.addGroup(args.username, args.group, callback),
      callback
    );
  }

  removeGroup(args, callback) {
    this._validateAndRun(
      'removeGroup',
      args,
      () => this.store.removeGroup(args.username, args.group, callback),
      callback
    );
  }

  // Groups ====================================================================

  // CRUD ----------------------------------------------------------------------
  createGroup(args, callback) {
    this._validateAndRun(
      'createGroup',
      args,
      () => this.store.createGroup(
        args.group,
        fixRoot(args.permissions),
        callback
      ),
      callback
    );
  }

  readGroup(args, callback) {
    this._validateAndRun(
      'readGroup',
      args,
      () => this.store.readGroup(args.group, callback),
      callback
    );
  }

  updateGroup(args, callback) {
    this._validateAndRun(
      'updateGroup',
      args,
      () => this.store.updateGroup(
        args.group,
        fixRoot(args.permissions),
        callback
      ),
      callback
    );
  }

  destroyGroup(args, callback) {
    this._validateAndRun(
      'destroyGroup',
      args,
      () => this.store.destroyGroup(args.group, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------
  addGroupPermission(args, callback) {
    defaultSuite(args);

    this._validateAndRun(
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

    this._validateAndRun(
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

    this._validateAndRun(
      'blockGroupPermission',
      args,
      () => this.store.blockGroupPermission(
        args.group, args.permission, args.suite, callback
      ),
      callback
    );
  }
}

module.exports = StoreWrapper;

