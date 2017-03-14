/** creates a snapshot of my twitter followers */
const util = require('util');
const debug = require('debug')('workers:twit-followers');
const twitter = require('./common/twitterclient');
const azure = require('./common/azuretables');

twitter.getFollowersForUser("kkostov", (err, followers) => {
  if (err) {
    debug(`failed to load followers: ${util.inspect(err, false, null)}`)
  }
  debug(`found ${followers.length} followers`)
  const formattedFollowers = followers.map(user => {
    return {
      PartitionKey: "followers_kkostov",
      RowKey: `twitter_${user.id_str}`,
      name: user.name,
      screen_name: user.screen_name,
      followers_count: user.followers_count,
      friends_count: user.friends_count,
      listed_count: user.listed_count,
      created_at: user.created_at,
      favourites_count: user.favourites_count
    }
  })
  azure.createTable('twitfollowers', (error) => {
    if(error) {
      debug(`failed to create azure storage table twitfollowers: ${error}`)
    } else {
      azure.addBatchToTable('twitfollowers', formattedFollowers, (error) => {
        if(error) {
          debug(`failed to insert batch of followers in azure storage table twitfollowers: ${error}`)
        } else {
          debug(`followers inserted`)
        }
      })
    }
  })
})
