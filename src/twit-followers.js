/** creates a snapshot of a user's twitter followers */
const util = require('util');
const debug = require('debug')('workers:twit-followers');
const twitter = require('./common/twitterclient');
const azure = require('./common/azuretables');

const putFollowersToStorage = (userId, followers, tableName) => {
  const partitionKey = `followers_${userId}`;
  let formattedFollowers = followers
    .map(userId => {
      return {
        PartitionKey: partitionKey,
        RowKey: `twitter_${userId}`,
        id: userId,
        archived: false
      };
    });

  return azure.getEntitiesFromPartition(tableName, partitionKey, ['id'])
    .then(data => {
      data.forEach(old_follower => {
        if (!formattedFollowers.find(ff => `${ff.id}` === old_follower.id._)) {
          // the user is no longer a follower
          formattedFollowers.push({
            PartitionKey: partitionKey,
            RowKey: `twitter_${old_follower.id._}`,
            id: old_follower.id._,
            archived: true
          });
        }
      })
    }).then(() => azure.addBatchToTable(tableName, formattedFollowers));
}

const syncFollowers = (userId, tableName) => {
  return twitter.getFollowerIds(userId)
    .then(followers => putFollowersToStorage(userId, followers, tableName))
    .catch(error => {
      debug(`failed to load followers: ${util.inspect(error, false, null)}`)
      throw error;
    });
}

module.exports = {
  syncFollowers
}
