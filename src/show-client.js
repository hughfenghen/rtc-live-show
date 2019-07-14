import io from 'socket.io-client';
import * as rrweb from 'rrweb';

const socket = io('http://localhost:4622');
const rtcPool = {}

socket.emit('user-regisiter', 'xxx');
socket.emit('getOnlineUsers', userIds => {
  console.log('---- online users', userIds);
});

socket.on('rtc-offer', async ({ offer, token }, sendAnswer) => {
  console.log('----rtc offer', offer, token);
  const rtcPC = new RTCPeerConnection(null);
  rtcPC.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await rtcPC.createAnswer();
  rtcPC.setLocalDescription(answer);
  rtcPool[token] = rtcPC
  sendAnswer(answer);
});

socket.on('rtc-ice-candidate', ({ candidate, token }) => {
  console.log('----rtc-ice-candidate', candidate, token);
  rtcPool[token].addIceCandidate(new RTCIceCandidate(candidate));
  createConnect(rtcPool[token])
});

function createConnect (rtcPC) {
  let stopRecord = () => { };
  rtcPC.ondatachannel = chanEvt => {
    console.log('------- Receive Channel Callback');
    const { channel } = chanEvt;
    channel.onopen = () => {
      console.log('------- channel open');
    };
    channel.onmessage = ({ data }) => {
      console.log('===== Received Message: ', channel, data);
      if (data === 'action play') {
        // rtc发送的数据有上限，安全起见单次最大发送16k数据，超过则分包发送
        const maxLen = 16 * 1024 - 1;
        stopRecord = rrweb.record({
          emit(event) {
            let ab = new TextEncoder().encode(JSON.stringify(event));
            console.log('=======ab.length', ab.length, channel.readyState);
            while (ab.length !== 0) {
              const sendContent = ab.slice(0, maxLen);
              ab = ab.slice(maxLen);
              channel.send(concatArrayBuffer(new Uint8Array([ab.length === 0 ? 1 : 0]), sendContent));
            }
          },
        });
      }
    };
    channel.onclose = () => {
      console.log('------ chan closed');
      stopRecord();
    };
  };
  rtcPC.onconnectionstatechange = evt => {
    console.log('--------- rtcPC onconnectionstatechange', evt);
    if (['disconnected', 'failed', 'closed'].includes(rtcPC.connectionState)) {
      stopRecord();
    }
  };
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
