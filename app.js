'use strict';

var express = require('express'),
passport = require('passport'),
FacebookStrategy = require('passport-facebook').Strategy,
session = require('express-session'),
bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
methodOverride = require('method-override'),
backend = require('./backend.js');

var hostname = 'http://localhost:3000';

var FACEBOOK_APP_ID = '';
var FACEBOOK_APP_SECRET = '';

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: hostname + '/auth/callback'
},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      return done(null, profile);
    });
  }
));

var app = express();

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/login', express.static('public/login'));
app.use('/checkin', express.static('public/checkin'));

app.get('/login', function(req, res) {
  res.redirect(hostname + '/login/index.html');
});

app.post('/login', function(req, res) {

  if (req.headers['x-chai-test']) {
    req.session.userEmail = req.headers['x-chai-test'];
  }

  //var name = req.body.name;
  var name = 'jon';
  var email = req.session.userEmail;
  backend.getUser(email, function(err, user) {
    if (user !== null) {
      res.redirect('/checkin');
    } else {
      backend.createUser(name, email, function(err) {
        if (err) {
          res.send('theres an error');
        }
        res.redirect('/checkin');
      });
    }
  });
});

app.get('/auth/facebook',
  passport.authenticate('facebook', {scope: 'email'}));


app.get('/auth/callback',
  passport.authenticate('facebook',
    {successRedirect: '/', failureRedirect: '/login'}));

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});

app.get('/', function(req, res) {

  if (req.session && req.session.passport && req.session.passport.user) {
    req.session.userEmail = req.session.passport.user._json.email;
    res.redirect('/checkin');
  } else {
    res.redirect('/login');
  }

});

app.use(ensureAuthenticated);

setInterval(function() {
  var date = new Date();
  backend.getExpired(function(err, expiredArray) {
    if (expiredArray.length > 0) {
      expiredArray.forEach(function(element) {
        console.log(date.toLocaleString(Date.now()) +
          ' - Nagging ' + element.user.email + ' for failing to check in for ' +
          element.group.name);
      });
    } else {
      console.log(date.toLocaleString(Date.now()) + ' - No expired users.');
    }
  });
}, 5000);

app.get('/timer', function(req, res) {
  //Can cause errors if user has no timers/groups they belong to.
  backend.getTimer(req.session.userEmail, function(err, timer, interval) {
    res.send({newTime: timer + interval - Date.now(),
     user: req.session.userEmail});
  });
});

app.get('/checkin', function(req, res) {
  var date = new Date();
  console.log(date.toLocaleString(Date.now()) + ' - User ' +
    req.session.userEmail + ' has logged in.');
  res.redirect('/checkin/checkinbutton.html');
});

app.post('/checkin', function(req, res) {
  var date = new Date();
  var email = req.body.email;
  backend.checkIn(email, function() {
    console.log(date.toLocaleString(Date.now()) +
          ' - ' + email + ' has checked in.');
    res.status(200).send('checked in!');
  });
});

app.post('/groups', function(req, res) {
  var groupName = req.body.groupName;
  var groupId = req.body.groupId;
  var adminEmail = req.session.userEmail;
  if (req.headers['x-groups-post'] === 'createGroup') {
    backend.createGroup(groupName, adminEmail, {},
     function(err, groupName, groupCreatorName) {
      res.status(201).send('Thanks ' + groupCreatorName + '! You\'ve created ' +
        groupName + '!');
    });
  } else if (req.headers['x-groups-post'] === 'removeGroup') {
    backend.removeGroup(groupId, function(err) {
      if (err) {
        res.send('theres been an error');
      }
      res.send('Removed group: ' + groupId);
    });
  } else {
    var listOfInviteeEmails = req.body.emails;
    var list;

    backend.getUsers(groupId, function(err, users) {
      list = users;

      var alreadyInGroup = [];
      var notActiveUserInGroup = [];

      alreadyInGroup = listOfInviteeEmails.filter(function(email) {
        for (var i = 0; i < list.length;i++) {
          if (list[i].email === email) {
            return true;
          }
        }
        notActiveUserInGroup.push(email);
        return false;
      });

      notActiveUserInGroup.forEach(function(element) {

        backend.addUser(element, groupId, function() {

        });
      });

    });
    res.sendStatus(201);

  }
});

app.post('/groups/admin', function(req, res) {
  var adminEmail = req.body.adminEmail;
  var groupId = req.body.groupId;
  if (req.headers['x-groups-admin-post'] === 'removeAdmin') {
    backend.removeAdmin(adminEmail, groupId, function(err) {
      if (err) {
        console.log('error, will robinson');
        res.send('theres been an error, dawg');
      }
      var successMessage = 'successfully removed ' + adminEmail +
      ' as an admin to groupId: ' + groupId;
      console.log(successMessage);
      res.status(200).send(successMessage);
    });
  } else if (req.headers['x-groups-admin-post'] === 'addAdmin') {
      backend.addAdmin(adminEmail, groupId, function(err) {
        if (err) {
          console.log('error, will robinson');
          res.send('theres been an error, dawg');
        }
        var successMessage = 'successfully added ' + adminEmail +
        ' as an admin to groupId: ' + groupId;
        console.log(successMessage);
        res.sendStatus(201);
    });
  }
});

app.listen(3000);

function ensureAuthenticated(req, res, next) {
  if (req.session.userEmail) { return next(); }
  res.redirect('/login');
}
