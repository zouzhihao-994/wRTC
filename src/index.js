'use strict';

import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {createOffer, createPCAndAddTrack} from "./class/RtcPeer";

const SCREEN_SHARE = "screen_share"
const AV_SHARE = "av_share"


const screenSuffix = '@ScreenShare';
const iceServer = {
    "iceServers": [{
        'url': 'turn:119.23.33.178:3478',
        'username': 'leung',
        'credential': '362203'
    }]
}

// 绑定元素
let joinButton = document.getElementById("joinBtn")
let avButton = document.getElementById("avBtn")
let shareButton = document.getElementById("shareBtn");
let accountInputValue = document.getElementById('account');
let roomInputValue = document.getElementById('room');
let div = document.querySelector('div#videoDiv');
let screenDiv = document.querySelector('div#screenDiv');
let localVideo = document.querySelector('video#video1')

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
shareButton.addEventListener('click', screenShareHandler)
avButton.addEventListener('click', avShareHandler);

/**
 * join事件
 * join会触发系统初始化，初始化主要初始化两个组件，client和socket。
 * client {@class Client}
 * socket {@class Socket}
 */
function joinHandler() {
    joinButton.display = true
    shareButton.display = false
    avButton.display = false

    // 创建客户端
    client = new Client(accountInputValue.value, roomInputValue.value, socketUrl)
    client.toString()

    // 创建Socket
    socket = new Socket(socketUrl, client)
    socket.init()

    // 发送join消息
    socket.emitJoin();
}

/**
 * 音视频分享
 */
function avShareHandler() {
    if (client.localAvStream) {
        console.log("本地已经存在音视频流，无法再创建")
        return;
    }

    navigator.mediaDevices.getUserMedia({audio: false, video: true}).then(stream => {
        gotAvStream(stream)
        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }
            createPCAndAddTrack(peerName, stream, AV_SHARE)
        }
        // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
        socket.emitAvShare()
    }).catch(e => {
        console.error('av share getDisplayMedia addTrack error', e);
    })
}

/**
 * 进行桌面共享
 */
function screenShareHandler() {
    if (client.localScreenStream) {
        console.log("检测到本地存在screen流,无法再创建")
        return;
    }

    // 新建screen流
    // 获取桌面,同时设置本地stream和video为stream
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        // 设置流
        gotScreenStream(stream)

        // 设置pc
        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }
            createPCAndAddTrack(peerName, stream, SCREEN_SHARE)
        }

        // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
        socket.emitScreenShare()
    }).catch(e => console.log('getUserMedia() error: ', e));

}

function gotScreenStream(stream) {
    client.setLocalScreenStream(stream)
    if (client.localAvStream !== null) {
        createVideoOutputStream({peerName: client.account, stream: stream})
        return
    }
    localVideo.srcObject = stream
}

function gotAvStream(stream) {
    client.setLocalAvStream(stream)
    //如果已经存在屏幕流，则先创建一个音视频流
    if (client.localScreenStream !== null) {
        createVideoOutputStream({peerName: client.account, stream: stream})
        return
    }
    localVideo.srcObject = stream
}

/**
 * 创建一个video
 * @param peer map类型,包含两个字段 peerName,stream
 */
function createVideoOutputStream(peer) {
    let video = document.createElement("video")
    screenDiv.appendChild(video)

    video.setAttribute("id", peer.peerName);
    video.setAttribute("width", "400");
    video.setAttribute("height", "300");
    video.setAttribute("autoplay", "");
    video.setAttribute("controls", "");
    video.srcObject = peer.stream

}

export {
    client,
    socket,
    div,
    screenSuffix,
    iceServer,
    screenDiv,
    SCREEN_SHARE,
    AV_SHARE,
    createVideoOutputStream
}

