# express-permit

Express Permit was a permissions checking and handling module I created while working on a custom e-Commerce platform at Orchard Corset. 

This module has since been deprecated, and much of the documentation I'd written has been lost, but I'll try to recreate some of it in this README.md (as well as hosting the jsdocs at [rtannerf.com/express-permit](https://rtannerf.com/express-permit))

Keep in mind this was written just a few months after io.js and Node.js merged. JavaScript has changed a surprising amount since then. At the time, my use of arrow functions was controversial. :)

## Overview

I wanted to emulate the "just works" drop-in style of Express Session, along with support for multiple permissions stores as at the time I wasn't confident that storing permissions in MongoDB would be fast enough (it was more than sufficient).

```javascript
const permissions = require('express-permit')
const MongoPermitStore = require('express-permit-mongodb')

const store = new MongoPermitStore({
  url: 'mongodb://localhost/expressPermit',
}));

app.use(permissions({
  store,
  username: req => req.session.username
}))
```

From there you could simply add some 'check' middleware to see if the user had the approrpiate permissions:

```javascript
const check = permissions.check; 

app.get('/ticket-booth', check('enter-park', 'basic'), (req, res) => {
  res.send('you may enter!!');
});
```

## Full docs

I put JsDocs on just about everything. This is a good place to start:

https://rtannerf.com/express-permit/module-express-permit_api.html

## Various Features

- Support for groups with 'all' permissions

```javascript
const groups = {
  employees: {
    amusement: 'all',
    moarAmusement: 'all',
    boring: 'all',
  },
  'park-attendee': {
    amusement: {
      'go-on-rides': true,
      'eat-popcorn': true,
    },
  }
};
```

- Owner and Admin permissions

```javascript
proprietor: {
  permissions: 'owner',
}

manager: {
  permissions: 'admin',
}
```

- Middleware for common admin tasks 

```javascript
app.get('/addGroup/:username', permissions.api.addGroup, function(req, res, next) {
  res.render('/confirmation');
});
```

- Pug.js (then called Jade) helpers

```pug
h1 #{permitAPI.user.username}
each group in permitAPI.user.groups
  h2= user.username
  h3 Groups
  ul
    each group in user.groups
      li= group
```
