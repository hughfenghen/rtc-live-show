const socketIO = require('socket.io');
const app = require('http').createServer()
app.listen(4622);

const onlineUser = {};

const io = socketIO(app);

io.on('connection', socket => {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', data => {
    console.log(data);
  });

  socket.on('user-regisiter', id => {
    console.log(44444, socket);
    onlineUser[id] = { socket };
  });
  socket.on('getOnlineUsers', send => {
    send(Object.keys(onlineUser));
  });

  socket.on('send-offer', (userId, offer, respAnswer) => {
    console.log(55555, onlineUser, userId);
    onlineUser[userId].socket.emit('rtc-offer', offer, answer => {
      respAnswer(answer);
    });
  });

  socket.on('send-ice-candidate', (userId, candiate) => {
    onlineUser[userId].socket.emit('rtc-ice-candidate', candiate);
  });
});
