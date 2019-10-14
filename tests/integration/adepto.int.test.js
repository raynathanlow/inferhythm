'use strict';

const { displayResults, getTokens, getAccessToken, getRefreshToken, 
  checkTokens, generateQueries, alternateMerge, keepUnique, 
  processPages, generateResultsHTML, generatePageHTML, joinArtistNames, 
  generateArtistStr } = require('../../popup');
const { mockGetTokens, mockRefreshAccessToken, mockGetTrack, mockGeniusRequest, mockGetPages } = require('../../popup.test');

const valid = mockGetTokens('valid');
const expired = mockGetTokens('expired');
const noValues = mockGetTokens('noValues');
const noExpiration = mockGetTokens('noExpiration');

const mockOnload = jest.fn(function(result, refreshResult) {
  return new Promise(async function(resolve, reject) {
    try {
      const tokens = await mockGetTokens(result);
      if (checkTokens(tokens)) {
        resolve('tokens ok');
      } else {
        if (getRefreshToken(tokens)) {
          let newAccessToken = await mockRefreshAccessToken(refreshResult);
          resolve('refreshed token');
        }
        throw 'get user authorization';
      }
    } catch (e) {
      reject(e);
    }
  });
});

const mockDisplayResults = jest.fn(function(accessToken, refreshToken, mockTrackResult, mockTrackData, mockQueries) {
  return new Promise(async function(resolve, reject) {
    let html;

    try {
      // let track = await getTrack(accessToken);
      let track = await mockGetTrack(mockTrackResult, mockTrackData);
      let trackTitle = track.item.name;
      let trackArtists = track.item.artists;
      // document.getElementById('track-title').textContent = trackTitle; // document.getElementById('artists').textContent = generateArtistStr(trackTitle, trackArtists);

      let queries = generateQueries(track);

      // let pages = await getPages(queries, geniusToken);
      let pages = await mockGetPages(mockQueries);
      let processedPages = processPages(pages);

      if (processedPages.length > 0) {
        html = generateResultsHTML(processedPages);
      } else {
        throw 'no pages';
      }
      // document.getElementById('hits').innerHTML = html;
      resolve(html);
    } catch(e) {
      reject(e);
    }
  });
});

test('displayResults successfully generates HTML', async function() {
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '200', 'artists 1', ['queryResultGreaterThan0'])
    .then(data => {
      expect(data).toMatch('<li>');
    });
});

test('No available devices are found', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '200', '', [''])
    .catch(e => {
      expect(e).toBe('No available devices are found');
    });
});

test('Invalid access token', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '401', '', [''])
    .catch(e => {
      expect(e).toBe('Invalid access token');
    });
});

test('Can\'t find currently playing track.', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '204', '', [''])
    .catch(e => {
      expect(e).toBe('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.');
    });
});

test('Unknown error', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '', '', [''])
    .catch(e => {
      expect(e).toBe('Unknown error');
    });
});

test('No pages 1 query', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '200', 'artists 1', ['queryResultIs0'])
    .catch(e => {
      expect(e).toBe('no pages');
    });
});

test('No pages 2 query', async function() {
  expect.assertions(1);
  return mockDisplayResults(getAccessToken(valid), getRefreshToken(valid), '200', 'artists 1', ['queryResultIs0', 'queryResultIs0'])
    .catch(e => {
      expect(e).toBe('no pages');
    });
});

test('tokens valid', async function() {
  mockOnload('valid', 'hasRefreshTokenKey').then(data => {
    expect(data).toBe('tokens ok');
  });
});

test('tokens expired', async function() {
  mockOnload('expired', 'hasRefreshTokenKey').then(data => {
    expect(data).toBe('refreshed token');
  });
});

test('tokens expired, no refresh token', async function() {
  expect.assertions(1);
  return mockOnload('expired', 'noRefreshToken')
    .catch(e => {
    expect(e).toBe('no access token');
  });
});

test('no token values', async function() {
  expect.assertions(1);
  return mockOnload('noValues', 'noRefreshToken')
    .catch(e => {
      expect(e).toBe('get user authorization');
    });
});
