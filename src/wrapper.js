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
 * @param {user} [user] User returned by the Permit Store.
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
  for (var i = 0; i < user.groupPermissions.length; i++) {
    let group = user.groupPermissions[i];

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

// If no suite is specified, default to 'root'
function defaultSuite(args) {
  if (!args.suite) {
    args.suite = 'root';
  }
}

// We will silently fix a missing root suite -- for simplicity's sake
function fixRoot(permissions) {
  if (!permissions.root) {
    permissions.root = {};
  }

  return permissions;
}

/**
 * The Permit Store is exposed on <code>req.permitStore</code>.
 * Interacting with the PermitStore directly allows for greater customization.
 * For convenience, the drop-in API middleware is sufficient for many tasks.
 * <br><br>
 * See <code>express-permit/api</code> for more details on each operation.
 * Documentation here is intentionally brief.
 * @name PermitStore
 * @class
 */
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

  /**
   * Read all the users in the PermitStore.
   * @memberof PermitStore
   * @name readAll
   * @function
   * @param {Function} callback
   * @example
   * app.get('/users', function (req, res, next) {
   *   req.permitStore.readAll(function (err, users) {
   *      res.render(allUsersTemplate, {users: users});
   *   });
   * });
   */
  readAll(callback) {
    this._defer(() => this.store.readAll(callback));
  }

  /**
   * Read all groups in the PermitStore.
   * @memberof PermitStore
   * @name readAllGroups
   * @function
   * @param {Function} callback
   * @example
   * app.get('/groups', function (req, res, next) {
   *   req.permitStore.readAllGroups(function (err, groups) {
   *      res.render(allGroupsTemplate, {groups: groups});
   *   });
   * });
   */
  readAllGroups(callback) {
    this._defer(() => {
      this.store.readAllGroups(function (err, result) {
        callback(err, result);
      });
    });
  }

  // Users =====================================================================

  /**
   * Create a user
   * @memberof PermitStore
   * @name create
   * @function
   * @param {String} username
   * @param {User} user
   * @param {Function} callback
   * @example
   * app.post('/user', function (req, res, next) {
   *   req.permitStore.create(req.body.username, req.body.user, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  create(args, callback) {
    this._validateAndRun(
      'create',
      args,
      () => this.store.create(args.username, args.user, callback),
      callback
    );
  }

  /**
   * Read a user
   * @memberof PermitStore
   * @name read
   * @function
   * @param {String} username
   * @param {Function} callback
   * @example
   * app.get('/user/:username', function (req, res, next) {
   *   req.permitStore.create(req.param.username, function (err, user) {
   *      res.render('user', {user: user});
   *   });
   * });
   */
  read(args, callback) {
    this._validateAndRun(
      'read',
      args,
      () => this.store.read(args.username, callback),
      callback
    );
  }

  /**
   * Get the resulting set of permissions for a user.
   * The RSOP for the currently logged in user is already available on
   * <code>res.locals.permit</code>.
   * @memberof PermitStore
   * @name rsop
   * @function
   * @param {String} username
   * @param {Function} callback
   * @example
   * app.get('/user/:username', function (req, res, next) {
   *   req.permitStore.rsop(req.param.username, function (err, user) {
   *      res.render('user', {user: user});
   *   });
   * });
   */
  rsop(args, callback) {
    this._validateAndRun(
      'rsop',
      args,
      () => this.store.rsop(args.username, function (err, user) {
        if (err) {
          return callback(err);
        }
        user.permit = compilePermissions(user);
        callback(null, user);
      }),

      callback
    );
  }

  /**
   * Update a user.
   * @memberof PermitStore
   * @name update
   * @function
   * @param {String} username
   * @param {Object} user
   * @param {Function} callback
   * @example
   * app.put('/user/:username', function (req, res, next) {
   *   req.permitStore.update(req.param.username, req.body.user, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  update(args, callback) {
    this._validateAndRun(
      'update',
      args,
      () => this.store.update(args.username, args.user, callback),
      callback
    );
  }

  /**
   * Delete a user.
   * @memberof PermitStore
   * @name destroy
   * @function
   * @param {String} username
   * @param {Function} callback
   * @example
   * app.delete('/user/:username', function (req, res, next) {
   *   req.permitStore.delete(req.param.username, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  destroy(args, callback) {
    this._validateAndRun(
      'destroy',
      args,
      () => this.store.destroy(args.username, callback),
      callback
    );
  }

  /**
   * Sets a user's permissions to admin.
   * @memberof PermitStore
   * @name setAdmin
   * @function
   * @param {String} username
   * @param {Function} callback
   * @example
   * app.get('/user/setAdmin/:username', function (req, res, next) {
   *   req.permitStore.setAdmin(req.param.username, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  setAdmin(args, callback) {
    this._validateAndRun(
      'setAdmin',
      args,
      () => this.store.setAdmin(args.username, callback),
      callback
    );
  }

  /**
   * Sets a user's permissions to owner.
   * @memberof PermitStore
   * @name setOwner
   * @function
   * @param {String} username
   * @param {Function} callback
   * @example
   * app.get('/user/setOwner/:username', function (req, res, next) {
   *   req.permitStore.setOwner(req.param.username, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  setOwner(args, callback) {
    this._validateAndRun(
      'setOwner',
      args,
      () => this.store.setOwner(args.username, callback),
      callback
    );
  }

  // Permission Operations -----------------------------------------------------

  /**
   * Sets a single suite/permission pair to true.
   * @memberof PermitStore
   * @name addPermission
   * @function
   * @param {String} username
   * @param {String} permission
   * @param {String} [suite]
   * @param {Function} callback
   * @example
   * app.get('/user/:username/addPermission/:suite?/:permission', function (req, res, next) {
   *   req.permitStore.addPermission(req.param.username, req.param.permission, req.param.suite, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
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

  // Group Operations ----------------------------------------------------------

  /**
   * Updates a user's groups
   * @name updateGroups
   * @function
   * @param {String} username
   * @param {String[]} groups
   * @param {Function} callback
   * @example
   * app.post('/user/:username/updateGroups', function (req, res, next) {
   *   req.permitStore.updateGroups(req.params.username, req.params.group), function (err, result) {
   *     res.render('confirmation', {result: result});
   *   });
   * })
   */
  updateGroups(args, callback) {
    this._validateAndRun(
      'updateGroups',
      args,
      () => this.store.updateGroups(args.username, args.groups, callback),
      callback
    );
  }

  /**
   * Adds a user to a group.
   * @memberof PermitStore
   * @name addGroup
   * @function
   * @param {String} username
   * @param {String} group
   * @param {Function} callback
   * @example
   * app.get('/user/:username/addGroup/:group', function (req, res, next) {
   *   req.permitStore.addGroup(req.params.username, req.params.group, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  addGroup(args, callback) {
    this._validateAndRun(
      'addGroup',
      args,
      () => this.store.addGroup(args.username, args.group, callback),
      callback
    );
  }

  /**
   * Removes a user from group.
   * @memberof PermitStore
   * @name removeGroup
   * @function
   * @param {String} username
   * @param {String} group
   * @param {Function} callback
   * @example
   * app.get('/user/:username/removeGroup/:group', function (req, res, next) {
   *   req.permitStore.removeGroup(req.params.username, req.params.group, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
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
  /**
   * Creates a new group
   * @memberof PermitStore
   * @name createGroup
   * @function
   * @param {String} group
   * @param {Object} permissions
   * @param {Function} callback
   * @example
   * app.post('/group', function (req, res, next) {
   *   req.permitStore.createGroup(req, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
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

  /**
   * Reads a group
   * @memberof PermitStore
   * @name readGroup
   * @function
   * @param {String} group
   * @param {Function} callback
   * @example
   * app.get('/group/:group', function (req, res, next) {
   *   req.permitStore.readGroup(req.param.group, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  readGroup(args, callback) {
    this._validateAndRun(
      'readGroup',
      args,
      () => this.store.readGroup(args.group, callback),
      callback
    );
  }

  /**
   * Updates a group
   * @memberof PermitStore
   * @name createGroup
   * @function
   * @param {String} group
   * @param {Object} permissions
   * @param {Function} callback
   * @example
   * app.put('/group', function (req, res, next) {
   *   req.permitStore.updateGroup(req.body.group, req.body.permissions, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
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

  /**
   * Deletes a group
   * @memberof PermitStore
   * @name destroyGroup
   * @function
   * @param {String} group
   * @param {Function} callback
   * @example
   * app.delete('/group/:group', function (req, res, next) {
   *   req.permitStore.destroyGroup(req.params.group, function (err, result) {
   *      res.render('confirmation', {result: result});
   *   });
   * });
   */
  destroyGroup(args, callback) {
    this._validateAndRun(
      'destroyGroup',
      args,
      () => this.store.destroyGroup(args.group, callback),
      callback
    );
  }
}

module.exports = StoreWrapper;

