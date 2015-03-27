# Description:
#   Gives an easy way for a user to get the status of the Freckle
#
# Dependencies:
#   freckle
#   lodash
#
# Configuration:
#   None
#
# Commands:
#   freckle - Display yesterday's Freckle
#
# Author:
#   pjaspers

Checkle = require './checkle'

attach = (robot, color, date, users) ->
  fields = for user in users
    {short: true, title: user.name, value: user.minutes}
  robot.emit 'slack.attachment',
    text: "*Freckle for #{date}* :scream_cat:"
    content:
      color: color
      fields: fields
    channel: "#general" # optional, defaults to message.room
    username: "Freckle for #{date}"
    icon_url: "http://pile.pjaspers.com/freckle.png"

emote = (robot, msg, data) ->
  for own date, users of data
    badusers = (user for user in users when +user.minutes < 420)
    goodusers = (user for user in users when +user.minutes >= 420)
    attach robot, "danger", date, badusers
    attach robot, "good", date, goodusers

displaySummary = (msg, data) ->
  for own date, users of data
    msg.send date
    for user in users
      msg.send "  #{user.name} has #{user.minutes}"


today = ->
  new Date()

yesterday = ->
  date = new Date()
  date.setDate(date.getDate() - 1)
  date

module.exports = (robot) ->
  robot.respond /(status\s)?freckle/i, (msg) ->
    userIds = process.env.FRECKLE_IDS.split ','
    token = process.env.FRECKLE_TOKEN
    subdomain = process.env.FRECKLE_DOMAIN

    checkle = new Checkle(token, subdomain, userIds)
    if ((new Date()).getHours() < 11)
      checkle.minutesPerUserOnDate yesterday(), (err, data) ->
        emote(robot, msg, data)
    else
      checkle.minutesPerUserFromDate yesterday(), (err, data) ->
        emote(robot, msg, data)
