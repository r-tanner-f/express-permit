'use strict';

/*
 * _____                _     _           _                 _
 *|_   _| __ ___  _   _| |__ | | ___  ___| |__   ___   ___ | |_
 *  | || '__/ _ \| | | | '_ \| |/ _ \/ __| '_ \ / _ \ / _ \| __|
 *  | || | | (_) | |_| | |_) | |  __/\__ \ | | | (_) | (_) | |_
 *  |_||_|  \___/ \__,_|_.__/|_|\___||___/_| |_|\___/ \___/ \__|
 */

var supertest      = require('supertest');

var testTree       = require('./helper.js').testTree;

var simple         = require('./fixtures/troubleshooting/simple');
var suite          = require('./fixtures/troubleshooting/suite');
var trackedSimple  = require('./fixtures/troubleshooting/trackedSimple');
var trackedSuite   = require('./fixtures/troubleshooting/trackedSuite');
var sharedBehavior = require('./fixtures/troubleshooting/sharedBehavior.js');

describe('Troubleshooting Tests: ', function () {
  describe('Simple use', function () {
    sharedBehavior(simple);
  });

  describe('Suite use', function () {
    sharedBehavior(suite);
  });

  describe('Tracked simple use', function () {
    sharedBehavior(trackedSimple);
    it('should create a permissions tree', function (done) {
      var agent = supertest.agent(trackedSimple);

      var expectedSimpleMap = { root: ['haveFun'] };
      testTree(agent, expectedSimpleMap, done);
    });
  });

  describe('Tracked suite use', function () {
    sharedBehavior(trackedSuite);
    it('should create a permissions tree', function (done) {
      var agent = supertest.agent(trackedSuite);
      var expectedSimpleMap = { amusement: ['haveFun'] };
      testTree(agent, expectedSimpleMap, done);
    });
  });
});

