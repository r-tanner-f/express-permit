'use strict';

var Express = require('express');
var app = Express();
var router = Express.Router();

var expressPermit = require('../src/index.js');
var permit = expressPermit.group('foo');

router.get('/', permit('have-fun'), function(req, res) {
    res.send('yaaay');
});

app.use(router);
