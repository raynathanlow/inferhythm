let accessToken, refreshToken, expirationDate;
let clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
let clientSecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

let geniusToken = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

window.onload = function() {
  // redirect to Genius page
  chrome.cookies.getAll({
    url: 'https://accounts.spotify.com/api/token'
  }, cookieArray => {
    refreshToken = accessToken = expirationDate = '';

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
    if (Date.now() < expirationDate - 60000 && accessToken) {
      console.log('accessToken is valid');
      console.log('Date.now(): ' + Date.now());
      console.log('expirationDate: ' + new Date(expirationDate));
      requestTrack();
    } else {
      console.log('accessToken has expired or there is no accessToken');
      console.log('Date.now(): ' + Date.now());
      console.log('expirationDate: ' + new Date(expirationDate));

      if (refreshToken) {
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
      } else {
        console.log('no refresh token to refresh access token, authenticate again');
        // launch authentication again
      }
    }
  });
}

function requestTrack() {
  // console.log('request track');
  let title, titleClean, artistsStr, queryFirst, queryAll;
  let artists = [];

  title = titleClean = artistsStr = query = '';

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
            // console.log(data);

            // matches text in parentheses with feat/ft and ignores any right 
            // parentheses within it
            // matches '-'  and anything after it
            let regexFt = /[(\[](feat|ft)[^)\]]*[)\]]/g;
            let regexDash = /- .*/g;
            let regexBoth = /[(\[](feat|ft)[^)\]]*[)\]]|- .*/g;

            title = data.item.name;
            // clean up track title with regex
            titleClean = title.replace(regexBoth, '');

            // add all of the artists to the query
            for (let artist of data.item.artists) {
              // combine artist names to a variable to add to query
              artistsStr += artist.name + ' ';
              artists.push(artist.name);
            }

            // update #track-title, #artists
            document.getElementById('track-title').textContent = title;
            // if title has features, then just put the first artist's name
            if (regexFt.test(title)) {
              document.getElementById('artists').textContent = artists[0];
            } else {
              // comma and separated (, ) list of artists
              // make them links to their Spotify pages?
              document.getElementById('artists').textContent = artists;
            }

            queryFirst = encodeURIComponent(titleClean + ' ' + artists[0]);
            queryAll = encodeURIComponent(titleClean + ' ' + artistsStr);

            // to get no results
            // queryFirst = encodeURIComponent('qpqpqp');
            // queryAll = encodeURIComponent('qpqpqp');

            if (artists.length > 1) {
              searchAll(queryFirst, queryAll)
                .then(data => {
                  console.log(data);
                })
                .catch(err => console.log(err));
            } else {
              // search(queryFirst).catch(err => console.log(err));
              search(queryFirst)
                .then(data => {
                  console.log(data)
                })
                .catch(err => console.log(err));
            }
          });
      } else if (response.status == 204) {
        console.log('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.');
      } 
    });
}

function search(query) {
  console.log('query: ' + query);

  return new Promise((resolve, reject) => {
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

        // console.log(hits);

        // for (let hit of hits) {
        //   console.log(hit.result.id);
        // }

        if (hits.length > 0) {
          resolve(hits);
        } else {
          reject("No results");
        }
      })
     .catch(error => console.log('error is', error));
  });
}

function searchAll(query1, query2) {
  console.log('searchAll');
  // Search for title with first artist only
  // Search for title with first artist and other artists
  let hits1, hits2, finalHits, combined;
  hits1 = hit2 = finalHits = [];

  return new Promise((resolve, reject) => {
    search(query1).then(hits => {
      hits1 = hits;
      search(query2).then(hits => {
        hits2 = hits;

        // let temp = '';
        // console.log('hits1');
        // for (let hit of hits1) {
        //   temp += hit.result.id + ' ';
        //   // console.log(hit.result.id);
        // }
        // console.log(temp);
        // temp = '';

        // console.log('hits2');
        // for (let hit of hits2) {
        //   temp += hit.result.id + ' ';
        //   // console.log(hit.result.id);
        // }
        // console.log(temp);

        // alternate adding hits into a new array
        // https://stackoverflow.com/a/13253941
        combined = hits1.reduce(function(arr, v, i) {
          return arr.concat(v, hits2[i]); 
        }, []);

        // remove undefined values since sometimes hits1, hits2 may not be same legnth
        // Boolean is there to remove any falsy values
        combined = combined.filter(Boolean);

        // only keep unique hits
        // https://stackoverflow.com/a/36744732
        finalHits = combined.filter((item,index) => {
          // filter() creates new array with all elements that pass the test
          // implemented by the provided function
          // filter() iterates through each element (index)
          return index === combined.findIndex(obj => {
            // findIndex() returns the index of the first element in the array
            // that satisfies the provided testing function
            // also iterates through each element (index)
            return JSON.stringify(obj) === JSON.stringify(item);
          });
        });

        console.log(finalHits.length);
        // return combined list
        if (finalHits.length > 0) {
          resolve(finalHits);
        } else {
          reject('No results');
        }

        // temp = '';
        // console.log('finalHits');
        // for (let hit of finalHits) {
        //   temp += hit.result.id + ' ';
        // }
        // console.log(temp);
        // console.log(finalHits.length);
      })
      // if only query1 works
      .catch(() => {
        resolve(hits1);
      });
    })
    // .catch(error => console.log('error is', error));
    // if query1 fails, search for query2
    .catch(() => search(query2));
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

