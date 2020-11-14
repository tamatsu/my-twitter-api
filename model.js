exports.schema = schema
exports.rootValue = rootValue

const { graphql, buildSchema } = require('graphql')

function buildTweet(tweet) {
  const retweeted_status = tweet.retweeted_status ? {
    id_str: tweet.retweeted_status.id_str
  } : undefined

  const place = tweet.place ? {
    id: tweet.place.id,
    place_type: tweet.place.place_type,
    name: tweet.place.name,
    full_name: tweet.place.full_name,
    country_code: tweet.place.country_code,
    country: tweet.place.country
  } : undefined

  return {
    id_str: tweet.id_str,
    full_text: tweet.full_text,
    entities: {
      media: tweet.entities.media,
      urls: tweet.entities.urls
    },
    user: {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      profile_image_url_https: tweet.user.profile_image_url_https,
      id_str: tweet.user.id_str
    },
    created_at: tweet.created_at,
    retweeted_status,
    place
  }
}

// GraphQL
function schema() {
  return buildSchema(`
    type Query {
      hello: String!

      userTimeline(
        screen_name: String!
      ): [Tweet]

      homeTimeline: [Tweet]

      searchTweets(
        q: String!
      ): [Tweet]

      statusesLookup(
        ids: [ID]!
      ): [Tweet]

    }

    type Tweet {
      id_str: ID!
      full_text: String!
      entities: Entities!
      user: User!
      created_at: String!
      retweeted_status: RetweetedStatus
      place: Place
    }

    type Place {
      id: ID!
      place_type: String!
      name: String!
      full_name: String!
      country_code: String!
      country: String!
    }

    type RetweetedStatus {
      id_str: ID!
    }
    
    type Entities {
      media: [Media]
      urls: [Url]
    }

    type User {
      name: String!
      screen_name: String!
      profile_image_url_https: String!
      id_str: ID!
    }

    type Media {
      media_url_https: String!
    }

    type Url {
      expanded_url: String!
      display_url: String!
      indices: [Int]!
      url: String!
    }
  `)
}

function rootValue(client) {
  return {
    hello: () => {
      return `Hello!`
    },

    userTimeline: ({screen_name}) => {
      const params = {
        screen_name,
        tweet_mode: 'extended',
        count: 60,
        exclude_replies: true,
        include_rts: false        
      }

      return client.get('statuses/user_timeline', params)
      .then(v => v.map(buildTweet))
    },
  
    homeTimeline: () => {
      const params = {
        tweet_mode: 'extended',
        count: 60
      }
      
      return client.get('statuses/home_timeline', params)
      .then(v => v.map(buildTweet))
    },
    
    searchTweets: ({q}) => {
      const params = {
        q,
        tweet_mode: 'extended',
        count: 60        
      }

      return client.get('search/tweets', params)
      .then(v => v.statuses.map(buildTweet))
    },

    statusesLookup: ({ids}) => {
      const params = {
        id: ids.slice(0, 99).join(','),
        tweet_mode: 'extended'
      }

      return client.get('statuses/lookup', params)
      .then(v => v.map(buildTweet))
    }
  }
}
