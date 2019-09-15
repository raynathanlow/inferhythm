let redirectUri = chrome.identity.getRedirectURL('provider_cb');
let code, state, track, artist;
let sentState = randStr(10); 
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let responseUrl, accessToken, refreshToken;

window.onload = function() {
  document.querySelector('#log-in').addEventListener('click', function() {
    console.log('log-in');
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
    },
      function(response) {
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
          console.log('same state');
        } else {
          console.log('different state');
          console.log('sentState: ' + sentState);
          console.log('response state: ' + state);
        }
      })
  });

  document.querySelector('#request-a-r').addEventListener('click', function() {
    console.log('request-a-r');
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
        console.log(accessToken);
        console.log(refreshToken);

        // set accessToken cookie
        chrome.cookies.set({
          // the url has to be the current page?
          // not the url of where you got the data
          url: 'https://accounts.spotify.com/api/token',
          name: 'accessToken',
          value: accessToken
        }, function(cookie) {
          console.log('accessToken cookie set');
        });

        // set refreshToken cookie 
        chrome.cookies.set({
          // the url has to be the current page?
          // not the url of where you got the data
          url: 'https://accounts.spotify.com/api/token',
          name: 'refreshToken',
          value: refreshToken
        }, function(cookie) {
          console.log('refreshToken cookie set');
        });
      });
  });

    document.querySelector('#request-data').addEventListener('click', function() {
      console.log('request-data');
      fetch('https://api.spotify.com/v1/me/player/currently-playing',{ 
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
      })
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

          // get accessToken cookie
          chrome.cookies.get({
            url: 'https://accounts.spotify.com/api/token',
            name: 'accessToken'
          }, function(cookieArray) {
            console.log(cookieArray.value);
          });

          // get refreshToken cookie
          chrome.cookies.get({
            url: 'https://accounts.spotify.com/api/token',
            name: 'refreshToken'
          }, function(cookieArray) {
            console.log(cookieArray.value);
          });

          // use this if I want to get the featured artists
          // for (let artist of data.item.artists) {
          //   console.log(artist.name);
          // }
        });
    });

    document.querySelector('#request-r').addEventListener('click', function() {
      console.log('request-r');
      fetch('https://accounts.spotify.com/api/token',{ 
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          // btoa() encodes string in base-64
        },
        body: 'grant_type=refresh_token&refresh_token=' + refreshToken
        // body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + redirectUri + '&scope=user-read-currently-playing'
      })
      .then(response => response.json())
      .then(data => accessToken = data.access_token);
      console.log(accessToken);
    });
};

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
