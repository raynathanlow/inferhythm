let accessToken, refreshToken, expirationDate;
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

let geniusToken = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

chrome.runtime.onInstalled.addListener(function() {
  chrome.tabs.create({url: 'index.html'});
});

chrome.browserAction.onClicked.addListener(() => {
  // redirect to Genius page
  chrome.cookies.getAll({
    url: 'https://accounts.spotify.com/api/token'
  }, cookieArray => {
    // get token information
    for (let cookie of cookieArray) {
      if (cookie.name == 'accessToken') {
        accessToken = cookie.value;
        expirationDate = cookie.expirationDate;
        // console.log('accessToken ED: ' + new Date(cookie.expirationDate));
      }
      // refreshToken
      if (cookie.name == 'refreshToken') {
        refreshToken = cookie.value;
        // console.log('refreshToken ED: ' + new Date(cookie.expirationDate));
      }
    }

    // request track information if access token is still valid
    // otherwise, refresh access token and then request track information
    if (Date.now() < expirationDate - 60000) {
      // console.log('accessToken is valid');
      // console.log('Date.now(): ' + Date.now());
      // console.log('expirationDate: ' + new Date(expirationDate));
      requestTrack();
    } else {
      // console.log('accessToken has expired');
      // console.log('Date.now(): ' + Date.now());
      // console.log('expirationDate: ' + new Date(expirationDate));

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
          setAccessToken(accessToken);
        })
      // request track with refreshed access token
        .then(requestTrack());
    }
  });

});

function requestTrack() {
  // console.log('request track');
  let track, artist, query;

  fetch('https://api.spotify.com/v1/me/player/currently-playing',{ 
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
  // check that a valid token was used
  // do something when token is invalid
    .then(response => {
      // if access token is invalid
      if (response.status == 401) {
        console.log('Invalid access token');
      } else if (response.status == 200) {
        // if response has data populated, return response.json() for further processing
        response.clone().text().then(function(text) {
          // console.log(text.length);
          if (text.length > 0) {
            // console.log('Data exists. Returning JSON...');
            return response.clone().json();
            // else if there is no data populated, there are no available devices found
          } else { 
            console.log('No available devices are found.');
          }
        })
          .then(data => {
            // use returned response.clone.json()
            // console.log('Searching for track...');
            track = data.item.name;
            artist = data.item.artists[0].name;

            query = encodeURIComponent(track + ' ' + artist);

            fetch('https://api.genius.com/search?q=' + query,{ 
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + geniusToken
              }
            })
              .then(response => response.json())
              .then(data => {
                // TODO: handle what happens when there are no hits
                let hits = data.response.hits;

                // url of first result
                url = hits[0].result.url;

                chrome.tabs.create({url: url});

                // title of result
                // console.log(hits[0].result.full_title);
              });
          });
      } else if (response.status == 204) {
        console.log('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.');
      } 
    })
}

function setAccessToken(token) {
  console.log('setAccessToken');
  // add one hour to current time to set as expirationDate of cookie
  // 3600000ms in an hour
  let expirationDate = Date.now() + 3600000;

  // set accessToken cookie
  chrome.cookies.set({
    url: 'https://accounts.spotify.com/api/token',
    name: 'accessToken',
    value: token,
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    expirationDate: expirationDate
  });
}
