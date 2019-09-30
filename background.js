let accessToken, refreshToken, expirationDate;
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

chrome.runtime.onInstalled.addListener(function() {
  chrome.tabs.create({url: 'index.html'});
});

chrome.browserAction.onClicked.addListener(() => {
  // redirect to Genius page

  // get accessToken, expirationDate
  chrome.cookies.get({
    url: 'https://accounts.spotify.com/api/token',
    name: 'accessToken'
  }, cookieArray => {
    accessToken = cookieArray.value
    expirationDate = cookieArray.expirationDate;
  });

  // get refreshToken
  chrome.cookies.get({
    url: 'https://accounts.spotify.com/api/token',
    name: 'refreshToken'
  }, cookieArray => {
    refreshToken = cookieArray.value
  });

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
