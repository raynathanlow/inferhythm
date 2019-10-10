'use strict';

window.onload = async function() {
  const tokens = await getTokens();
  if (checkTokens(tokens)) {
    console.log('tokens OK');
    displayResults(getAccessToken(tokens), getRefreshToken(tokens), GENIUS_TOKEN);
  } else {
    if (getRefreshToken(tokens)) {
      let newAccessToken = await refreshAccessToken(CLIENT_ID, CLIENT_SECRET, getRefreshToken(tokens));
      // TODO: what happens when fail to refresh?
      displayResults(newAccessToken, getRefreshToken(tokens), GENIUS_TOKEN);
    } else {
      // TODO: get user authorization
    }
  }
}

async function displayResults(accessToken, refreshToken, geniusToken) {
  let html;

  try {
    let track = await getTrack(accessToken);
    let queries = generateQueries(track);
    let pages = await getPages(queries, geniusToken);
    let trackTitle = track.item.name;
    let trackArtists = track.item.artists;
    document.getElementById('track-title').textContent = trackTitle;
    document.getElementById('artists').textContent = generateArtistStr(trackTitle, trackArtists);
    let processedPages = processPages(pages);
    // TODO: HTML should depend on results of processedPages
    html = generateResultsHTML(processedPages);
    document.getElementById('hits').innerHTML = html;
  } catch(e) {
    // TODO: update popup with error - generate error HTML with e variable
    console.log(e);
  }
}

function getTokens() {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({
      url: 'https://accounts.spotify.com/api/token'
    }, tokens => {
      resolve(tokens);
      // TODO: reject()
    });
  });
}

function getAccessToken(tokens) {
  let filtered = tokens.filter(function(element) {
    return element.name == 'accessToken' && element.value && element.expirationDate;
  });

  if (filtered.length == 1) {
    if (checkValidity(filtered[0])) {
      return filtered[0].value;
    }
  }
  return '';
}

function getRefreshToken(tokens) {
  let filtered = tokens.filter(function(element) {
    return element.name == 'refreshToken' && element.value;
  });

  if (filtered.length == 1) {
    return filtered[0].value;
  }
  return '';
}

function checkTokens(tokens) {
  let access = getAccessToken(tokens);
  let refresh = getRefreshToken(tokens);

  if (access && refresh) {
    return true;
  } else {
    return false;
  }
}

function checkValidity(accessToken) {
  if (Date.now() < accessToken.expirationDate - 60000) return true;
  return false;
}

function refreshAccessToken(clientId, clientSecret, refreshToken) {
  return new Promise((resolve, reject) => {
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
        console.log('refreshAccessToken');
        setAccessToken(data.access_token);
        resolve(data.access_token);
      });
  });
}

function setAccessToken(token) {
  // add one hour to current time to set as expirationDate of cookie
  // 3600000ms in an hour
  let expirationDate = Date.now() + 3600000;

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

function getTrack(accessToken) {
  return new Promise((resolve, reject) => {
    fetch('https://api.spotify.com/v1/me/player/currently-playing',{ 
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    })
      .then (response => {
        switch (response.status) {
          case 200:
            response.clone().text()
              .then(text => {
                if (text.length > 0) return resolve(response.clone().json());
              });
            break
          case 401:
            reject('Invalid access token');
            break;
          case 204: 
            reject('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.');
            break;
        }
      });
  });
}

function generateQueries(track) {
  let queries = [];
  let artistsStr = '';

  // matches text in parentheses with feat/ft and ignores any right 
  // parentheses within it
  let regexFt = /[(\[](feat|ft|Feat|Ft)[^)\]]*[)\]]/g;
  // matches '-'  and anything after it
  let regexDash = /- .*/g;
  let regexBoth = /[(\[](feat|ft|Feat|Ft)[^)\]]*[)\]]|- .*/g;

  let titleClean = track.item.name.replace(regexBoth, '');

  let artists = track.item.artists;

  if (artists.length > 1) {
    // add all of the artists to the query

    artistsStr = joinArtistNames(artists, ' ');

    queries.push(encodeURIComponent(titleClean + ' ' + artists[0].name));
    queries.push(encodeURIComponent(titleClean + ' ' + artistsStr));
  } else {
    artistsStr += artists[0].name;

    queries.push(encodeURIComponent(titleClean + ' ' + artistsStr));
  }

  return queries;
}

function getPages(queries, token) {
  let pages = [];

  queries.forEach(function (query) {
    let arr = geniusRequest(query, token);
    pages.push(arr);
  });

  return Promise.all(pages);
}

function geniusRequest(query, token) {
  return new Promise((resolve, reject) => {
    fetch('https://api.genius.com/search?q=' + query,{ 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    })
      .then(response => response.json())
      .then(data => {
        resolve(data.response.hits);
        // TODO: reject()
      });
  });
}

function alternateMerge(arr1, arr2) {
  // alternate adding elements into a new array
  // https://stackoverflow.com/a/13253941
  return arr1.reduce(function(arr, v, i) {
    return arr.concat(v, arr2[i]); 
  }, []);
}

function keepUnique(arr) {
  // Boolean is there to remove any falsy values
  let filtered = arr.filter(Boolean);

  // https://stackoverflow.com/a/36744732
  return filtered.filter((item,index) => {
    // filter() creates new array with all elements that pass the test
    // implemented by the provided function
    // filter() iterates through each element (index)
    return index === filtered.findIndex(obj => {
      // findIndex() returns the index of the first element in the array
      // that satisfies the provided testing function
      // also iterates through each element (index)
      return JSON.stringify(obj) === JSON.stringify(item);
    });
  });
}

function processPages(pages) {
  let result;
  let arr1 = pages[0];
  if (pages.length > 1) {
    let arr2 = pages[1];
    if (arr1.length > arr2.length) {
      result = alternateMerge(arr1, arr2);
      return keepUnique(result);
    } else if (arr2.length > arr1.length) {
      result = alternateMerge(arr2, arr1);
      return keepUnique(result);
    } else {
      result = alternateMerge(arr1, arr2);
      return keepUnique(result);
    }
  } else {
    return arr1;
  }
}

function generateResultsHTML(pages) {
  let html = '';
  pages.forEach(function(page) {
    html += generatePageHTML(page);
  });
  return html;
}

function generatePageHTML(page) {
  return `<li>
      <a class="hit" target="_blank" rel="noopener noreferrer" href="${page.result.url}">
      <img src="${page.result.song_art_image_thumbnail_url}">
      <div class="text">
      <div>
      <div class="title">${page.result.title}</div>
      <div class="name">${page.result.primary_artist.name}</div>
      </div>
      `;
    if (typeof page.result.stats.pageviews !== 'undefined') {
      // eye icon from Genius.com
      html += `<div class="pageviews">
        <svg class="eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 15.45"><path d="M11 2c4 0 7.26 3.85 8.6 5.72-1.34 1.87-4.6 5.73-8.6 5.73S3.74 9.61 2.4 7.73C3.74 5.86 7 2 11 2m0-2C4.45 0 0 7.73 0 7.73s4.45 7.73 11 7.73 11-7.73 11-7.73S17.55 0 11 0z"></path><path d="M11 5a2.73 2.73 0 1 1-2.73 2.73A2.73 2.73 0 0 1 11 5m0-2a4.73 4.73 0 1 0 4.73 4.73A4.73 4.73 0 0 0 11 3z"></path></svg>
        ${page.result.stats.pageviews}
        </div>
        </div>
        </a>
        </li>`;
    } else {
      html += `</div>
        </a>
        </li>`;
    }
}

function joinArtistNames(artists, separator) {
  let artistNames = [];

  artists.forEach(function(artist) {
    artistNames.push(artist.name);
  });

  return artistNames.join(separator);
}

function generateArtistStr(title, artists) {
  let regexFt = /[(\[](feat|ft|Feat|Ft)[^)\]]*[)\]]/g;

  // if there are feat/ft in the track title
  if (regexFt.test(title)) {
    return artists[0].name;
  }
  return joinArtistNames(artists, ', ');
}
