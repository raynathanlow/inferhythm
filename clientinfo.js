'use strict';

function getClientInfo(name) {
  let spotifyId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  let spotifySecret = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  let geniusToken = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  return function() {
    switch(name) {
      case 'id':
        return spotifyId;
        break;
      case 'secret':
        return spotifySecret;
        break;
      case 'token':
        return geniusToken;
        break;
      default: 
        return '';
        break;
    }
  }
}

let getId = getClientInfo('id');
let getSecret = getClientInfo('secret');
let getGeniusToken = getClientInfo('token');
