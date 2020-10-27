'use strict';

import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {RTCService} from "./class/RTCService";
import {SCREEN_SHARE, AV_SHARE, socketUrl} from "./const"

// 绑定元素
let joinButton = document.getElementById("joinBtn")
let avButton = document.getElementById("avBtn")
let shareButton = document.getElementById("shareBtn");
let exitButton = document.getElementById("leaveBtn")
let accountInput = document.getElementById('account');
let roomInput = document.getElementById('room');
let remoteScreenDiv = document.querySelector('div#screenDiv');
let localVideoDiv = document.querySelector('div#videoDiv')

// 客户端信息
let client;
let socket;
let rtcService;

// 绑定事件
joinButton.addEventListener('click', joinHandler)
shareButton.addEventListener('click', screenShareHandler)
avButton.addEventListener('click', avShareHandler);
exitButton.addEventListener('click', leaveRoomHandle);

/**
 * join事件
 * join会触发系统初始化，初始化主要初始化两个组件，client和socket。
 * client {@class Client}
 * socket {@class Socket}
 */
function joinHandler() {
    // 创建客户端
    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: client ...")
    client = new Client(accountInput.value, roomInput.value, socketUrl)
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
        client.addScreenSharingPeer(client.account)

        // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
        socket.emitScreenShare()

        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }
            // 创建对端pc，设置回调函数，添加track
            rtcService.createPCAndAddTrack(peerName, stream, SCREEN_SHARE)
        }

    }).catch(e => console.log('getDisplayMedia() error: ', e));
}

/**
 * 用户退出房间
 */
function leaveRoomHandle() {
    // 发送leave
    socket.emitLeaveRoom()
    client.clean()
    socket.clean()
}

/**
 * 添加本端的video
 * 该方法创建的video输出本端的stream
 * @param mediaType 要创建的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
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
 * 该方法创建的video输出其他端的stream
 * @note video的id为 {account}_{mediaType},例如 "靓仔_screen_share"
 * @param account 对端的account
 * @param stream 对端的stream
 * @param mediaType 要创建的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
 */
function createRemoteVideo(account, stream, mediaType) {
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
 * 移除video组件
 * @param elemId 要关闭的video元素的id
 * @see createRemoteVideo
 * @see createLocalVideo
 */
function removeVideoElement(elemId) {
    let elem = document.getElementById(elemId);
    elem && elem.remove();
}

export {
    client,
    socket,
    rtcService,
    remoteScreenDiv,
    createRemoteVideo,
    removeVideoElement
}

