/** creates a snapshot of a user's twitter friends */
const util = require('util');
const debug = require('debug')('workers:twit-friends');
const twitter = require('./common/twitterclient');
const azure = require('./common/azuretables');

const putFriendsToStorage = (userId, friends, tableName) => {
  const partitionKey = `friends_${userId}`;
  let formattedFriends = friends
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
        if (!formattedFriends.find(ff => `${ff.id}` === old_follower.id._)) {
          // the user is no longer a follower
          formattedFriends.push({
            PartitionKey: partitionKey,
            RowKey: `twitter_${old_follower.id._}`,
            id: old_follower.id._,
            archived: true
          });
        }
      })
    }).then(() => azure.addBatchToTable(tableName, formattedFriends));
}

const syncFriends = (userId, tableName) => {
  return twitter.getFriendsIds(userId)
    .then(friends => putFriendsToStorage(userId, friends, tableName))
    .catch(error => {
      debug(`failed to load friends: ${util.inspect(error, false, null)}`)
      throw error;
    });
}


module.exports = {
  syncFriends
}
