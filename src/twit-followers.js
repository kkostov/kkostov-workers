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
  const partitionKey = `followers_${screenName}`;

  debug(`found ${followers.length} followers`)
  let formattedFollowers = followers.map(userId => {
    return {
      PartitionKey: partitionKey,
      RowKey: `twitter_${userId}`,
      id: userId,
      archived: false
    }
  })

  const tableName = process.env.AZURE_TABLE_NAME;
  azure.createTable(tableName, (error) => {
    if (error) {
      debug(`failed to create azure storage table ${tableName}: ${error}`)
      throw error
    }

    azure.getEntitiesFromPartition(tableName, partitionKey, ['id'], (error, data) => {
      if (error) {
        debug(`failed to get followers from azure storage table ${tableName}: ${error}`)
        throw error
      }

      for (let old_follower of data) {
        if (!formattedFollowers.find(ff => `${ff.id}` === old_follower.id._)) {
          // the user is no longer a follower
          formattedFollowers.push({
            PartitionKey: partitionKey,
            RowKey: `twitter_${old_follower.id._}`,
            id: old_follower.id._,
            archived: true
          });
        }
      }

      azure.addBatchToTable(tableName, formattedFollowers, (error) => {
        if (error) {
          debug(`failed to insert batch of followers in azure storage table ${tableName}: ${error}`)
        } else {
          debug(`followers saved`)
        }
      });
    });
  });
});
