'use strict';

import {SCREEN_SHARE, AV_SHARE, socketUrl, iceServer} from "./const"
import {Client} from "./class/Client";
import {Socket} from "./class/Socket";
import {RTCService} from "./class/RTCService";
import {callback} from "./callback"
import {test} from "./test";

let client;
let socket;
let rtcService;

test()

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
}

export {client, socket, rtcService, callback, SCREEN_SHARE, AV_SHARE, socketUrl, iceServer, init,}

