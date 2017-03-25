const util = require('util');
const Twitter = require('twitter');
// const debug = require('debug')('api:twitterstream');

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const stream = client.stream('user', {with: 'followings'});
stream.on('data', function(event) {
  console.log(`data: ${util.inspect(event, false, null)}`);
});

stream.on('follow', function(event) {
  console.log(`follow: ${util.inspect(event, false, null)}`);
});

stream.on('unfollow', function(event) {
  console.log(`unfollow: ${util.inspect(event, false, null)}`);
});

stream.on('favorite', function(event) {
  console.log(`favorite: ${util.inspect(event, false, null)}`);
});

stream.on('unfavorite', function(event) {
  console.log(`unfavorite: ${util.inspect(event, false, null)}`);
});


stream.on('end', function() {
  console.log('end');
});

stream.on('error', function(error) {
  console.log(`error: ${util.inspect(error, false, null)}`);
  throw error;
});
