var freckle = require('freckle'),
    _ = require('lodash');



module.exports = Checkle;

function Checkle(token, subdomain, userIds) {
  freckle(subdomain, token);
  this.client = freckle;
  this._users = []
  this.userIds = userIds;
}

Checkle.prototype.users = function(callback) {
  if(this._users.length > 0) {
    return callback(null, this._users);
  }
  var that = this;
  this.client.users.list(function(e, u) {
    that._users = u;
    callback(e, u);
  });
}

Checkle.prototype.entriesForDate = function(date, callback) {
  var args = {
    'search': {
      'people': this.userIds.join(","),
      "from": formatDate(date)
    }
  };
  freckle.entries.list(args, callback);
}

Checkle.prototype.minutesPerUserOnDate = function(date, callback) {
  var that = this;
  that.users(function(err, users) {
    if (err) { return callback(err, {}); }
    return that.entriesForDate(date, function(err, entries) {
      if (err) { return callback(err, {}); }
      var grouped = groupByUserId(entries);
      var data = _.reduce(that.userIds, function(result, id) {
                   var userEntries = grouped[id.toString()] || {};
                   var user = getUser(id, users);
                   result[id] = {name: user.first_name, minutes: sumMinutes(userEntries)};
                   return result;
                 }, {});
      return callback(null, data);
    });
  });
}

function sumMinutes(entries) {
  var minutes = _.reduce(entries, function(sum, e) {
                  sum += +e.entry.minutes;
                  return sum;
                }, 0);
  if (minutes == null) {
    minutes = 0;
  }
  return minutes;
}

function groupByUserId(entries) {
  return _.chain(entries).groupBy(function(entry) {
           return entry.entry.user_id;
         }).value();
}

function getUser(userId, users) {
  return _.chain(users)
         .filter({user: {id: +userId}})
         .pluck("user")
         .first()
         .value();
}

function pad(n){
  return n < 10 ? '0'+n : n
}

function formatDate(date) {
  return [date.getFullYear(), pad(date.getMonth() +1), pad(date.getDate())].join("-");
}