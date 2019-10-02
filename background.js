let accessToken, refreshToken, expirationDate;
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

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
        console.log('accessToken ED: ' + new Date(cookie.expirationDate));
      }
      // refreshToken
      if (cookie.name == 'refreshToken') {
        refreshToken = cookie.value;
        console.log('refreshToken ED: ' + new Date(cookie.expirationDate));
      }
    }

    // request track information if access token is still valid
    // otherwise, refresh access token and then request track information
    if (Date.now() < expirationDate - 60000) {
      console.log('accessToken is valid');
      console.log('Date.now(): ' + Date.now());
      console.log('expirationDate: ' + new Date(expirationDate));
      requestTrack();
    } else {
      console.log('accessToken has expired');
      console.log('Date.now(): ' + Date.now());
      console.log('expirationDate: ' + new Date(expirationDate));

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
