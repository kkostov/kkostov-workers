/** creates a snapshot of my twitter followers */
const util = require('util');
const debug = require('debug')('workers:twit-followers');
const twitter = require('./common/twitterclient');
const azure = require('./common/azuretables');

const screenName = process.env.TWITTER_USER;
twitter.getFollowersForUser(screenName, (err, followers) => {
  if (err) {
    debug(`failed to load followers: ${util.inspect(err, false, null)}`)
    throw err;
  }

  debug(`found ${followers.length} followers`)
  const formattedFollowers = followers.map(user => {
    return {
      PartitionKey: `followers_${screenName}`,
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

  const tableName = process.env.AZURE_TABLE_NAME;
  azure.createTable(tableName, (error) => {
    if (error) {
      debug(`failed to create azure storage table ${tableName}: ${error}`)
    } else {
      azure.addBatchToTable(tableName, formattedFollowers, (error) => {
        if (error) {
          debug(`failed to insert batch of followers in azure storage table ${tableName}: ${error}`)
        } else {
          debug(`followers saved`)
        }
      })
    }
  })
})
