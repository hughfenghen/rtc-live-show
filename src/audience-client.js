import io from 'socket.io-client';
import RRWebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

const socket = io('http://localhost:4622');
const rtcPC = new RTCPeerConnection(null);

const onlineUserEl = document.querySelector('.online-user')
onlineUserEl.addEventListener('click', onConnectUser)

socket.emit('getOnlineUsers', userIds => {
  console.log('---- online users', userIds);
  onlineUserEl.innerHTML = userIds
});
rtcPC.onicecandidate = ({ candidate }) => {
  console.log('------ send candiate to ', candidate);
  if (candidate !== null) {
    sendCandidate(candidate);
  }
};
const sendChannel = rtcPC.createDataChannel('sendDataChannel');
sendChannel.onopen = () => {
  console.log('------ sendChannel open');
  sendChannel.send('action play');
};
let buffer = new Uint8Array();
sendChannel.onmessage = evt => {
  const msg = new Uint8Array(evt.data);
  const isComplete = !!msg[0];
  const content = msg.slice(1);
  buffer = concatArrayBuffer(buffer, content);
  console.log('---- chan msg', buffer);
  try {
    if (isComplete) {
      const str = new TextDecoder().decode(buffer);
      buffer = new Uint8Array();
      addEvent(JSON.parse(str));
    }
  } catch (err) {
    console.error(err);
  }
};

const that = {
  rrwebEvts: [],
}
function addEvent(evt) {
  if (!that.player) {
    that.rrwebEvts.push(evt);
    if (that.rrwebEvts.length >= 2) {
      that.player = new RRWebPlayer({
        target: document.querySelector('.scene'),
        data: {
          events: that.rrwebEvts.slice(0),
        },
      });
    }
  } else {
    that.player.addEvent(evt);
  }
}
async function onConnectUser(evt) {
  that.curUserId = evt.target.innerText;
  const offer = await rtcPC.createOffer();
  rtcPC.setLocalDescription(offer);
  console.log('------ send offer to ', that.curUserId, offer);
  socket.emit('send-offer', that.curUserId, offer, answer => {
    console.log('------ received answer: ', answer);
    rtcPC.setRemoteDescription(new RTCSessionDescription(answer));
  });
}
function sendCandidate(candidate) {
  if (that.curUserId) {
    socket.emit('send-ice-candidate', that.curUserId, candidate);
    return;
  }
  console.log('curUserId is null');
}

function concatArrayBuffer(...arrays) {
  let totalLength = 0;
  for (let arr of arrays) {
    totalLength += arr.length;
  }
  let result = new arrays[0].constructor(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}