import io from 'socket.io-client';
import RRWebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

const socket = io('http://localhost:4622');
const rtcPC = new RTCPeerConnection(null);

socket.emit('getOnlineUsers', userIds => {
  console.log('---- online users', userIds);
  onlineUsers = userIds;
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

function addEvent(evt) {
  if (!this.player) {
    this.rrwebEvts.push(evt);
    if (this.rrwebEvts.length >= 2) {
      this.player = new RRWebPlayer({
        target: this.$refs.scene,
        data: {
          events: this.rrwebEvts.slice(0),
        },
      });
    }
  } else {
    this.player.addEvent(evt);
  }
}
async function onConnectUser(userId) {
  this.curUserId = userId;
  const offer = await this.rtcPC.createOffer();
  this.rtcPC.setLocalDescription(offer);
  console.log('------ send offer to ', userId, offer);
  this.socket.emit('send-offer', userId, offer, answer => {
    console.log('------ received answer: ', answer);
    this.rtcPC.setRemoteDescription(new RTCSessionDescription(answer));
  });
}
function sendCandidate(candidate) {
  if (this.curUserId) {
    this.socket.emit('send-ice-candidate', this.curUserId, candidate);
    return;
  }
  console.log('curUserId is null');
}