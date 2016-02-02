'use strict';

var supertest      = require('supertest');
var expect         = require('chai').expect;

var simple         = require('./fixtures/simple');
var group          = require('./fixtures/group');
var trackedSimple  = require('./fixtures/trackedSimple');
var trackedGroup   = require('./fixtures/trackedGroup');
//var complex        = require('./fixtures/complex');

var sharedBehavior = require('./fixtures/sharedBehavior.js');

describe('Simple use', function() {
  sharedBehavior(simple);
});

describe('Group use', function() {
  sharedBehavior(group);
});

describe('Tracked simple use', function() {
  sharedBehavior(trackedSimple);
  it('should create a permissions tree', function(done) {
    var agent = supertest.agent(trackedSimple);

    var expectedSimpleMap = {'root': ['have-fun']}; 
    testTree(agent, expectedSimpleMap, done);
  });
});

describe('Tracked group use', function() {
  sharedBehavior(trackedGroup);
});

describe('Complex use', function() {
  //sharedBehavior(complex);
})

function testTree(agent, expectedTree, done) {
  login(agent, function(err, agent) {
    agent
    .get('/tree')
    .expect(200)
    .end(function(err, res) {
      expect(res.body).to.deep.equal(expectedTree); 
      done();
    });
  });
}

function login(agent, callback) {
  agent
  .get('/login/awesome-user')
  .expect(200)
  .end(function(err) {
    if (err) throw err;
    agent
    .get('/')
    .expect(200) 
    .end(function(err) {
      callback(err, agent);
    });
  });
}


