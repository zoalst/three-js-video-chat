'use strict';
//$('#remoteVideo').hide();
//$('#localVideo').hide();

var localuser;
var remoteuser;

var isChannelReady;
var isInitiator = false;
var isStarted = false;

var localVideoStream;
var remoteVideoStream;
var pc;

var isFirefox = false;

var dataChannel;

var turnReady;
var pc_config;
window.turnserversDotComAPI.iceServers(function(data) {
 pc_config = {
  'iceServers': data
};
console.log(data);
});
//Ice Servers Added
// var pc_config = {
//   'iceServers': [{
//     'url': 'stun:stun.l.google.com:19302'
//   }]
// };

// pc_constraints is not currently used, but the below would allow us to enforce
// DTLS keying for SRTP rather than SDES ... which is becoming the default soon
// anyway. 
var pc_constraints = {
  'optional': [{
    'DtlsSrtpKeyAgreement': true
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};


// The following var's act as the interface between our HTML/CSS code
// and this JS. These allow us to interact between the UI and our application
// logic
var startButton = document.getElementById("startButton");

startButton.disabled = false;

startButton.onclick = createConnection;

//closeButton.onclick = closeDataChannels;

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

//TODO V this
//var room = location.pathname.substring(1);
var room = 'room';
//var user = location.pathname.substring(2);
var user = 'user';
var socket = io.connect();

var constraints = {
  audio: true,
  video: true
};

function createConnection() {
  if (user === '') {
    user = document.getElementById("userId").value;
  }

  if (room === '') {
    room = document.getElementById("roomId").value;
  }

  if (user === '' || room === '') {
    alert('Both Username and Room Name are Required.');
    return false;
  }
  $('.navbar-toggle').trigger('click');
  localuser = 'localuser';//document.getElementById("userId").value;
  if (room !== '') {
    socket.emit('create or join', room);
  }
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);

  if(navigator.mozGetUserMedia) {
    isFirefox = true;
  }
  if (location.hostname != "localhost") {
    requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
  }
}

socket.on('chat', function(message) {
  console.log(message);
  $('#chat').append("<span style='color:red;padding-left: 5px;'>" + message.user + "</spna>: " + message.msg + "</br>");
});

$('#msg').keypress(function(e) { // text written


  if (e.keyCode === 13) {
    if (user === '') {
      alert('Join Room First');
      return false;
    }
    if ($('#msg').val() === '')
      return false;
    var msg = $('#msg').val();
    var msgob = {
      'user': localuser,
      'msg': msg
    };
    socket.emit('chat', msgob);
    $('#chat').append("<span style='color:green;padding-left: 5px;'>Me</spna>: " + msgob.msg + "</br>");
    $('#msg').val('');
  }
});

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room' + room + " is full.");
});



socket.on('join', function(room) {
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('Room ' + room + ' Successsfully joined.');
  isChannelReady = true;
});



function sendMessage(message) {
  socket.emit('message', message);
}

socket.on('message', function(message) {
  if (message === 'Got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    //pc.setRemoteDescription(new RTCSessionDescription(message));
    pc.setRemoteDescription(new getSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    //pc.setRemoteDescription(new RTCSessionDescription(message));
    pc.setRemoteDescription(new getSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    /*var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });*/
    var candidate = getIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    //handleRemoteHangup();
  }
});

////////////////////////////////////////////////////
// This next section is where we deal with setting
// up the actual components of the communication
// we are interested in using. Starting with the
// video streams
////////////////////////////////////////////////////

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function handleUserMedia(stream) {

  console.log('Adding local stream.');
  localVideo.src = window.URL.createObjectURL(stream);
  localVideoStream = stream;
  sendMessage('Got user media');
  //$('#localimg').hide();
  //$('#localVideo').show();
  if (isInitiator) {
    maybeStart();
  }
}

function handleUserMediaError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function maybeStart() {
  if (!isStarted && typeof localVideoStream != 'undefined' && isChannelReady) {
    createPeerConnection();
    pc.addStream(localVideoStream);
    // Add data channels
    //createDataConnection();
    isStarted = true;
    //   console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function(e) {
  sendMessage('bye');
}



/////////////////////////////////////////////////////////
// Next we setup the data channel between us and the far
// peer. This is bi-directional, so we use the same
// connection to send/recv data. However its modal in that
// one end of the connection needs to kick things off,
// so there is logic that varies based on if the JS
// script is acting as the initator or the far end.
/////////////////////////////////////////////////////////
//get Mozilla or other RTCSessionDescription
function getSessionDescription(message) {
  if(isFirefox){
    return new mozRTCSessionDescription(message);
  }
  else{
    return new RTCSessionDescription(message);
  }
}

//get Mozilla or other RTCIceCandidate
function getIceCandidate(params) {
  if(isFirefox){
    return new mozRTCIceCandidate(params);
  }
  else{
    return new RTCIceCandidate(params);
  }
}

//get Mozilla or other RTCPeerConnection
function getRTCPeerConnection(params) {
  if(isFirefox){
    return new mozRTCPeerConnection(params);
  }
  else{
    return new webkitRTCPeerConnection(params);
  }
}

function createPeerConnection() {
  try {
    var servers = null;
    pc = getRTCPeerConnection(servers, {
        optional: [{
          RtpDataChannels: true
        }]
      });
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;

  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.' + e.message);
    return;
  }
}



function handleIceCandidate(event) {
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
    //$('#remoteimg').hide();
    //$('#remoteVideo').show();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteVideoStream = event.stream;
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', e);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  if(isFirefox) {  
    pc.createAnswer(setLocalAndSendMessage, handleCreateAnswerError, sdpConstraints);
  }
  else {
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
  }
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function handleCreateAnswerError(error) {
  console.log('createAnswer() error: ', e);
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteVideoStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}



function handleRemoteHangup() {
  //  console.log('Session terminated.');
  // stop();
  // isInitiator = false;
}



// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length - 1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}
