const Twitter = require('twitter');

const Promise = require('bluebird').Promise;

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

/** Retrieves information about the twitter user with the given screen name */
const getUserInfo = (screenName) => {
  return client.get('users/show', {
    screen_name: screenName
  });
};

/** Retrieves the ids of all followers for the given user id */
const getFollowerIds = (userId) => {
  return new Promise((resolve, reject) => {
    const getPagedFollowers = (pageId, lastPageData) => client.get('followers/ids', {
      user_id: userId,
      count: 5000,
      cursor: pageId
    })
    .then(data => {
      let dataPage = data["ids"];
      // append to previous results
      if (lastPageData) {
        dataPage = dataPage.concat(lastPageData)
      }

      // check if more pages are available and resume
      if (data["next_cursor"] !== 0 && data["next_cursor"] !== "0") {
        // there are more pages to fetch
        getPagedFollowers(data["next_cursor"], dataPage)
      } else {
        // we have all followers
        resolve(dataPage);
      }
    })
    .catch(err => reject(err))

    // start fetching from the first page
    getPagedFollowers(-1)
  });
}

/** Retrieves the ids of all friends for the given user id */
const getFriendsIds = (userId) => {
  return new Promise((resolve, reject) => {
    const getPagedFriends = (pageId, lastPageData) => client.get('friends/ids', {
      user_id: userId,
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
        resolve(dataPage)
      }
    })
    .catch(err => reject(err))

    // start fetching from the first page
    getPagedFriends(-1)
  })
}


module.exports = {
  getUserInfo,
  getFollowerIds,
  getFriendsIds
}
