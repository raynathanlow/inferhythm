'use strict';

window.onload = async function() {
  document.body.innerHTML = '<p>Getting track that\'s currently playing...</p>';
  try {
    const tokens = await getTokens();
    if (checkTokens(tokens)) {
      displayResults(getAccessToken(tokens), getRefreshToken(tokens), getGeniusToken());
    } else {
      if (getRefreshToken(tokens)) {
        let newAccessToken = await refreshAccessToken(getId(), getSecret(), getRefreshToken(tokens));
        displayResults(newAccessToken, getRefreshToken(tokens), getGeniusToken());
      } 
    }
  } catch (e) {
    errorHTML(e);
  }
}

/**
 * Update HTML with currently playing track information and Genius results
 * @param  {string} accessToken User's Spotify access token
 * @param  {string} refreshToken User's Spotify token to refresh access token
 * @param  {string} geniusToken Genius client access token
 * @return {undefined}
 */
async function displayResults(accessToken, refreshToken, geniusToken) {

  try {
    let track = await getTrack(accessToken);
    let trackTitle = track.item.name;
    let trackArtists = track.item.artists;

    let artistsStr = generateArtistStr(trackTitle, trackArtists);

    searchHTML(track, artistsStr);

    let queries = generateQueries(track);
    let pages = await getPages(queries, geniusToken);
    let processedPages = processPages(pages);
    if (processedPages.length > 0) {
      let results = generateResultsHTML(processedPages);
      resultsHTML(track, artistsStr, results);
      googleLinks(trackTitle, trackArtists);
    } else {
      document.body.innerHTML = '<h1>No results</h1>';
      googleLinks(trackTitle, trackArtists);
    }
  } catch(e) {
    errorHTML(e);
  }

}

/**
 * Get all tokens from Chrome with https://accounts.spotify.com/api/token as url
 * @return {object}
 */
function getTokens() {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({
      url: 'https://accounts.spotify.com/api/token'
    }, tokens => {
      if (tokens.length > 0) {
        resolve(tokens);
      } else {
        reject('No tokens');
      }
    });
  });
}

/**
 * Get value of Spotify access token cookie
 * @param  {array<object>} tokens Array of cookies from https://accounts.spotify.com/api/token
 * @return {string}
 */
function getAccessToken(tokens) {
  if (Array.isArray(tokens)) {
    let filtered = tokens.filter(function(element) {
      return element.name == 'accessToken' && element.value && element.expirationDate;
    });

    if (filtered.length == 1) {
      if (Date.now() < filtered[0].expirationDate - 60000) {
        return filtered[0].value;
      }
    }
  }

  return '';
}

/**
 * Get value of Spotify refresh token cookie
 * @param  {array<object>} tokens Return value of getTokens()
 * @return {string}
 */
function getRefreshToken(tokens) {
  if (Array.isArray(tokens)) {
    let filtered = tokens.filter(function(element) {
      return element.name == 'refreshToken' && element.value;
    });

    if (filtered.length == 1) {
      return filtered[0].value;
    }
  }

  return '';
}

/**
 * Check that both access and refresh token values exist
 * @param  {array<object>} tokens Return value of getTokens()
 * @return {boolean}
 */
function checkTokens(tokens) {
  let access = getAccessToken(tokens);
  let refresh = getRefreshToken(tokens);

  if (access && refresh) {
    return true;
  } else {
    return false;
  }
}

/**
 * Refresh and set access token as cookie
 * @param  {string} clientId     Spotify client ID
 * @param  {string} clientSecret Spotify client secret
 * @param  {string} refreshToken User's Spotify refresh token
 * @return {object}
 */
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
        // console.log('refreshAccessToken');
        if (data.access_token) {
          setAccessToken(data.access_token);
          resolve(data.access_token);
        } else {
          reject('no access token');
        }
      });
  });
}

/**
 * Set Spotify access token as a cookie
 * @param  {string} token User's new Spotify access token
 * @return {undefined}
 */
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

/**
 * Make GET request to Spotify to get user's currently playing track
 * @param  {string} accessToken User's Spotify access token
 * @return {object}
 */
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
                if (text.length > 0) {
                  resolve(response.clone().json());
                } else {
                  reject('No available devices are found');
                }
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

/**
 * Generate array of query strings
 * @param  {object} track User's currently playing track
 * @return {array<string>} 
 */
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

    queries.push(encodeURIComponent(titleClean.trim() + ' ' + artists[0].name));
    queries.push(encodeURIComponent(titleClean.trim() + ' ' + artistsStr));
  } else {
    artistsStr += artists[0].name;

    queries.push(encodeURIComponent(titleClean.trim() + ' ' + artistsStr));
  }

  return queries;
}

/**
 * Create array of arrays with results of Genius GET request
 * @param  {array<string>} queries Array of query strings
 * @param  {string}        token   Genius client access token
 * @return {array<array<object>>}
 */
function getPages(queries, token) {
  let pages = [];

  queries.forEach(function (query) {
    let arr = geniusRequest(query, token);
    pages.push(arr);
  });

  return Promise.all(pages);
}

/**
 * Make Genius GET request 
 * @param  {string} query Query string
 * @param  {string} token Genius client access token
 * @return {object}
 */
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
        if (data.response.hits.length > 0) {
          resolve(data.response.hits);
        } else {
          resolve([]);
        }
      });
  });
}

/**
 * Create new array where it takes one element from each array at a time
 * @param  {array<object>} arr1 A non-empty array
 * @param  {array<object>} arr2 A non-empty array
 * @return {array<object>}
 */
function alternateMerge(arr1, arr2) {
  // alternate adding elements into a new array
  // https://stackoverflow.com/a/13253941
  let result;
  if (arr1.length > arr2.length) {
    result = arr1.reduce(function(arr, v, i) {
      return arr.concat(v, arr2[i]); 
    }, []);
  } else if (arr2.length > arr1.length) {
    result = arr2.reduce(function(arr, v, i) {
      return arr.concat(v, arr1[i]); 
    }, []);
  } else {
    result = arr1.reduce(function(arr, v, i) {
      return arr.concat(v, arr2[i]); 
    }, []);
  }

  result = result.filter(Boolean);

  // Boolean is there to remove any falsy values
  return result;
}

/**
 * Filter array down where there are no duplicate elements
 * @param  {array<object>} arr A non-empty array
 * @return {array<object>}
 */
function keepUnique(arr) {
  // https://stackoverflow.com/a/36744732
  return arr.filter((item,index) => {
    // filter() creates new array with all elements that pass the test
    // implemented by the provided function
    // filter() iterates through each element (index)
    return index === arr.findIndex(obj => {
      // findIndex() returns the index of the first element in the array
      // that satisfies the provided testing function
      // also iterates through each element (index)
      return JSON.stringify(obj) === JSON.stringify(item);
    });
  });
}

/**
 * Get a finalized array of Genius pages
 * @param  {array<array<object>>} pages Array of arrays with objects
 * @return {array<object>}
 */
function processPages(pages) {
  let result;
  let arr1 = pages[0];
  if (pages.length > 1) {
    let arr2 = pages[1];
    result = alternateMerge(arr1, arr2);
    return keepUnique(result);
  } else {
    return arr1;
  }
}

/**
 * Generate HTML for all Genius pages
 * @param  {array<object>} pages Genius page objects
 * @return {string}
 */
function generateResultsHTML(pages) {
  let html = '';
  pages.forEach(function(page) {
    html += generatePageHTML(page);
  });
  return html;
}

/**
 * Generate HTML for one Genius page
 * @param  {object} page Genius page object
 * @return {string}
 */
function generatePageHTML(page) {
  return `<li>
      <a class="page" target="_blank" rel="noopener noreferrer" href="${page.result.url}">
      <img src="${page.result.song_art_image_thumbnail_url}">
      <div class="page-text">
        <div>
          <div class="page-title">${page.result.title}</div>
          <div class="page-artist">${page.result.primary_artist.name}</div>
        </div>
      </div>
    </a>
  </li>`;
}

/**
 * Join artist names found in each artist object by separator
 * @param  {array<object>} artists   Array of artist objects
 * @param  {string}        separator Separator to separate names by
 * @return {string}
 */
function joinArtistNames(artists, separator) {
  let artistNames = [];

  artists.forEach(function(artist) {
    artistNames.push(artist.name);
  });

  return artistNames.join(separator);
}

/**
 * Generate string with artist(s) depending if there are features in the track title
 * @param {string}  title   Title of track
 * @param {artists} artists Array of artist objects
 * @return {string}
 */
function generateArtistStr(title, artists) {
  let regexFt = /[(\[](feat|ft|Feat|Ft)[^)\]]*[)\]]/g;

  // if there are feat/ft in the track title
  if (regexFt.test(title)) {
    return artists[0].name;
  }
  return joinArtistNames(artists, ', ');
}

/**
 * Show loading message
 * @param {bool} show To show or not to show loading message
 * @return {undefined}
 */
function showLoadingMsg(show) {
  if (show) {
    document.getElementById('loading').style.display = "block";
  } else {
    document.getElementById('loading').style.display = "none";
  }
}

/**
 * Replace body with HTML to show while searching for Genius pages
 * @param {object} track Currently playing track
 * @return {undefined}
 */
function searchHTML(track, artistsStr) {
  document.body.innerHTML = `<main id="search">
      <h1>Searching...</h1>
      <img class="search-img" src="${track.item.album.images[1].url}">
      <p class="search-title">${track.item.name}</p>
      <p class="search-artists">${artistsStr}</p>
    </main>`;
}

/**
 * Replace body with HTML to show results
 * @return {undefined}
 */
function resultsHTML(track, artistsStr, results) {
  document.body.innerHTML = `<main id="results" class="fade-in">
      <h1>Results</h1>
      <ul>
        ${results}
      </ul>
    </main>`;
}

/**
 * Replace body with HTML to show before user has authorized Inferhythm
 * @return {undefined}
 */
function beforeAuthHTML() {
  document.body.innerHTML = `<h1>Inferhythm</h1>`;
  document.body.innerHTML = `<h1>Inferhythm</h1>
    <p>Inferhythm helps you find the Genius page for the song you're currently listening to on Spotify.</p>
    <p>Please <a class="link" href="index.html">sign in</a> to get started!</p>`;
}


/**
 * Replace body with HTML to show error
 * @return {undefined}
 */
function errorHTML(errorMsg) {
  document.body.innerHTML = '<h1>Something went wrong!</h1>';
  switch(errorMsg) {
    case 'No available devices are found':
      document.body.innerHTML += '<p>No available devices are found.</p>';
      document.body.innerHTML += '<p>Make sure that you have Spotify installed on one of your devices and logged in, then try again.</p>';
      break;
    case 'Invalid access token':
      document.body.innerHTML += '<p>Invalid access token. Please <a class="link" href="index.html">sign in</a> again.</p>';
      break;
    case 'Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.':
      document.body.innerHTML += '<p>Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.</p>';
      break;
    case 'No tokens':
      document.body.innerHTML = `<h1>Inferhythm</h1>
        <p>Inferhythm helps you find the Genius page for the song you're currently listening to on Spotify.</p>
        <p>Please <a class="link" target="_blank" rel="noopener noreferrer" href="index.html">sign in</a> to get started!</p>`;
      break;
    default:
      document.body.innerHTML += '<p>Unknown error occured. Try restarting Google Chrome and/or Spotify, then try again.</p>';
      break;
  }
}

/**
 * Append Google Search links to body
 * @return {undefined}
 */
function googleLinks(trackTitle, trackArtists) {
  let track = trackTitle.replace(/ /g, '+');
  let artists = joinArtistNames(trackArtists, '+');
  document.body.innerHTML += `<nav id="google-links">
      <p>If results are unsatisfactory, here are links to find it on Google:</p>
      <ul>
        <li><a class="link" target="_blank" rel="noopener noreferrer" href="http://www.google.com/search?q=${track}+${artists}+%22Genius%22">Genius page</a></li>
        <li><a class="link" target="_blank" rel="noopener noreferrer" href="http://www.google.com/search?q=${track}+${artists}+%22lyrics%22">Plain lyrics</a></li>
      </ul>
    </nav>`;
}

// module.exports = { displayResults, getTokens, getAccessToken, getRefreshToken, 
//   checkTokens, generateQueries, alternateMerge, keepUnique, 
//   processPages, generateResultsHTML, generatePageHTML, joinArtistNames, 
//   generateArtistStr }
