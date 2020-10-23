'use strict';

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
let div = document.querySelector('div#videoDiv');


// 客户端信息
let client;
let socket;

// 本地环境
let local_env = "ws://127.0.0.1:9944"
// 测试环境
let test_env = "https://tools-socket.test.maxhub.vip"
// 在这里切换url环境
let socketUrl = local_env

// 绑定事件
joinButton.addEventListener('click', joinHandler)
shareButton.addEventListener('click', shareHandler)

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
    console.log("点击分享按钮")
    // 如果存在本地视频流
    if (localStream) {
        console.log("检测到本地存在视频流")
    } else {
        console.log("选择需要共享的界面")
        return navigator.mediaDevices.getDisplayMedia().then(stream => {
            localStream = stream;
            client.setLocalScreenStream(stream)
            // 将视频流发送到所有远端屏幕上
            for (let peerName in client.remoteScreen) {
                try {
                    client.localScreenStream.getTracks().forEach(track => {
                        // 当用户手工点击停止录制时触发
                        track.onended = event => {
                            console.log("onended")
                            localScreen = null
                            client.setLocalScreenStream(null)
                            client.onRemoveScreenStream && client.onRemoveScreenStream({
                                account: getRawPeerName(" ", client.account)
                            })
                            let state = {account: client.account, type: 'screenMute', value: false}
                            socket.emitUpdateState(state, client.account)
                        }
                        client.remoteScreen[peerName].addTrack(track, client.localScreenStream)
                    })
                } catch (e) {
                    console.error('share getDisplayMedia addTrack error', e);
                }
            }
            return Promise.resolve(stream)
        })
    }
}

function publishHandler() {

}

function closeVideoHandler() {

}

function closeStreamHandler() {

}

function getRawPeerName(str, account) {
    let names = str.split('-');
    return names[0] === account ? names[1] : names[0];
}

export {div,screenSuffix, iceServer, localStream, localScreen, getRawPeerName}

