/*
 * @Author: your name
 * @Date: 2020-05-28 16:39:31
 * @LastEditTime: 2020-05-28 16:43:46
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \WebSocketDemo\server\client.js
 */
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3000', {
    headers: {
        token: '123'
    }
})
