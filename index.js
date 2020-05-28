/*
 * @Author: your name
 * @Date: 2020-05-27 13:56:55
 * @LastEditTime: 2020-05-28 17:07:12
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \demo\server\index.js
 */
const WebSocket = require('ws');
const http = require('http');
const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer();
const jwt = require('jsonwebtoken');

// 房间分组

let group = {};

// 多聊天室的功能
// roomid => 对应相同的roomid进行广播消息

wss.on('connection', function connection (ws) {
    console.log('one client is connected');
    // 接收客户端的消息
    ws.on('message', function(msg) {
        const msgObj = JSON.parse(msg);
        if (msgObj.event === 'enter') {
            ws.name = msgObj.message;
            ws.roomid = msgObj.roomid
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
                    return;
                } else {
                    // 鉴权通过
                    console.log(decode);
                    ws.isAuth = true;
                    return;
                }
            })
        }
        // 拦截非鉴权的请求
        if (!ws.isAuth) {
            ws.send(JSON.stringify({
                event: 'noauth',
                message: 'please auth again'
            }))
            return;
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