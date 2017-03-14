const Twitter = require('twitter');

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

/** Returns a list of followers for the given screen name */
const getFollowersForUser = (screenName, callback) => {

  const getPagedFollowers = (pageId, lastPageData) => client.get('followers/list', {
    screen_name: screenName,
    count: 200,
    skip_status: true,
    include_user_entities: true,
    cursor: pageId
  })
  .then(data => {
    let pageOfFollowers = data["users"].slice()
    if (lastPageData) {
      pageOfFollowers = pageOfFollowers.concat(lastPageData)
    }
    if (data["next_cursor"] !== 0 && data["next_cursor"] !== "0") {
      // there are more pages to fetch
      getPagedFollowers(data["next_cursor"], pageOfFollowers)
    } else {
      // we have all followers
      callback(undefined, pageOfFollowers)
    }
  })
  .catch(err => callback(err))

  getPagedFollowers(-1)
}


module.exports = {
  getFollowersForUser
}
