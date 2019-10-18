'use strict';

let redirectUri = chrome.identity.getRedirectURL('provider_cb');
let code, state, track, artist;
let sentState = randStr(10); 
let responseUrl, accessToken, refreshToken, expirationDate;

window.onload = function() {
  document.querySelector('#sign-in').addEventListener('click', requestAuthorization);
};

/**
 * Prompt user to authorize Inferhythm access to read currently playing song on
 * @return {undefined}
 */
function requestAuthorization() {
  // 1. request application request authorization
  // authorization code is returned if user logs in and authorizes access
  chrome.identity.launchWebAuthFlow({
    url: 'https://accounts.spotify.com/authorize' +
    '?client_id=' + getId() + 
    '&response_type=code' +
    '&redirect_uri=' + redirectUri + 
    '&scope=user-read-currently-playing' + 
    '&state=' + sentState, 
    interactive: true 
  }, response => {
    // get the authorization code from the response
    // https://stackoverflow.com/questions/979975/
    // how-to-get-the-value-from-the-get-parameters
    // URL() constructor returns a URL object which represents the URL 
    // defined by its parameters
    if (response) {
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
        requestTokens(code);
      } 
    } else {
      window.location.href = 'abort.html';
    }
  });
}

/**
 * Get and set access and refresh tokens using code received from user 
 * authorization
 * @return {undefined}
 */
function requestTokens(code) {
  fetch('https://accounts.spotify.com/api/token',{ 
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(getId() + ':' + getSecret())
      // btoa() encodes string in base-64
    },
    body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + 
    redirectUri + '&scope=user-read-currently-playing'
  })
    .then(response => response.json())
    .then(data => {
      accessToken = data.access_token;
      refreshToken = data.refresh_token;

      setAccessToken(accessToken);

      // refresh token doesn't actually expire, but
      // setting the refresh token to "expire" after one year, for now
      // this is so that the user doesn't have to reauthenticate so often
      // maybe if the user chooses not to keep logged in, then this cookie
      // should expire when the browser is closed, aka no expiration date
      let expirationDate = new Date(Date.now());
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      // set refreshToken cookie 
      chrome.cookies.set({
        url: 'https://accounts.spotify.com/api/token',
        name: 'refreshToken',
        value: refreshToken,
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expirationDate: Date.parse(expirationDate)
      });

      window.location.href = 'success.html';
    });
}

/**
 * Set access token cookie
 * @return {undefined}
 */
function setAccessToken(accessToken) {
  // add one hour to current time to set as expirationDate of cookie
  // 3600000ms in an hour
  let expirationDate = Date.now() + 3600000;

  // console.log('expirationDate: ' + new Date(expirationDate));

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

/**
 * Generate random string of alphanumeric characters
 * @param  {number} Length of string to generate
 * @return {string}
 */
// https://stackoverflow.com/a/1349426
function randStr(length) {
  let result           = '';
  let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
