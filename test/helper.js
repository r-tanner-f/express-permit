'use strict';

var chai           = require('chai');
var dirtyChai      = require('dirty-chai');
var expect         = chai.expect;
chai.use(dirtyChai);

exports.testTree = function testTree(agent, expectedTree, done) {
  login('awesome-user', agent, function () {
    agent
    .get('/tree')
    .expect(200)
    .end(function (err, res) {
      expect(err).to.not.exist();
      expect(res.body).to.deep.equal(expectedTree);
      done();
    });
  });
};

function login(user, agent, callback) {
  agent
  .get('/login/' + user)
  .expect(200)
  .end(function (err) {
    if (err) throw err;
    callback();
  });
}

exports.login = login;
