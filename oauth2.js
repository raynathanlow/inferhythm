let redirectUri = chrome.identity.getRedirectURL('provider_cb');
let code, state;
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

window.onload = function() {
  document.querySelector('button').addEventListener('click', function() {
    // 1. request application request authorization
    // authorization code is returned if user logs in and authorizes access
    chrome.identity.launchWebAuthFlow({
      url: 'https://accounts.spotify.com/authorize' +
      '?client_id=' + clientId + 
      '&response_type=code' +
      '&redirect_uri=' + redirectUri + 
      '&scope=user-read-currently-playing' + 
      '&state=XXXXXXXXXX', 
      interactive: true 
    },
      function(responseUrl) {
        // 2. request refresh and access tokens
        // Spotify returns access and refresh tokens

        // get the authorization code from the response
        // https://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
        // URL() constructor returns a URL object which represents the URL 
        // defined by its parameters
        let url = new URL(responseUrl);
        // URLSearchParams: an interface with utility methods that work with
        // the query string of a URL
        // A query string is the part of the URL that stores data which can be
        // passed to and from a web application and a server.
        // The query string follows the question mark sign in the URL
        code = url.searchParams.get("code");
        state = url.searchParams.get("state");

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
          .then(data =>
            // 3. use access token to access Spotify Web API
            // Spotify returns requested data
            fetch('https://api.spotify.com/v1/me/player/currently-playing',{ 
              method: 'GET',
              headers: {
                'Authorization': 'Bearer ' + data.access_token
              }
            })
            .then(response => response.json())
            // print name of user's currently playing song
            .then(data => console.log(data.item.name))
          );

        // 4. when access token expires, request a refreshed access token
        // Spotify returns a new access token to your app
        // a refresh token is what is used to refresh an expired access token instead
        // of an authorization code
        // fetch('https://accounts.spotify.com/api/token',{ 
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/x-www-form-urlencoded',
        //     'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        //     // btoa() converts string to base 64
        //   },
        //   body: 'grant_type=refresh_token&refresh_token=' + refreshToken
        // })
        //   .then(response => response.json())
        //   .then(data => {
        //     accessToken = data.access_token;
        //     console.log(accessToken);
        //   });

      }
    )
  });
};
