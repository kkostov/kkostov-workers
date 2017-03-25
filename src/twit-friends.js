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

  const partitionKey = `friends_${screenName}`;

  debug(`found ${friends.length} friends`)
  const formattedFriends = friends.map(userId => {
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
      throw error;
    }

    azure.getEntitiesFromPartition(tableName, partitionKey, ['id'], (error, data) => {
      if (error) {
        debug(`failed to get friends from azure storage table ${tableName}: ${error}`)
        throw error
      }

      for (let old_friend of data) {
        if (!formattedFriends.find(ff => `${ff.id}` === old_friend.id._)) {
          // the user is no longer a follower
          formattedFriends.push({
            PartitionKey: partitionKey,
            RowKey: `twitter_${old_friend.id._}`,
            id: old_friend.id._,
            archived: true
          });
        }
      }

      azure.addBatchToTable(tableName, formattedFriends, (error) => {
        if (error) {
          debug(`failed to insert batch of friends in azure storage table ${tableName}: ${error}`)
        } else {
          debug(`friends saved`)
        }
      });
    });
  });
});
