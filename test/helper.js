'use strict';

/*
 * _   _      _
 *| | | | ___| |_ __   ___ _ __ ___
 *| |_| |/ _ \ | '_ \ / _ \ '__/ __|
 *|  _  |  __/ | |_) |  __/ |  \__ \
 *|_| |_|\___|_| .__/ \___|_|  |___/
 *             |_|
 */

const chai           = require('chai');
const dirtyChai      = require('dirty-chai');
const expect         = chai.expect;
chai.use(dirtyChai);

function login(user, agent, callback) {
  agent
  .get(`/login/${user}`)
  .expect(200)
  .end(err => {
    if (err) throw err;
    callback();
  });
}

exports.testTree = function testTree(agent, expectedTree, done) {
  login('awesome-user', agent, () => {
    agent
    .get('/tree')
    .expect(200)
    .end((err, res) => {
      expect(err).to.not.exist();
      expect(res.body).to.deep.equal(expectedTree);
      done();
    });
  });
};

exports.login = login;
