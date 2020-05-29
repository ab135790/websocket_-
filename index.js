/*
 * @Author: your name
 * @Date: 2020-05-27 13:56:55
 * @LastEditTime: 2020-05-29 16:52:36
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \demo\server\index.js
 */
const WebSocket = require('ws');
const http = require('http');
const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer();
const jwt = require('jsonwebtoken');

const timeInterval = 1000;
// 房间分组
let group = {};

// 多聊天室的功能
// roomid => 对应相同的roomid进行广播消息

wss.on('connection', function connection (ws) {
    // 初始的心跳连接状态
    ws.isAlive = true;
    console.log('one client is connected');
    // 接收客户端的消息
    ws.on('message', function(msg) {
        const msgObj = JSON.parse(msg);
        if (msgObj.event === 'enter') {
            ws.name = msgObj.message;
            ws.roomid = msgObj.roomid;
            if (typeof group[ws.roomid] === 'undefined') {
                group[ws.roomid] = 1;
            } else {
                group[ws.roomid]++;
            }
        }
        // 鉴权
        if (msgObj.event === 'auth') {
            jwt.verify(msgObj.message, 'secret', (err, decode) => {
                if (err) {
                    // websocket返回前台鉴权失败信息
                    ws.send(JSON.stringify({
                        event: 'noauth',
                        message: 'please auth again'
                    }))
                    return;
                } else {
                    // 鉴权通过
                    console.log(decode);
                    ws.isAuth = true;
                    return;
                }
            })
            return
        }
        // 拦截非鉴权的请求
        if (!ws.isAuth) {
            return;
        }
        // 心跳檢測
        if (msgObj.event === 'heartbeat' && msgObj.message === 'pong') {
            ws.isAlive = true;
            return
        }
        // 主动发送消息给客户端
        // ws.send('server:' +  msg)
        wss.clients.forEach(client => {
            // 判断非自己的客户端,相同的用户roomid 进行广播
            if (client.readyState === WebSocket.OPEN && client.roomid === ws.roomid) {
                msgObj.name = ws.name;
                msgObj.num = group[ws.roomid];
                client.send(JSON.stringify(msgObj));
            }
        })
    })
    
    // 当ws客户端断开连接的时候
    ws.on('close', function() {
        if (ws.name) {
            group[ws.roomid]--;
        }
        let msgObj = {};
        // 广播消息
        wss.clients.forEach((client) => {
            // 判断非自己的客户端
            if (client.readyState === WebSocket.OPEN && client.roomid === ws.roomid) {
                msgObj.name = ws.name;
                msgObj.num = group[ws.roomid];
                msgObj.event = 'out';
                client.send(JSON.stringify(msgObj));
            }
        })

    })
})

server.on('upgrade', function upgrade(request, socket, head) {
    // This function is not defined on purpose. Implement it with your own logic.
    // authenticate(request, (err, client) => {
    //   if (err || !client) {
    //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    //     socket.destroy();
    //     return;
    //   }
    console.log('TCL: upgrade -> request', request.headers);
    
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    // });
  });
   
  server.listen(3000);

  setInterval(() => {
      wss.clients.forEach(ws => {
          if (!ws.isAlive && ws.roomid) {
            console.log('in');
            group[ws.roomid]--;
            delete ws['roomid'];
            return ws.terminate(); // 终止或关闭连接
          }
        //   主动发送心跳检测请求
        // 当客户端返回了消息之后，主动设置了flag为在线
        ws.isAlive = false; // 周期一开始为false
        ws.send(JSON.stringify({
            event: 'heartbeat',
            message: 'ping',
            num: group[ws.roomid]
        }))
      })
  }, timeInterval)