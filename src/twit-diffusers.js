/** calculates unfollowers and fans */
const debug = require('debug')('workers:twit-diffusers');
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

      const friendIds = friends.map(friend => friend.id._);
      const followerIds = followers.map(follower => follower.id._);
      const partitionKey = `diffusers_${screenName}`;

      const unfollowers = friendIds
        .filter(friendId => followerIds.indexOf(friendId) === -1)
        .map(twitterUser => {
          return {
            PartitionKey: partitionKey,
            RowKey: `${twitterUser}`,
            id: twitterUser,
            unfollower: true,
            fan: false
          }
        });
      debug(`found ${unfollowers.length} unfollowers`);

      const fans = followerIds
        .filter(followerId => friendIds.indexOf(followerId) === -1)
        .map(twitterUser => {
          return {
            PartitionKey: partitionKey,
            RowKey: `${twitterUser}`,
            id: twitterUser,
            unfollower: false,
            fan: true
          }
        });
      debug(`found ${fans.length} fans`);


      const diffUsers = unfollowers.concat(fans);
      azure.addBatchToTable(tableName, diffUsers, (error) => {
        if (error) {
          debug(`failed to insert batch of diffusers in azure storage table ${tableName}: ${error}`)
          throw error;
        }
      });
    })
  })
})
