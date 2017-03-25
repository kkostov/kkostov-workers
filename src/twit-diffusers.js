/** calculates unfollowers and fans */
const debug = require('debug')('workers:twit-diffusers');
const azure = require('./common/azuretables');

const getFriendIds = (tableName, userId) => {
  return azure.getEntitiesFromPartition(tableName, `friends_${userId}`, ['id', 'archived'])
    .then(users => users.filter(friend => friend.archived._ !== 'true').map(friend => friend.id._))
    .catch(error => {
      debug(`failed to load friends from azure table ${tableName}: ${error}`)
      throw error;
    });
}

const getFollowerIds = (tableName, userId) => {
  return azure.getEntitiesFromPartition(tableName, `followers_${userId}`, ['id', 'archived'])
    .then(users => users.filter(follower => follower.archived._ !== 'true').map(follower => follower.id._))
    .catch(error => {
      debug(`failed to load followers from azure table ${tableName}: ${error}`)
      throw error;
    });
}


const getOldDiffs = (tableName, userId) => {
  const partitionKey = `diffusers_${userId}`;
  return azure.getEntitiesFromPartition(tableName, '', ['id', 'unfollower', 'fan'])
    .then(old_diffs => old_diffs.map(od => {
      return {
        PartitionKey: partitionKey,
        RowKey: `${od.id._}`,
        id: od.id._,
        unfollower: od.unfollower._,
        fan: od.fan._
      }
    }))
    .catch(error => {
      debug(`failed to load old diffusers from azure table ${tableName}: ${error}`)
      throw error;
    });
}

const syncDiffs = (userId, tableName) => {
  const partitionKey = `diffusers_${userId}`;
  return getFriendIds(tableName, userId)
    .then(friendIds => {
      getFollowerIds(tableName, userId)
        .then(followerIds => {
          getOldDiffs(tableName, userId)
            .then(oldDiffs => {
              // filter new unfollowers
              const unfollowers = friendIds
                .filter(friendId => followerIds.indexOf(friendId) === -1)
                .map(twitterUser => {
                  return {
                    PartitionKey: partitionKey,
                    RowKey: `${twitterUser}`,
                    id: twitterUser,
                    unfollower: true,
                    fan: false,
                    archived: false, // not scheduled for removal
                    seen: false // new unfollower, the user hasn't dismissed it yet
                  }
                });
              debug(`found ${unfollowers.length} unfollowers`);

              // filter new fans
              const fans = followerIds
                .filter(followerId => friendIds.indexOf(followerId) === -1)
                .map(twitterUser => {
                  return {
                    PartitionKey: partitionKey,
                    RowKey: `${twitterUser}`,
                    id: twitterUser,
                    unfollower: false,
                    fan: true,
                    archived: false,
                    seen: false // new unfollower, the user hasn't dismissed it yet
                  }
                });
              debug(`found ${fans.length} fans`);

              let newDiffs = unfollowers.concat(fans);
              oldDiffs.forEach(old => {
                if (!fans.find(fan => fan.id === old.id)) {
                  // not a fan
                  old.fan = false;
                }

                if (!unfollowers.find(unfollower => unfollower.id === old.id)) {
                  // not an unfollower
                  old.unfollower = false;
                }

                // only fans and unfollowers will be kept
                old.archived = !old.fan && !old.unfollower;

                // since we are merging diff users, only archived ones need updating
                if (old.archived === true) {
                  newDiffs.push(old);
                }
              })

              return azure.addBatchToTable(tableName, newDiffs);
            })
        })
    })
}


module.exports = {
  syncDiffs
}
