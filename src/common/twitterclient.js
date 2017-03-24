const Twitter = require('twitter');

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});


/** Returns a list of followers for the given screen name */
const getFollowersForUser = (screenName, callback) => {

  const getPagedFollowers = (pageId, lastPageData) => client.get('followers/ids', {
    screen_name: screenName,
    count: 5000,
    cursor: pageId
  })
  .then(data => {
    let dataPage = data["ids"];
    if (lastPageData) {
      dataPage = dataPage.concat(lastPageData)
    }
    if (data["next_cursor"] !== 0 && data["next_cursor"] !== "0") {
      // there are more pages to fetch
      getPagedFollowers(data["next_cursor"], dataPage)
    } else {
      // we have all followers
      callback(undefined, dataPage)
    }
  })
  .catch(err => callback(err))

  getPagedFollowers(-1)
}


/** Returns a list of friends for the given screen name */
const getFriendsForUser = (screenName, callback) => {

  const getPagedFriends = (pageId, lastPageData) => client.get('friends/ids', {
    screen_name: screenName,
    count: 5000,
    cursor: pageId
  })
  .then(data => {
    let dataPage = data["ids"];
    if (lastPageData) {
      dataPage = dataPage.concat(lastPageData)
    }
    if (data["next_cursor"] !== 0 && data["next_cursor"] !== "0") {
      // there are more pages to fetch
      getPagedFriends(data["next_cursor"], dataPage)
    } else {
      // we have all followers
      callback(undefined, dataPage)
    }
  })
  .catch(err => callback(err))

  getPagedFriends(-1)
}


module.exports = {
  getFollowersForUser,
  getFriendsForUser
}
