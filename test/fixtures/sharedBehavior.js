var supertest = require('supertest');

module.exports = function(app) {
  it('should forbid access without session', function(done) {
    var agent = supertest.agent(app);

    agent
    .get('/')
    .expect(403, 'Go away!!')
    .end(function(err) {
      if (err) throw err;
      done();
    });
  });

  it('should allow access to awesome-user', function(done) {
    var agent = supertest.agent(app);

    agent
    .get('/login/awesome-user')
    .expect(200)
    .end(function(err) {
      if (err) throw err;
      agent
      .get('/')
      .expect(200, done);
    });
  });

  it('should forbid access to terrible-user', function(done) {
    var agent = supertest.agent(app);

    agent
    .get('/login/terrible-user')
    .expect(200)
    .end(function(err) {
      if (err) throw err;
      agent
      .get('/')
      .expect(403, done);
    });
  });
};

