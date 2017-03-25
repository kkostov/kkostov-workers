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

  azure.getEntitiesFromPartition(tableName, `friends_${screenName}`, ['id', 'archived'], (error, friends) => {
    if (error) {
      debug(`failed to load friends from azure table ${tableName}: ${error}`)
      throw error;
    }

    azure.getEntitiesFromPartition(tableName, `followers_${screenName}`, ['id', 'archived'], (error, followers) => {
      if (error) {
        debug(`failed to load followers from azure table ${tableName}: ${error}`)
        throw error;
      }

      const partitionKey = `diffusers_${screenName}`;
      const friendIds = friends.filter(friend => friend.archived._ !== 'true').map(friend => friend.id._);
      const followerIds = followers.filter(follower => follower.archived._ !== 'true').map(follower => follower.id._);

      azure.getEntitiesFromPartition(tableName, partitionKey, ['id', 'unfollower', 'fan'], (error, old_diffs) => {
        if (error) {
          debug(`failed to load old diffed users from azure table ${tableName}: ${error}`)
          throw error;
        }

        // map old diffed users
        const oldDiffs = old_diffs.map(od => {
          return {
            PartitionKey: partitionKey,
            RowKey: `${od.id._}`,
            id: od.id._,
            unfollower: od.unfollower._,
            fan: od.fan._
          }
        });

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
              archived: false
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
              archived: false
            }
          });
        debug(`found ${fans.length} fans`);


        let newDiffs = unfollowers.concat(fans);

        // check which old diffs are no longer fans and unfollowers
        for (let old of oldDiffs) {
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
          if(old.archived === true) {
            newDiffs.push(old);
          }
        }

        azure.addBatchToTable(tableName, newDiffs, (error) => {
          if (error) {
            debug(`failed to insert batch of diffusers in azure storage table ${tableName}: ${error}`)
            throw error;
          }
        });

      });
    })
  })
})
