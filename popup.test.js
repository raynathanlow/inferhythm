'use strict';

const { getAccessToken, getRefreshToken, getTrack } = require('./popup');

const mockGetTokens = jest.fn((set) => {
  return new Promise((resolve, reject) => {
    switch (set) {
      case 'notArray':
        resolve('');
        break;
      case 'noElements':
        resolve([]);
        break;
      case 'emptyElements':
        resolve([{}, {}]);
        break;
      case 'valid':
        resolve([
          {
            name: "accessToken",
            value: "BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA",
            expirationDate: 2222222222222
          }, 
          {
            name: "refreshToken",
            value: "AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ",
            expirationDate: 2222222222222
          }
        ])
        break;
      case 'expired':
        resolve([
          {
            name: "accessToken",
            value: "BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA",
            expirationDate: 1570744415057
          }, 
          {
            name: "refreshToken",
            value: "AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ",
            expirationDate: 1570744415057
          }
        ])
        break;
      case 'noValues':
        resolve([
          {
            name: "accessToken",
            expirationDate: 2222222222222
          }, 
          {
            name: "refreshToken",
            expirationDate: 2222222222222
          }
        ])
        break;
      case 'noExpiration':
        resolve([
          {
            name: "accessToken",
            value: "BQD1pnihcoOsEkt4Tc-d2US405Bq5gs6tYARkXr4QOJ35XRK_lxeajvJUAE3eBp5COVN9biwfKda8xPjwUHfz4TOQMUt29Obat3VzLhrJkFvHeA8KIZSbqTrE5Qykq7JttOKO5J136ApJIbX2btS1dgRRA",
          }, 
          {
            name: "refreshToken",
            value: "AQD-8aKrfo4a3iMmied8HJnQxUyafsfTjtq7KL4xhstZS7wyqTp70OThASrfYhRxREzIhH0KeWDi2W9H_v8C5jlA985rmZu9GPkRw78JVryPRqQyR7YsonYzApVBj4yG9Q5BKQ",
          }
        ])
        break;
      default:
        reject('no tokens');
        break;
    }
  });
});

test('tokens not array', () => {
  return mockGetTokens('notArray').then(data => {
    expect(getAccessToken(data).length).toBe(0);
  });
});

test('tokens not array', () => {
  return mockGetTokens('notArray').then(data => {
    expect(getRefreshToken(data).length).toBe(0);
  });
});

test('no access token', () => {
  return mockGetTokens('noElements').then(data => {
    expect(getAccessToken(data).length).toBe(0);
  });
});

test('no refresh token', () => {
  return mockGetTokens('noElements').then(data => {
    expect(getRefreshToken(data).length).toBe(0);
  });
});

test('empty elements', () => {
  return mockGetTokens('emptyElements').then(data => {
    expect(getAccessToken(data).length).toBe(0);
  });
});

test('empty elements', () => {
  return mockGetTokens('emptyElements').then(data => {
    expect(getRefreshToken(data).length).toBe(0);
  });
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

test('getTokens reject', () => {
  expect.assertions(1);
  return mockGetTokens().catch(e => expect(e).toMatch('no tokens'));
});
