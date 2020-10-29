'use strict';

import {SCREEN_SHARE, AV_SHARE, socketUrl, iceServer} from "./const"
import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {RTCService} from "./service/RTCService";
import {RoomService} from "./service/RoomService";
import {ShareService} from "./service/ShareService";
import {ClientService} from "./service/ClientService";
import {callback} from "./callback"
import {RtcApi} from "./api";

let client;
let socket;
let rtcService;
let roomService;
let shareService;
let clientService;

let api = new RtcApi()

// 绑定元素
let initButton = document.getElementById("initBtn")
let joinButton = document.getElementById("joinBtn")
let getScreenButton = document.getElementById('getScreenBtn');
let avButton = document.getElementById("avBtn")
let shareButton = document.getElementById("shareBtn");
let exitButton = document.getElementById("leaveBtn")
let accountInput = document.getElementById('account');
let roomInput = document.getElementById('room');
let unSubscribeScreen = document.getElementById('unSubscribeScreenBtn');
let remoteScreenDiv = document.querySelector('div#screenDiv');
let localVideoDiv = document.querySelector('div#videoDiv')


let tmpStream
// 绑定事件
initButton.addEventListener('click', () => api.init({account: accountInput.value, token: null, socketUrl: socketUrl}));
joinButton.addEventListener('click', () => api.joinRoom(roomInput.value))
getScreenButton.addEventListener('click', () => api.getScreenStream().then(stream => {
    tmpStream = stream
    console.log(">>> ", new Date().toLocaleTimeString(), " [info]: get screen stream success ", stream)
}).catch(err => {
    console.log(">>> ", new Date().toLocaleTimeString(), " [info]: get screen stream fail ", err)
}))
shareButton.addEventListener('click', () => api.publishScreen(tmpStream).then(() => {
        createLocalVideo(SCREEN_SHARE)
    }).catch(err => {
        console.log(">>> ", new Date().toLocaleTimeString(), " [error]: get screen stream fail ", err)
    })
);
unSubscribeScreen.addEventListener('click', () => {
    api.unSubscribeScreen().then(() => {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info][event] 停止订阅远端流成功")
    }).catch(() => {
        console.log(">>> ", new Date().toLocaleTimeString(), " [warn][event] 停止订阅远端流失败")
    })
});

callback.onScreenStream = function (account, stream) {
    createRemoteVideo(account, stream, SCREEN_SHARE)
}
callback.onUnPublisherScreen = function (account) {
    removeVideoElement(account + "_" + SCREEN_SHARE)
}

/**
 * rtc sdk 的初始化方法
 * @param option
 */
function init(option) {

    // 创建客户端 client
    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: client ...")
    client = new Client(option.account, option.token, option.socketUrl)

    // 创建Socket
    console.log(">>> ", new Date().toLocaleTimeString(), " [初始化]: socket ...")
    socket = new Socket(socketUrl)
    socket.init()

    // 初始化类
    rtcService = new RTCService()
    roomService = new RoomService()
    shareService = new ShareService()
    clientService = new ClientService()
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
 * 自动添加video组件,然后输出stream
 * 该方法创建的video输出本端的stream
 * @param mediaType 要创建的视频类型 {@link SCREEN_SHARE} or {@link AV_SHARE}
 * @note 自测时使用
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
 * @see 远端video命名规则参考 createRemoteVideo
 * @see 本端video命名规则参考 createLocalVideo
 */
function removeVideoElement(elemId) {
    let elem = document.getElementById(elemId);
    elem && elem.remove();
}

export {
    client,
    socket,
    rtcService,
    callback,
    shareService,
    clientService,
    roomService,
    SCREEN_SHARE,
    AV_SHARE,
    socketUrl,
    iceServer,
    init,
    createRemoteVideo,
    removeVideoElement
}

