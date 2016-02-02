'use strict';

var Express = require('express');

var amusementRouter     = Express.Router();
var moarAmusementRouter = Express.Router();

var boringRouter        = Express.Router();
var moarBoringRouter    = Express.Router();

var baseRouter          = Express.Router();

var root = require('../../src/index.js').tag;

var amusement = require('../../src/index.js').tag.group('amusement', amusementRouter);
var boring = require('../../src/index.js').tag.group('boring', boringRouter);

var moarAmusement = require('../../src/index.js').tag.group('amusement', moarAmusementRouter);
var moarBoring = require('../../src/index.js').tag.group('moarBoring', moarBoringRouter);

baseRouter.use(root('enter-park'));

baseRouter.get('/ticket-booth', function(req, res) {
  if (req.permits && req.permits.boring) {
    return res.send('you may enter, but you are only allowed to be bored!');
  } 
  res.send('you may enter!!');
});

amusementRouter.get('/rides', amusement('go-on-rides'), function(req, res) {
  res.send('whee!');
});

amusementRouter.get('/popcorn', amusement('eat-popcorn'), function(req, res) {
  res.send('omnomnomnomnom');
})

boringRouter.get('/twiddle', boring('be-bored'), function(req, res) {
  res.send('twiddling thumbs is actually entertaining after a few hours...');
})

boringRouter.get('/shuffle-dirt', boring('be-bored'), function(req, res) {
  res.send('*cough* cough*');
})

moarAmusementRouter.get('/games', moarAmusement('play-games'), 
  function(req, res) {
    res.send('I think these might be rigged...');  
});

moarBoringRouter.get('/look-bored', moarBoring('be-boring'),
  function(req, res) {
    res.send('I\'m boooooored.');
  }
)

baseRouter.use(
  amusementRouter, moarAmusementRouter, boringRouter, moarBoringRouter
);

var app = require('./common')(baseRouter, {
      'awesome-user' : {
        'amusement' : {
          'have-fun' : true,
        }
      },
      'terrible-user' : {
        'amusement' : {
          'have-fun' : false,
        }
      },
    });

module.exports = app;

