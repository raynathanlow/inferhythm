'use strict';

const { getAccessToken, getRefreshToken, checkTokens, getTrack, 
  generateQueries, alternateMerge, keepUnique, processPages, generatePageHTML,
  generateResultsHTML, generateArtistStr, joinArtistNames } = require('./popup');

const mockGetTokens = jest.fn((set) => {
  return new Promise((resolve, reject) => {
    switch (set) {
      case 'noTokens':
        reject('no tokens');
        break;
      case 'valid':
        resolve([
          {
            name: 'accessToken',
            value: 'BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA',
            expirationDate: 2222222222222
          }, 
          {
            name: 'refreshToken',
            value: 'AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ',
            expirationDate: 2222222222222
          }
        ])
        break;
      case 'expired':
        resolve([
          {
            name: 'accessToken',
            value: 'BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA',
            expirationDate: 1111111111111
          }, 
          {
            name: 'refreshToken',
            value: 'AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ',
            expirationDate: 1111111111111
          }
        ])
        break;
      case 'noValues':
        resolve([
          {
            name: 'accessToken',
            expirationDate: 2222222222222
          }, 
          {
            name: 'refreshToken',
            expirationDate: 2222222222222
          }
        ])
        break;
      case 'noExpiration':
        resolve([
          {
            name: 'accessToken',
            value: 'BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA',
          }, 
          {
            name: 'refreshToken',
            value: 'AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ',
          }
        ])
        break;
      case 'noAccessToken':
        resolve([
          {
            name: 'refreshToken',
            value: 'AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ',
          }
        ])
        break;
      default:
        reject('no tokens');
        break;
    }
  });
});

test('getTokens reject', () => {
  expect.assertions(1);
  return mockGetTokens('noTokens').catch(e => expect(e).toMatch('no tokens'));
});

test('access token is valid', () => {
  return mockGetTokens('valid').then(data => {
    expect(getAccessToken(data).length).toBeGreaterThan(0);
  });
});

test('refresh token is valid', () => {
  return mockGetTokens('valid').then(data => {
    expect(getRefreshToken(data).length).toBeGreaterThan(0);
  });
});

test('access token has expired', () => {
  return mockGetTokens('expired').then(data => {
    expect(getAccessToken(data).length).toBe(0);
  });
});

test('no access token value', () => {
  return mockGetTokens('noValues').then(data => {
    expect(getRefreshToken(data).length).toBe(0);
  });
});

test('no refresh token value', () => {
  return mockGetTokens('noValues').then(data => {
    expect(getRefreshToken(data).length).toBe(0);
  });
});

test('no access token expiration', () => {
  return mockGetTokens('noExpiration').then(data => {
    expect(getAccessToken(data).length).toBe(0);
  });
});

const mockRefreshAccessToken = jest.fn((result) => {
  return new Promise((resolve, reject) => {
    switch (result) {
      case 'noRefreshToken':
        reject('no access token');
        break;
      case 'hasRefreshTokenKey':
        resolve('BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA');
        break;
    }
  });
});

test('refreshAccessToken no access token key', () => {
  expect.assertions(1);
  return mockRefreshAccessToken('noRefreshToken').catch(e => expect(e).toMatch('no access token'));
});

test('refreshAccessToken has access token key', () => {
  return mockRefreshAccessToken('hasRefreshTokenKey').then(data => {
    expect(data.length).toBeGreaterThan(0);
  });
});

const mockGetTrack = jest.fn((result, data) => {
  return new Promise((resolve, reject) => {
    switch (result) {
      case '200':
        if (data.length > 0) {
          if (data == 'artists 1') {
            resolve(
              {
                item: {
                  artists:[
                    { name: 'artist name 1'}
                  ],
                  name: 'track title - remastered'
                }
              });
          } else if (data == 'artists 1+') {
            resolve(
              {
                item: {
                  artists:[
                    { name: 'artist name 1'},
                    { name: 'artist name 2'}
                  ],
                  name: 'track title (Feat. featured artist)'
                }
              });
          } else if (data == 'artists 1+ no features') {
            resolve(
              {
                item: {
                  artists:[
                    { name: 'artist name 1'},
                    { name: 'artist name 2'}
                  ],
                  name: 'track title'
                }
              });
          } else {
            resolve(
              {
                item: {
                  artists:[
                    { name: 'artist name 1'},
                    { name: 'artist name 2'}
                  ],
                  name: 'track title (feat. featured artist)'
                }
              });
          }
        } else {
          reject('No available devices are found');
        }
        break;
      case '401':
        reject('Invalid access token');
        break;
      case '204':
        reject('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.');
        break;
      default:
        reject('Unknown error');
        break;
    }
  });
});

test('200 status and data.length is 0', () => {
  expect.assertions(1);
  return mockGetTrack('200', '').catch(e => expect(e).toMatch('No available devices are found'));
});

test('200 status and data.length is greater than 0', () => {
  return mockGetTrack('200', 'mock data').then(data => {
    expect(data).toHaveProperty('item');
  });
});

test('401 status', () => {
  expect.assertions(1);
  return mockGetTrack('401', 'mock data').catch(e => expect(e).toMatch('Invalid access token'));
});

test('204 status', () => {
  expect.assertions(1);
  return mockGetTrack('204', 'mock data').catch(e => expect(e).toMatch('Can\'t find currently playing track. Either no track is currently playing or your account is in a private session.'));
});

const mockGeniusRequest = jest.fn((query) => {
  return new Promise((resolve, reject) => {
    switch (query) {
      case 'queryResultGreaterThan0':
        resolve([{
          result: {
            title: 'title 1',
            primary_artist: {
              name: 'name 1'
            },
            stats: {
              pageviews: 'pageviews 1'
            },
            song_art_image_thumbnail_url: 'song_art_image_thumbnail_url 1'
          }
        },{
          result: {
            title: 'title 2',
            primary_artist: {
              name: 'name 2'
            },
            stats: {
              pageviews: 'pageviews 2'
            },
            song_art_image_thumbnail_url: 'song_art_image_thumbnail_url 2'
          }
        }])
        break;
      default:
        resolve([]);
        break;
    }
  });
});

test('query result greater than 0', () => {
  return mockGeniusRequest('queryResultGreaterThan0').then(data => {
    expect(data.length).toBeGreaterThan(0);
  });
});

test('no Genius results', () => {
  return mockGeniusRequest().then(data => expect(data.length).toBe(0));
});

test('check valid tokens', () => {
  return mockGetTokens('valid').then(data => {
    expect(checkTokens(data)).toBe(true);
  });
});

test('check expired tokens', () => {
  return mockGetTokens('expired').then(data => {
    expect(checkTokens(data)).toBe(false);
  });
});

test('check no token values', () => {
  return mockGetTokens('noValues').then(data => {
    expect(checkTokens(data)).toBe(false);
  });
});

test('check no expiration', () => {
  return mockGetTokens('noExpiration').then(data => {
    expect(checkTokens(data)).toBe(false);
  });
});

test('check no access token', () => {
  return mockGetTokens('noAccessToken').then(data => {
    expect(checkTokens(data)).toBe(false);
  });
});

test('generateQueries 1 artist remastered', () => {
  return mockGetTrack('200', 'artists 1').then(data => {
    expect(generateQueries(data)).toStrictEqual([encodeURIComponent('track title artist name 1')]);
  });
});

test('generateQueries 1+ artist uppercase Feat', () => {
  return mockGetTrack('200', 'artists 1+').then(data => {
    expect(generateQueries(data)).toStrictEqual([encodeURIComponent('track title artist name 1'), encodeURIComponent('track title artist name 1 artist name 2')]);
  });
});

test('generateQueries 1 artist lowercase feat', () => {
  return mockGetTrack('200', 'mock data').then(data => {
    expect(generateQueries(data)).toStrictEqual([encodeURIComponent('track title artist name 1'), encodeURIComponent('track title artist name 1 artist name 2')]);
  });
});

const mockGetPages = jest.fn(function(queries) {
  let pages = [];

  queries.forEach(function (query) {
    let arr = mockGeniusRequest(query);
    pages.push(arr);
  });

  return Promise.all(pages);
});

test('getPages 1 query', () => {
  return mockGetPages(['queryResultGreaterThan0'], ).then(data => {
    expect(data.length).toBe(1);
  });
});

test('getPages 1 query no results', () => {
  return mockGetPages(['queryResultIs0'], ).then(data => {
    expect(data.length).toBe(1);
  });
});

test('getPages 2 query', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultIs0'], ).then(data => {
    expect(data.length).toBe(2);
  });
});

test('getPages 2 query no results', () => {
  return mockGetPages(['queryResultIs0', 'queryResultIs0'], ).then(data => {
    expect(data.length).toBe(2);
  });
});

test('alternateMerge unequal arrays 1', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultIs0'], ).then(data => {
    expect(alternateMerge(data[0], data[1]).length).toBe(2);
  });
});

test('alternateMerge unequal arrays 2', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultIs0'], ).then(data => {
    expect(alternateMerge(data[1], data[0]).length).toBe(2);
  });
});

test('alternateMerge equal arrays', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultIs0'], ).then(data => {
    expect(alternateMerge(data[0], data[0]).length).toBe(4);
  });
});

test('keepUnique all unique', () => {
  return mockGetPages(['queryResultGreaterThan0'], ).then(data => {
    expect(keepUnique(data[0]).length).toBe(2);
  });
});

test('keepUnique some duplicates', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultGreaterThan0'], ).then(data => {
    expect(keepUnique(alternateMerge(data[0], data[0])).length).toBe(2);
  });
});

test('processPages all unique', () => {
  return mockGetPages(['queryResultGreaterThan0'], ).then(data => {
    expect(processPages(data).length).toBe(2);
  });
});

test('processPages some duplicates', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultGreaterThan0'], ).then(data => {
    expect(processPages(data).length).toBe(2);
  });
});

test('generatePageHTML 1 page', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultGreaterThan0'], ).then(data => {
    let pages = processPages(data);
    expect(generatePageHTML(pages[0])).toMatch('<li>');
  });
});

test('generateResultsHTML pages', () => {
  return mockGetPages(['queryResultGreaterThan0', 'queryResultGreaterThan0'], ).then(data => {
    let pages = processPages(data);
    expect(generateResultsHTML(pages)).toMatch('<li>');
  });
});

test('joinArtistNames artists 1+ by space', () => {
  return mockGetTrack('200', 'artists 1+').then(data => {
    expect(joinArtistNames(data.item.artists, ' ')).toBe('artist name 1 artist name 2');
  });
});

test('joinArtistNames artists 1 by space', () => {
  return mockGetTrack('200', 'artists 1').then(data => {
    expect(joinArtistNames(data.item.artists, ' ')).toBe('artist name 1');
  });
});

test('generateArtistStr artists 1', () => {
  return mockGetTrack('200', 'artists 1').then(data => {
    expect(generateArtistStr(data.item.name, data.item.artists)).toBe('artist name 1');
  });
});

test('generateArtistStr artists 1+ with features', () => {
  return mockGetTrack('200', 'artists 1+').then(data => {
    expect(generateArtistStr(data.item.name, data.item.artists)).toBe('artist name 1');
  });
});

test('generateArtistStr artists 1+ no features', () => {
  return mockGetTrack('200', 'artists 1+ no features').then(data => {
    expect(generateArtistStr(data.item.name, data.item.artists)).toBe('artist name 1, artist name 2');
  });
});

module.exports = { mockGetTokens, mockRefreshAccessToken, mockGetTrack, mockGeniusRequest, mockGetPages };
