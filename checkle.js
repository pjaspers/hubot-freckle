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

Checkle.prototype.entriesForRange = function(startDate, endDate, callback) {
  var args = {
    'search': {
      'people': this.userIds.join(","),
      "from": formatDate(startDate),
      "to": formatDate(endDate)
    }
  };
  freckle.entries.list(args, callback);
}

Checkle.prototype.minutesPerUserOnDate = function(date, callback) {
  this.minutesPerUserInRange(date, date, callback);
}

Checkle.prototype.minutesPerUserFromDate = function(date, callback) {
  var today = new Date;
  this.minutesPerUserInRange(date, today, callback);
}

Checkle.prototype.minutesPerUserInRange = function(startDate, endDate, callback) {
  var that = this;
  that.users(function(err, users) {
    if (err) { return callback(err, {}); }
    return that.entriesForRange(startDate, endDate, function(err, entries) {
      if (err) { return callback(err, {}); }
      var dates = _.chain(entries).map('entry').pluck('date').uniq().value().sort();
      var groupedByDate = groupByDate(entries);
      var data = _.reduce(dates, function(result, date) {
                   var entriesForDate = groupedByDate[date];
                   result[date] = sumPerUser(that.userIds, users, entriesForDate);
                   return result;
                 }, {});
      return callback(null, data);
    });
  });
}

function sumPerUser(userIds, users, entries) {
  var groupedByUser = groupByUserId(entries);
  return _.map(userIds, function(id) {
    var userEntries = groupedByUser[id.toString()] || {};
    var user = getUser(id, users);
    return {id: id,
            name: user.first_name,
            last_name: user.last_name,
            minutes: sumMinutes(userEntries)};
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

function groupByDate(entries) {
  return _.chain(entries).groupBy(function(entry) {
           return entry.entry.date;
         }).value();
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