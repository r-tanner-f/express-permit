# express-permit

## Loading Permissions
Start by loading the permissions...

Where do we load permissions from? Need to be flexible... Define where express-permit is to store the groups. Load the permissions explicitily somewhere -- dont *force* it to be on every request, but do allow it if we're using an efficient key/value store. Maybe create drivers for the module to access MongoDB initially? Then it's all contained within the module. Yes, that's pretty clean... Move in to a key/value store of some sort later.


## The Permissions Object
So, we've defined where to get the goods from, and when to get the goods. Now we mash it together (false takes precedence) in a permissions object that looks something like this:

``` javascript
{
  coupons: {
    create: false,
    retrieve: true,
    update: true,
    delete: false,
  },
  sales: {
    monthlyTotal: true,
    dailyTotal: true,
  },
}
```

A missing property can also imply false. This means we have to walk the object carefully. Is that what we want? Probably have to, otherwise the introduction of a new group could cause things to throw.

## Permissions Object Storage
Now, where do we stuff this permissions object? Do we force it to be on the session? We have to get something out of the session either way, so we may as well. May want to allow configuration on where the permissions object lands... In any case, we'll default to `req.session.permissions`.

## Permissions Object Setting

So, we can add a blip of code somewhere to set the permissions. If it's on all requests, do we update every time? How much do we update? Do we cache anything? Urg... Let's go through some possibilities:


### Simplest: Update only on login
This kinda sucks because any permissions changes won't get picked up until they log in and log out. This means we have to be able to force a logout, otherwise a permissions goof could lead to a user having access to something they shouldn't until they log out.

On login, we simply pull the user's permission group and their explicit permissions, mash them together, and stuff it in to the session.

### Tough on datastore: Update on every request
Request comes in. Pull both explicit permissions and group permissions each time. Add them to req.local and process later down the pipe.

MongoDB would get tapped *twice* on every admin panel request here... This would not scale well, and would probably require a key/value store. Even then, it's the double request that worries me...

### Complicated: Update on every request intelligently (Winner?)
Request comes in. Pull the explicit permissions of the user and the group they belong to. Keep the group permissions in memory. If a group gets modified, make sure to update the in-memory permissions (how?). Or... Do we rely on a key/value store's caching ability?

--
I'm starting to feel like the last one is best, but something is nagging me about it... Lack of it being on the session? We're not taking advantage of session at all. But how else do we keep the user from having to log in and out?

The session object is escaped in MongoDB... I don't think there's a clean way of using the session that would really gain us anything. We can't update it directly on permissions change. We can set a flag saying permissions have changed but... What does that really gain us?

Could we store the session id in a separate db and then expire sessions that... Screw all that. That's just going to force a logout. Or we parse the session, modify it, and store it again, which is also messy.

http://funcptr.net/2013/08/25/user-sessions,-what-data-should-be-stored-where-/

## Building the permissions tree
Need some way to build the entire permissions tree so that we don't have to continually update the permissions settings page. How do we get the permissions object back to the main app or whatever? Or... do we just store it in the db? (or whatever our storage is) I guess that could make sense. On second thought... it could get messy. All apps will write to the db on startup or something goofy. What's the record even called? And what if there's multiple permissions setups?

I'm kind of thinking about storing it somewhere on the router... Then walking through the middleware of the app? Or maybe hooking to an event?

If I don't make this tree a singleton though... how do I know where to look when I go to bring up the permission tree?

Hmm... Looks like functions can be named on the router...

Okay, so if I name the function it shows up on router.stack. I could find all the permissions stuff by returning a named function (right? need to confirm it's happy on the get... or wait...)

Anyway... the router gets `app.use`d, then it shows up in `app._router.stack[i].handle.stack`, which is a lot messier to access... And judging by the underscore I may not want to do it at all. What about a combination of stack stuff and the mount event?

Eh, no mount event for routers.

Now what?

Could rely on `require`'s caching but... https://nodejs.org/api/modules.html#modules_module_caching_caveats

I can still stuff a new property on to the router and access it later... I wish there was an `on('mount')` for this.

I guess I could try both. Stuff it on the property AND rely on the caching, then decide which is better later... Or even add a central store to the list...

## Locals

the `permit()` thing will add the permissions tree to res.locals so that Jade can play with it.

