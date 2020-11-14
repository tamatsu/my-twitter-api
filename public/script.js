// Framework
const appDiv = document.getElementById('app')

function draw() {
  appDiv.innerHTML = ''
  appDiv.appendChild(view(_model))
}

function update(a, b) {
  return Object.assign({}, a, b)
}

// Model
let _model = {
  session: {
    auth0: null,
    isAuthenticated: false,
    error: null    
  },
}

init()
function init() {
  draw()
  createAuth0()
  .then(createdAuth0)
  .catch(failedCreateAuth0)
}

// Update
function createdAuth0({
  auth0,
  isAuthenticated
}) {
  // console.log('> createdAuth0 ', _model, auth0, isAuthenticated)
  _model = update(_model, {
    session: {
      auth0,
      isAuthenticated,
      error: null
    }
  })
  // console.log('->', _model)

  draw()
}

function gotLoginState(isAuthenticated) {
  _model.session.isAuthenticated = isAuthenticated
  
  draw()
}

function failedCreateAuth0(error) {
  _model.session.error = error
  
  draw()
}

function loginButtonClicked() {
  if (_model.session.auth0) {
    login(_model.session.auth0)
  }
}

function logoutButtonClicked() {
  if (_model.session.auth0) {
    logout(_model.session.auth0)
  }
}

function callApiButtonClicked() {
  if (_model.session.auth0) {
    callApi(_model.session.auth0)
  }
}

function callTwitterApiButtonClicked() {
  if (_model.session.auth0) {
    callTwitterApi(_model.session.auth0)
  }
}


// Port
async function createAuth0() {
  return fetch('/auth_config.json')
  .then(r => r.json())
  .then(async config => {
    const auth0 = await createAuth0Client({
      domain: config.domain,
      client_id: config.clientId,
      audience: config.audience
    })
    
    await handleRedirectCallback(auth0)

    const isAuthenticated = await auth0.isAuthenticated()

    return { auth0, isAuthenticated }
  })
  .catch(error => {
    console.log(error)
    throw error
  })
}

async function handleRedirectCallback(auth0) {
  const isAuthenticated = await auth0.isAuthenticated()

  if (!isAuthenticated) {
    const query = window.location.search

    if (query.includes('code=') && query.includes('state=')) {
      await auth0.handleRedirectCallback()
    }
  }
  
  window.history.replaceState({}, document.title, '/')
}

async function login(auth0) {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin
  })
}

async function logout(auth0) {
  await auth0.logout({
    returnTo: window.location.origin
  })
  
  gotLoginState(false)
}

async function callApi(auth0) {
  try {
    const token = await auth0.getTokenSilently()
    
    const response = await fetch('/api/external/twitter/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'appication/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: '{ homeTimeline { full_text }}'
      })
    })
    
    const responseData = await response.json()
    
    console.log(responseData)
  }
  catch (e) {
    console.error(e)
  }
}


// View
function view(model) {
  if (model.session.error) {
    return div([], [ text(model.session.error.message) ])
  }
  else if (!model.session.auth0) {
    return div([], [ text('Loading auth0...') ])
  }
  else if (model.session.isAuthenticated) {
    return div(
      [],
      [ text('Logged in.')
      , button(
          [ onClick(logoutButtonClicked)
          ],
          [ text('logout') ])
      , button(
          [ onClick(callApiButtonClicked)
          ],
          [ text('callApi') ])
      ])
  }
  else {
    return div(
      [], 
      [ text('Not logged in.')
      , button(
          [ onClick(loginButtonClicked)
          ],
          [ text('login') ])
      ])
  }
}
  






// HTML
function attribute(name, value) {
  return e => {
    e.setAttribute(name, value)
  }
}

function onClick(f) {
  return e => {
    e.addEventListener('click', f)
  }
}

function onFocusout(f) {
  return e => {
    e.addEventListener('focusout', f)
  }
}

function onSubmit(f) {
  return e => {
    e.addEventListener('submit', e => {
      e.preventDefault()
      f()
    })
  }
}

function onTouchstart(f) {
  return e => {
    e.addEventListener('touchstart', f)
  }
}

function onChange(f) {
  return e => {
    e.addEventListener('change', f)
  }
}

function onInput(f) {
  return e => {
    e.addEventListener('input', f)
  }
}

function onTouchmove(f) {
  return e => {
    e.addEventListener('touchmove', f)
  }
}


function div(attributes, children) {
  const name = 'div'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))
  children.forEach(c => e.appendChild(c))
  
  return e
}


function a(attributes, children) {
  const name = 'a'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))
  children.forEach(c => e.appendChild(c))
  
  return e
}

function button(attributes, children) {
  const name = 'button'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))
  children.forEach(c => e.appendChild(c))
  
  return e
}

function form(attributes, children) {
  const name = 'form'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))
  children.forEach(c => e.appendChild(c))
  
  return e
}

function input(attributes, value) {
  const name = 'input'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))
  
  e.value = value

  return e
}

function img(attributes) {
  const name = 'img'

  const e = document.createElement(name)
  attributes.forEach(f => f(e))

  return e
}

function text(str) {
  return document.createTextNode(str)
}

function svg() {
  return {
    svg(attributes, children) {
      const name = 'svg'

      const e = document.createElementNS('http://www.w3.org/2000/svg', name)
      attributes.forEach(f => f(e))
      children.forEach(c => e.appendChild(c))

      return e
    },
    
    g(attributes, children) {
      const name = 'g'

      const e = document.createElementNS('http://www.w3.org/2000/svg', name)
      attributes.forEach(f => f(e))
      children.forEach(c => e.appendChild(c))

      return e
    },
    
    circle(attributes) {
      const name = 'circle'

      const e = document.createElementNS('http://www.w3.org/2000/svg', name)
      attributes.forEach(f => f(e))

      return e
    },
    
    line(attributes) {
      const name = 'line'

      const e = document.createElementNS('http://www.w3.org/2000/svg', name)
      attributes.forEach(f => f(e))

      return e
    },
    
    text(attributes, str) {
      const name = 'text'

      const e = document.createElementNS('http://www.w3.org/2000/svg', name)
      attributes.forEach(f => f(e))
      
      e.appendChild(document.createTextNode(str))
      
      return e      
    }
  }
}
