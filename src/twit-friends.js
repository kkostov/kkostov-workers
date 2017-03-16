/** creates a snapshot of a user's twitter friends */
const util = require('util');
const debug = require('debug')('workers:twit-friends');
const twitter = require('./common/twitterclient');
const azure = require('./common/azuretables');

const screenName = process.env.TWITTER_USER;
twitter.getFriendsForUser(screenName, (err, friends) => {
  if (err) {
    debug(`failed to load friends: ${util.inspect(err, false, null)}`)
    throw err;
  }

  debug(`found ${friends.length} friends`)
  const formattedFriends = friends.map(user => {
    return {
      PartitionKey: `friends_${screenName}`,
      RowKey: `twitter_${user.id_str}`,
      id: user.id_str,
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
      azure.addBatchToTable(tableName, formattedFriends, (error) => {
        if (error) {
          debug(`failed to insert batch of friends in azure storage table ${tableName}: ${error}`)
        } else {
          debug(`friends saved`)
        }
      })
    }
  })
})
