'use strict';
import io from 'socket.io-client';


import {Client} from "./class/Client";
import {Socket} from "./class/Socket";

const screenSuffix = '@ScreenShare';
const iceServer = {
    "iceServers": [{
        'url': 'turn:119.23.33.178:3478',
        'username': 'leung',
        'credential': '362203'
    }]
}

window.onload = init

let localStream;
let localScreen;

// 绑定元素
let joinButton = document.getElementById("joinBtn")
let shareButton = document.getElementById("shareBtn");
let accountInputValue = document.getElementById('account');
let roomInputValue = document.getElementById('room');

// 绑定事件
joinButton.addEventListener('click', joinHandler);
shareButton.addEventListener('click', shareHandler);

// 客户端信息
let client;
let socket;

// 本地环境
let local_env = "ws://127.0.0.1:9944"
// 测试环境
let test_env = "https://tools-socket.test.maxhub.vip"
// 在这里切换url环境
let socketUrl = local_env

function init() {
    console.log("app init")
}

function joinHandler() {
    // 创建客户端
    client = new Client(accountInputValue.value, roomInputValue.value, 'v', socketUrl)
    client.toString()

    // 创建Socket
    socket = new Socket(socketUrl, client)
    socket.init()

    // 发送join消息
    socket.emitJoin();
}

function shareHandler() {

}

function publishHandler() {

}

function closeVideoHandler() {

}

function closeStreamHandler() {

}

export {screenSuffix, iceServer, localStream, localScreen}

