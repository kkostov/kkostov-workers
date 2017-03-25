const twitter = require('./common/twitterclient');
const followers = require('./twit-followers');
const debug = require('debug')('workers:charles');

const screenName = process.env.TWITTER_USER;
const tableName = process.env.AZURE_TABLE_NAME;

twitter.getUserInfo(screenName).then(userInfo => {
  debug(`found user info for ${screenName}, id: ${userInfo.id}`);
  followers.syncFollowers(userInfo.id, tableName).catch(err => {
    debug(`error syncing followers: ${err}`);
  });
});
