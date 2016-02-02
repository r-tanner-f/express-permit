# express-permit

## Usage

### Simple 

``` javascript
var permit = require('express-permit').tag;

app.get('/', permit('have-fun'), function(req, res, next) {
  res.send('wheee!!');
})
```

### Groups

``` javascript
var permit = require('express-permit').tag;

app.get('/', permit('have-fun', 'amusement'), function(req, res, next) {
  res.send('wheee!!');
})
```

### Tracked Usage


#### Simple

``` javascript
var permit = require('express-permit').tag(router);

router.get('/', permit('have-fun'), function(req, res, next) {
  res.send('wheee!!');
})
```

#### Groups

``` javascript
var permit = require('express-permit').tag(router, '');

app.get('/', permit('have-fun'), function(req, res, next) {
  res.send('wheee!!');
})
```

## Misc Examples

``` javascript
/*

  permissions = {
    coupon: {
      ['create', 'view'] 
    }
  }
  userspermissions =  {
    coupon: {
      create: true
      delete: false
    }
  }

  grouppermissions = {
    coupon: {
      view: true
      delete: true
    }
  }

  grouppermissions = {
    coupon: 'admin'
  }

  userpermissions = 'admin'
*/
```
