'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Group;
var User;
mongoose.connect('mongodb://localhost/checkinapp');

mongoose.connection.on('open', function() {
  mongoose.connection.db.dropCollection('users');
  mongoose.connection.db.dropCollection('groups');

  var groupsSchema = new Schema({
    name: String,
    admins: [{type: Schema.Types.ObjectId, ref: 'User'}],
    users: [{user: {type: Schema.Types.ObjectId, ref: 'User'},
      rules: {interval: Number, geoLocate: Boolean, message: Boolean},
       timer: Number, notified: Boolean}],
    invitedUsers: [String],
    defaultRules: {interval: Number, geoLocate: Boolean, message: Boolean}
  });

  var usersSchema = new Schema({
    name: String,
    email: String,
    groups: [{type: Schema.Types.ObjectId, ref: 'Group'}],
    admin: [{type: Schema.Types.ObjectId, ref: 'Group'}]
  });

  Group = mongoose.model('Group', groupsSchema);
  User = mongoose.model('User', usersSchema);

  var testUserOne = new User({name: 'One User', email: 'one@example.com'});
  var testUserTwo = new User({name: 'Jon Ringvald', email: 'jvald8@gmail.com'});
  var testUserThree = new User({name: 'Three User', email: 'three@example.com'})
  ;
  testUserOne._id = new mongoose.Types.ObjectId('000000000000000000000001');
  testUserTwo._id = new mongoose.Types.ObjectId('000000000000000000000002');
  testUserThree._id = new mongoose.Types.ObjectId('000000000000000000000003');

  var testGroupOne = new Group({name: 'Jon\'s Group', admins: [testUserOne._id],
    users: [{user: testUserTwo._id, rules: {interval: 6500, geoLocate: false,
     message: false},
    timer: Date.now(), notified: false}],
    defaultRules: {interval: 30000, geoLocate: false, message: false}});

  var testGroupTwo = new Group({name: 'Example Group',
   admins: [testUserOne._id],
    users: [],
    defaultRules: {interval: 30000, geoLocate: false, message: false}});

  testGroupOne._id = new mongoose.Types.ObjectId('000000000000000000000004');
  testGroupTwo._id = new mongoose.Types.ObjectId('000000000000000000000005');

  testUserOne.admin.push(testGroupOne);
  testUserOne.admin.push(testGroupTwo);
  testUserTwo.groups.push(testGroupOne);

  testUserOne.save();
  testUserTwo.save();
  testUserThree.save();

  testGroupOne.save();
  testGroupTwo.save(function() {
  });

});

exports.createUser = function(name, email, callback) {

  var newUser = new User({name: name, email: email});
  newUser.save(function(err, user) {
    callback(err, user.name);
  });

};

exports.createGroup = function(name, creatorEmail, defaultRules, callback) {

  exports.getUser(creatorEmail, function(err, groupCreator) {
    var newGroup = new Group({name: name, admins: [groupCreator._id],
      defaultRules: defaultRules});
    groupCreator.admin.push(newGroup._id);
    groupCreator.save();
    newGroup.save(function(err, group) {
      callback(err, group.name, groupCreator.name);
    });
  });

};

exports.addUser = function(email, groupId, callback) {
//sanity checking for a user already in the group?
  User.findOne({email: email}, function(err, userDoc) {
    Group.findOne({_id: groupId}, function(err, groupDoc) {
      userDoc.groups.push(groupDoc);
      groupDoc.users.push({user: userDoc._id,
      rules: {interval: 30000, geoLocate: false, message: false},
       timer: Date.now()}); //pass in rules?
      userDoc.save();
      groupDoc.save(function() {
        callback(err, true);
      });
    });
  });
};

exports.addAdmin = function(email, groupId, callback) {
//sanity checking for a user already in the admins?
  User.findOne({email: email}, function(err, userDoc) {
    Group.findOne({_id: groupId}, function(err, groupDoc) {
      userDoc.admin.push(groupDoc);
      groupDoc.admins.push(userDoc._id);
      userDoc.save();
      groupDoc.save(function() {
        callback(err, true);
      });
    });
  });
};

exports.removeUser = function(email, groupId, callback) {
//sanity checking for a user already in the admins?
  User.findOneAndUpdate({email: email}, {$pull: {groups: groupId}},
   function(err, userDoc) {
    Group.findOneAndUpdate({_id: groupId},
      {$pull: {users: {user: userDoc._id}}},
     function(err) {
      callback(err, true);
    });
  });
};

exports.removeAdmin = function(email, groupId, callback) {
//sanity checking for a user already in the admins?
  User.findOneAndUpdate({email: email}, {$pull: {admin: groupId}},
   function(err, userDoc) {
    Group.findOneAndUpdate({_id: groupId}, {$pull: {admins: userDoc._id}},
     function(err) {
      callback(err, true);
    });
  });
};

exports.getUsers = function(groupId, callback) {

  if (groupId) {
    Group
    .findOne({_id: groupId})
    .populate('users.user')
    .lean()
    .exec(function(err, group) {
      var userArray = group.users.map(function(element) {
        return element.user;
      });
      callback(err, userArray);
    });

  } else {
    User
    .find()
    .populate('groups')
    .lean()
    .exec(callback);
  }

};

exports.checkIn = function(email, callback) {

  User
  .findOne({email: email}, function(err, user) {
    user.groups.forEach(function(groupId) {
      Group.findOne({_id: groupId}, function(err, group) {
        for (var i = 0; i < group.users.length; i++) {
          if (group.users[i].user.toString() === user._id.toString()) {
            group.users[i].timer = Date.now();
            group.users[i].notified = false;
            break;
          }
        }
        group.save();
      });
    });
    callback(err);
  });

};

exports.getExpired = function(callback) {

  var theExpired = [];

  Group
  .find()
  .populate('users.user')
  .exec(function(err, groups) {
    groups.forEach(function(group) {
      group.users.forEach(function(element, index) {
        if (!element.notified && Date.now() >= element.timer + element.rules.interval) {
          //group.set('users.'+ index + '.notified', true);
          group.users[index].notified = true;
          group.save();
          theExpired.push({user: element.user, group: group.toObject()});
        }
      });
    });
    callback(err, theExpired);
  });

};

// exports.changeRules = function(email, groupId, newRules) {

// }

exports.getUser = function(email, callback) {
  User
  .findOne({email: email})
  //.populate('groups')
  //.lean()
  .exec(callback);
};

exports.getTimer = function(email, callback) {
  var groupUser;
  User
  .findOne({email: email}, function(err, user) {
    Group.findOne({_id: user.groups[0]}, function(err, group) {
      for (var i = 0; i < group.users.length; i++) {
        if (group.users[i].user.toString() === user._id.toString()) {
          groupUser = group.users[i];
          break;
        }
      }
      callback(err, groupUser.timer, groupUser.rules.interval);
    });
  });

};

// exports.getGroups = function(groupName) {

// };

// exports.getGroup = function(groupName, adminEmail, callback) {
  // //returns err, groupObject;
// };

exports.removeGroup = function(groupId) {
  Group.findOneAndRemove({_id: groupId}, {$pull: {users: groupId}},
   function(err, users) {
    if (err) {
      console.log('error in removeGroup function');
    }
    console.log('these users : ' + users + ' belonged to group: ' + groupId);
    User.findOneAndRemove({_id: groupId}, function(err) {
      if (err) {
        console.log('error in removeGroup function!');
      }
    });
  });
};
