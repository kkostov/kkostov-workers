/** creates a snapshot of my twitter followers */
const util = require('util');
const debug = require('debug')('workers:twit-followers');
const twitter = require('./common/twitterclient');

twitter.getFollowersForUser("kkostov", (err, followers) => {
  if (err) {
    debug(`failed to load followers: ${util.inspect(err, false, null)}`)
  }
  debug(`found ${followers.length} followers`)
})
