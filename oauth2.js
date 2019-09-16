let redirectUri = chrome.identity.getRedirectURL('provider_cb');
let code, state, track, artist;
let sentState = randStr(10); 
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let responseUrl, accessToken, refreshToken, expirationDate;

window.onload = function() {

  // get accessToken cookie
  chrome.cookies.get({
    url: 'https://accounts.spotify.com/api/token',
    name: 'accessToken'
  }, cookieArray => {
    accessToken = cookieArray.value
    expirationDate = cookieArray.expirationDate;
  });

  document.querySelector('#log-in').addEventListener('click', function() {
    // 1. request application request authorization
    // authorization code is returned if user logs in and authorizes access
    chrome.identity.launchWebAuthFlow({
      url: 'https://accounts.spotify.com/authorize' +
      '?client_id=' + clientId + 
      '&response_type=code' +
      '&redirect_uri=' + redirectUri + 
      '&scope=user-read-currently-playing' + 
      '&state=' + sentState, 
      interactive: true 
    }, response => {
      // get the authorization code from the response
      // https://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
      // URL() constructor returns a URL object which represents the URL 
      // defined by its parameters
      responseUrl = new URL(response);
      code = responseUrl.searchParams.get('code');
      // URLSearchParams: an interface with utility methods that work with
      // the query string of a URL
      // A query string is the part of the URL that stores data which can be
      // passed to and from a web application and a server.
      // The query string follows the question mark sign in the URL

      state = responseUrl.searchParams.get('state');

      // verify sent state is the same as the response state 
      if (state == sentState) {
        // console.log('same state');
      } else {
        console.log('different state');
        console.log('sentState: ' + sentState);
        console.log('response state: ' + state);
      }
    })
  });

  document.querySelector('#request-a-r').addEventListener('click', function() {
    // 2. request refresh and access tokens
    // Spotify returns access and refresh tokens

    fetch('https://accounts.spotify.com/api/token',{ 
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        // btoa() encodes string in base-64
      },
      body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + redirectUri + '&scope=user-read-currently-playing'
    })
    // load it as a JSON
    // consider when no available devices are found, request will return
    // a 200 OK response but with no data
    // consider when no track is currently playing, request will return a
    // 204 NO CONTENT
    // consider when the user is not playing anything
    // according to the docs, the request will return a 204 NO CONTENT
      .then(response => response.json())
      .then(data => {
        accessToken = data.access_token;
        refreshToken = data.refresh_token;

        setAccessToken();

        // set refreshToken cookie 
        chrome.cookies.set({
          url: 'https://accounts.spotify.com/api/token',
          name: 'refreshToken',
          value: refreshToken,
          secure: true,
          httpOnly: true,
          sameSite: 'strict'
        });
      });
  });

  document.querySelector('#request-data').addEventListener('click', function() {
    // check if access token is still valid based on cookie's expirationDate
    // subtract 1 minute to give time to make GET request with access token
    // that will expire soon
    if (Date.now() < expirationDate - 60000) {
      requestTrack();
    } else {
      // request refreshed access token
      fetch('https://accounts.spotify.com/api/token',{ 
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          // btoa() encodes string in base-64
        },
        body: 'grant_type=refresh_token&refresh_token=' + refreshToken
      })
        .then(response => response.json())
        .then(data => {
          accessToken = data.access_token;
          // replace cookie
          setAccessToken();
        })
        // request track with refreshed access token
        .then(requestTrack());
    }
  });
};

function setAccessToken() {
  // add one hour to current time to set as expirationDate of cookie
  // 3600000ms in an hour
  let expirationDate = Date.now() + 3600000;

  // set accessToken cookie
  chrome.cookies.set({
    url: 'https://accounts.spotify.com/api/token',
    name: 'accessToken',
    value: accessToken,
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    expirationDate: expirationDate
  });
}

function requestTrack() {
  console.log('request track');
  fetch('https://api.spotify.com/v1/me/player/currently-playing',{ 
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
  // check that a valid token was used
    .then(response => response.json())
  // print name of user's currently playing song
    .then(data => {
      track = data.item.name;
      artist = data.item.artists[0].name;

      // replace spaces with dashes
      track = track.replace(/\s/g, '-');
      artist = artist.replace(/\s/g, '-');

      url = `https://genius.com/${artist}-${track}-lyrics`;

      chrome.tabs.create({url: url});

      // use this if I want to get the featured artists
      // for (let artist of data.item.artists) {
      //   console.log(artist.name);
      // }
    });
}

// https://stackoverflow.com/a/1349426
function randStr(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
