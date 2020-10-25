'use strict';

import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {createOffer, createPCAndAddTracker} from "./class/RtcPeer";

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
shareButton.addEventListener('click', shareHandler)
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
    if (client.localStream) {
        console.log("本地已经存在音视频流，无法再创建")
        return;
    }

    navigator.mediaDevices.getUserMedia({audio: false, video: true}).then(stream => {
        gotAvStream(stream)
        // 设置pc
        for (let peerName in client.onlinePeer) {
            if (peerName === client.account) {
                continue
            }

            // 和对端peer创建连接然后输出stream
            createPCAndAddTracker(peerName, stream, AV_SHARE)
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
function shareHandler() {
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
            // 创建pc
            let pc = new RTCPeerConnection(iceServer)
            // 设置track监听
            pc.ontrack = (event) => {
                if (event.streams) {
                    socket.onScreenTrack(peerName, event.streams[0])
                }
            }
            // 设置ice监听
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emitIceCandidate(event.candidate, client.roomId, peerName, SCREEN_SHARE)
                }
            }
            // 设置negotiation监听
            pc.onnegotiationneeded = () => {
                createOffer(peerName, pc, client, socket, SCREEN_SHARE)
            }
            // 保存{peerName:pc}
            client.addRemoteScreen(peerName, pc)
            // 输出track
            try {
                client.localScreenStream.getTracks().forEach(track => {
                    // 设置监听onended事件
                    track.onended = socket.onEnded
                    // 添加远端
                    pc.addTrack(track, client.localScreenStream)
                })
            } catch (e) {
                console.error('share getDisplayMedia addTrack error', e);
            }
        }

        // 发送屏幕共享事件到信令服务器，信令服务器会发送screenShared事件给account = peerName的客户端
        socket.emitScreenShare()
    }).catch(e => console.log('getUserMedia() error: ', e));

}

function gotScreenStream(stream) {
    client.setLocalScreenStream(stream)
    if (client.localStream !== null) {
        createVideoOutputStream({peerName: client.account, stream: stream})
        return
    }
    localVideo.srcObject = stream
}

function gotAvStream(stream) {
    client.setLocalStream(stream)
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

/**
 * 获取对端peer的account
 * @param str 完整的名称，例如"11-22",11为本端的account，22为对端的名称
 * @param account 本端的名称
 * @returns {*|string}
 */
function getRawPeerName(str, account) {
    let names = str.split('-');
    return names[0] === account ? names[1] : names[0];
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
    getRawPeerName,
    createVideoOutputStream
}

