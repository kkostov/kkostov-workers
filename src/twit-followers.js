/** creates a snapshot of a user's twitter followers */
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
      id: user.id
    }
  })

  const tableName = process.env.AZURE_TABLE_NAME;
  azure.createTable(tableName, (error) => {
    if (error) {
      debug(`failed to create azure storage table ${tableName}: ${error}`)
      throw error
    }

    azure.addBatchToTable(tableName, formattedFollowers, (error) => {
      if (error) {
        debug(`failed to insert batch of followers in azure storage table ${tableName}: ${error}`)
      } else {
        debug(`followers saved`)
      }
    })
  })
})
