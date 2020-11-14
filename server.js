require('dotenv').config()

const express = require("express")
const app = express()

const jwt = require('express-jwt')
const jwksRsa = require('jwks-rsa')
const authConfig = require('./auth_config.json')

const axios = require('axios')
const Twitter = require('twitter')

const { graphqlHTTP } = require('express-graphql')
const { schema, rootValue } = require('./model.js')

// const cors = require('cors')

// CORS
// app.use(cors({
//   origin: [
//     'http://localhost:5000',
//     'https://auth0-session-module.glitch.me'
//   ]
// }))

// OpenID
const checkJWT = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`
  }),
  
  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"]
})

app.use(express.static("public"))

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
})

app.get('/graphiql', (req, res) => {
  res.sendFile(__dirname + '/views/graphiql.html')
})

app.get('/api/external', checkJWT, (req, res) => {
  res.send({
    msg: 'Your access token was successfully validated!'
  })
})

const checkTwitter = async (req, res, next) => {
  const { sub: user_id } = req.user
  try {
    const { access_token: auth0_api_access_token } = await axios.post('https://acrux.auth0.com/oauth/token', {
      client_id: process.env.AUTH0_API_CLIENT_ID,
      client_secret: process.env.AUTH0_API_CLIENT_SECRET,
      audience: 'https://acrux.auth0.com/api/v2/',
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(r => {
      return r.data
    })

    const { identities } = await axios.get(`https://acrux.auth0.com/api/v2/users/${user_id}`, {
      headers: {
        'Authorization': `Bearer ${ auth0_api_access_token }`
      }
    })
    .then(r => r.data)
    .catch(err => {
      console.error('Failed to get identities.')
      throw err
    })
    
    const twitterIdentity = identities.find(v => v.provider === 'twitter')
    
    if (twitterIdentity) {
      const client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: twitterIdentity.access_token,
        access_token_secret: twitterIdentity.access_token_secret
      })
      
      req.twitterClient = client
      next()
    }
    else {
      res.status(401).json({
        msg: 'Your Twitter Identity was not found.'
      })
    }
  }
  catch (e) {
    console.error(e)
    res.status(500).json({ msg: 'Sorry, server error.' })
  }
}

app.get('/api/external/twitter', checkJWT, checkTwitter, (req, res) => {
  res.json({
    msg: 'Your Twitter client was sussessfully created!'
  })
})

app.get('/api/external/twitter/statuses/home_timeline', checkJWT, checkTwitter, async (req, res) => {
  const client = req.twitterClient
  
  const tweets = await client.get('/statuses/home_timeline', {})

  res.json(tweets)
  
})

app.use('/api/external/twitter/graphql', checkJWT, checkTwitter, (req, res, next) => {
  const client = req.twitterClient
  
  graphqlHTTP({
    schema: schema(),
    rootValue: rootValue(client)
  })(req, res, next)
})

app.get('/auth_config.json', (req, res) => {
  res.sendFile(__dirname + '/auth_config.json')
})

app.get('/api/external')

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
