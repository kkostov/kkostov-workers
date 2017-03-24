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
      id: user.id
    }
  })

  const tableName = process.env.AZURE_TABLE_NAME;
  azure.createTable(tableName, (error) => {
    if (error) {
      debug(`failed to create azure storage table ${tableName}: ${error}`)
      throw error;
    }

    azure.addBatchToTable(tableName, formattedFriends, (error) => {
      if (error) {
        debug(`failed to insert batch of friends in azure storage table ${tableName}: ${error}`)
      } else {
        debug(`friends saved`)
      }
    })
  })
})
