'use strict'

import {client,SCREEN_SHARE,AV_SHARE,socketUrl,callback} from "./index";
import {RtcApi} from "./RtcApi";

let api = new RtcApi()
let tmpStream

function test(){
    // 绑定元素
    let initButton = document.getElementById("initBtn")
    let joinButton = document.getElementById("joinBtn")
    let getScreenButton = document.getElementById('getScreenBtn');
    let avButton = document.getElementById("avBtn")
    let shareButton = document.getElementById("shareBtn");
    let leaveButton = document.getElementById("leaveBtn")
    let accountInput = document.getElementById('account');
    let roomInput = document.getElementById('room');
    let unSubscribeScreen = document.getElementById('unSubscribeScreenBtn');
    let remoteScreenDiv = document.querySelector('div#screenDiv');
    let localVideoDiv = document.querySelector('div#videoDiv')

// 按钮事件
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
    leaveButton.addEventListener('click', api.leaveRoom);

    // 测试使用的回调函数
    callback.onLeave = function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 移除 video ，id = ", account + "_" + SCREEN_SHARE)
        removeVideoElement(account + "_" + SCREEN_SHARE)
    }
    callback.onScreenStream = function (account, stream) {
        createRemoteVideo(account, stream, SCREEN_SHARE)
    }
    callback.onUnScreenShared = function (account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 移除 video ，id = ", account + "_" + SCREEN_SHARE)
        removeVideoElement(account + "_" + SCREEN_SHARE)
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
}

export {test}