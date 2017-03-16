/** calculates some stats based on followers and friends */
const util = require('util');
const debug = require('debug')('workers:twit-stats');
const azure = require('./common/azuretables');

const tableName = process.env.AZURE_TABLE_NAME;
const screenName = process.env.TWITTER_USER;

azure.createTable(tableName, (error) => {
  if (error) {
    debug(`failed to create azure storage table ${tableName}: ${error}`)
    throw error;
  }

  azure.getEntitiesFromPartition(tableName, `friends_${screenName}`, ['id', 'name', 'screen_name'], (error, friends) => {
    if (error) {
      debug(`failed to load friends from azure table ${tableName}: ${error}`)
      throw error;
    }

    azure.getEntitiesFromPartition(tableName, `followers_${screenName}`, ['id', 'name', 'screen_name'], (error, followers) => {
      if (error) {
        debug(`failed to load followers from azure table ${tableName}: ${error}`)
        throw error;
      }

      const nonfollowers = friends
        .filter(friend => !followers.find(follower => follower.id._ === friend.id._))
        .map(user => {
          return {
            PartitionKey: `stats_${screenName}`,
            RowKey: `twitter_nonfollower_${user.id._}`,
            name: user.name._,
            screen_name: user.screen_name._,
          }
        });
      const idontfollow = followers
        .filter(follower => !friends.find(friend => friend.id._ === follower.id._))
        .map(user => {
          return {
            PartitionKey: `stats_${screenName}`,
            RowKey: `twitter_idontfollow_${user.id._}`,
            name: user.name._,
            screen_name: user.screen_name._,
          }
        });

      // save the counters back to table storage
      azure.addBatchToTable(tableName, nonfollowers, (error) => {
        if (error) {
          debug(`failed to insert batch of nonfollowers in azure storage table ${tableName}: ${error}`)
          throw error;
        }
      })
      azure.addBatchToTable(tableName, idontfollow, (error) => {
        if (error) {
          debug(`failed to insert batch of idontfollow in azure storage table ${tableName}: ${error}`)
          throw error;
        }
      })
    })
  })
})
