'use strict';

import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {RTCService} from "./class/RTCService";

const SCREEN_SHARE = "screen_share"
const AV_SHARE = "av_share"


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
let closeAvButton = document.getElementById("closeAvBtn")
let closeScreenButton = document.getElementById("closeScreenBtn")
let accountInputValue = document.getElementById('account');
let roomInputValue = document.getElementById('room');
let remoteScreenDiv = document.querySelector('div#screenDiv');
let localVideoDiv = document.querySelector('div#videoDiv')

// 客户端信息
let client;
let socket;
let rtcService;

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
closeScreenButton.addEventListener('click', () => {
    closeShareHandle(SCREEN_SHARE)
});
closeAvButton.addEventListener('click', () => {
    closeShareHandle(AV_SHARE)
});

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
    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: client ...")
    client = new Client(accountInputValue.value, roomInputValue.value, socketUrl)
    client.toString()

    // 创建Socket
    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: socket ...")
    socket = new Socket(socketUrl)
    socket.init()

    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: rtcService ...")
    rtcService = new RTCService()

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
        client.setLocalAvStream(stream)
        createLocalVideo(AV_SHARE)
        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }
            // 创建对端pc，设置回调函数，添加track
            rtcService.createPCAndAddTrack(peerName, stream, AV_SHARE)
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
        client.setLocalScreenStream(stream)
        createLocalVideo(SCREEN_SHARE)

        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }
            // 创建对端pc，设置回调函数，添加track
            rtcService.createPCAndAddTrack(peerName, stream, SCREEN_SHARE)
        }

        // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
        socket.emitScreenShare()
    }).catch(e => console.log('getUserMedia() error: ', e));
}

/**
 * 本端关闭分享
 * @param mediaType 要关闭分享的类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
 */
function closeShareHandle(mediaType) {

    // 初始化screen stream
    if (mediaType === AV_SHARE) {
        this.localAvStream.stop()
        client.setLocalAvStream(null)
    } else {
        client.setLocalScreenStream(null)
    }

    // 发送closeScreenShare消息给所有收听者
    socket.emitCloseShare(mediaType)

    // 删除local video
    removeVideoElement(mediaType)
}


/**
 * 添加本端的video
 */
function createLocalVideo(mediaType) {
    console.log(">>> ", new Date().toLocaleTimeString(), " [创建]: 本地video，输出:", mediaType)
    let video = document.createElement("video")
    localVideoDiv.appendChild(video)

    video.setAttribute("id", mediaType);
    video.setAttribute("width", "400");
    video.setAttribute("height", "300");
    video.setAttribute("autoplay", "");
    video.setAttribute("controls", "");

    if (mediaType === AV_SHARE) {
        video.srcObject = client.localAvStream
    } else {
        video.srcObject = client.localScreenStream
    }
}

/**
 * 创建一个video并输出
 * @note video的id为 {account}_{mediaType},例如 "靓仔_screen_share"
 * @param account 对端的account
 * @param stream 对端的stream
 * @param mediaType 要创建的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
 */
function createVideoOutputStream(account, stream, mediaType) {
    let video = document.createElement("video")
    remoteScreenDiv.appendChild(video)

    video.setAttribute("id", account + "_" + mediaType);
    video.setAttribute("width", "400");
    video.setAttribute("height", "300");
    video.setAttribute("autoplay", "");
    video.setAttribute("controls", "");
    video.srcObject = stream
}

/**
 * 获取video组件
 * @param elemId 要关闭的video元素的id
 * @see createVideoOutputStream
 */
function removeVideoElement(elemId) {
    let elem = document.getElementById(elemId);
    elem.remove();
}

export {
    client,
    socket,
    rtcService,
    iceServer,
    remoteScreenDiv,
    SCREEN_SHARE,
    AV_SHARE,
    createVideoOutputStream,
    removeVideoElement
}

