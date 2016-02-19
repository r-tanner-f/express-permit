'use strict';

// Users =======================================================================

exports.create = ['username', 'permit'];

exports.read = ['username'];

exports.update = ['username', 'permit'];

exports.destroy = ['username'];

// Permission Operations -------------------------------------------------------

exports.addPermission = ['username', 'permission', 'suite?'];

exports.removePermission = ['username', 'permission', 'suite?'];

exports.blockPermission = ['username', 'permission', 'suite?'];

// Group Operations ------------------------------------------------------------

exports.addGroup = ['username', 'group'];

exports.removeGroup = ['username', 'group'];

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

exports.createGroup = ['group', 'permissions'];

exports.readGroup = ['group'];

exports.updateGroup = ['group', 'permissions'];

exports.destroyGroup = ['group'];

// Permission Operations -------------------------------------------------------

exports.addGroupPermission = ['group', 'permission', 'suite?'];

exports.removeGroupPermission = ['group', 'permission', 'suite?'];

exports.blockGroupPermission = ['group', 'permission', 'suite?'];

