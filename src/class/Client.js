'use strict';

import {client} from "../index";

/**
 * 客户端
 * 主要负责保存客户端基本信息与提供相关方法
 * 同时也保存和对端相关的数据。
 */
class Client {

    /**
     * @param account 客户端account
     * @param token 鉴权使用,暂时没有使用
     * @param url socket.io服务器 url
     */
    constructor(account, token, url) {
        this._account = account
        this._roomId = null
        this._socketUrl = url
        this._token = token

        // 是否接收远端屏幕流
        this._isSubscribeScreen = true

        // 当前房间的在线客户端信息 {K:account,V:clientInfo}
        this._onlinePeer = {}
        // 当前正在进行屏幕分享的客户端的account
        this._screenSharingPeer = []
        // 当前正在进行音视频分享的客户端的account
        this._avSharingPeer = []

        // ---------------remote av--------------------
        // 本地音视频流
        this._localAvStream = null
        // 用于存储视频流的对端,K:account. V:peer pc
        this._remoteAvPC = {}

        // ---------------remote screen--------------------
        // 存储本地屏幕流
        this._localScreenStream = null
        // 用于存储屏幕共享的对端，K:account,V:对端的pc
        this._remoteScreenPC = {}
    }


    get screenSharingPeer() {
        return this._screenSharingPeer;
    }

    get isSubscribeScreen() {
        return this._isSubscribeScreen;
    }

    setIsSubscribeScreen(bool) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 不再接收远端流 ")
        this._isSubscribeScreen = bool;
    }

    get token() {
        return this._token;
    }

    setToken(value) {
        this._token = value;
    }

    /**
     * 添加正在分享的客户端
     * @param account 要添加的正在分享的客户端
     * @api 在收到 {@link onScreenShared} 消息时候，或者本端发起分享的时候调用
     */
    addScreenSharingPeer(account) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 添加正在分享的客户端 ", account)
        this._screenSharingPeer.push(account);
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 当前正在分享的客户端 ", this.screenSharingPeer)
    }

    /**
     * 更新正在屏幕共享人列表
     * @param participants 当前房间所有在线客户端
     * @param newcomer 客户端信息
     */
    updateOnlinePeerList(participants, newcomer) {
        // 针对第一次加入房间的客户端,保存房间所有人。全量保存
        if (Object.keys(client.onlinePeer).length === 0) {
            for (let idx in participants) {
                client.addOnlinePeer(participants[idx].account, participants[idx])
                console.log(">>> ", new Date().toLocaleTimeString(), " [info] 新客户端加入 ", client.getOnlinePeer(participants[idx].account))
            }
        } else { // 增量保存
            this.addOnlinePeer(newcomer.account, newcomer)
            console.log(">>> ", new Date().toLocaleTimeString(), " [info] 新客户端加入 ", client.getOnlinePeer(newcomer.account))
        }
    }

    /**
     * 判断account是否是正在分享的客户端
     * @param account 要判断的客户端account
     * @return boolean true:是，false:不是
     */
    existScreenSharingPeer(account) {
        return this._screenSharingPeer.includes(account)
    }

    /**
     * 移除正在分享的客户端
     * @param account 要删除的account
     * @api 在收到 {@link onCloseShare} 消息时要移除对端，
     *      在收到 {@link onDisConnect} 消息时候，通过 {@link existScreenSharingPeer} 判断是否需要删除
     */
    delScreenSharingPeer(account) {
        let idx = this._screenSharingPeer.indexOf(account)
        this._screenSharingPeer.splice(idx, 1);
    }

    get localAvStream() {
        return this._localAvStream;
    }

    setLocalAvStream(stream) {
        this._localAvStream = stream;
    }

    getOnlinePeer(peerName) {
        return this._onlinePeer[peerName];
    }

    delOnlinePeer(peerName) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] remove online peer ", peerName)
        delete this._onlinePeer[peerName];
    }

    get onlinePeer() {
        return this._onlinePeer;
    }

    addOnlinePeer(peerName, peer) {
        this._onlinePeer[peerName] = peer;
    }

    setLocalScreenStream(stream) {
        this._localScreenStream = stream;
    }

    addRemoteScreenPC(remoteScreenName, peer) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 保存 Screen PC , account: ", remoteScreenName)
        this._remoteScreenPC[remoteScreenName] = peer
    }

    delRemoteScreenPC(account) {
        delete this._remoteScreenPC[account]
    }

    addRemoteAvPC(peerName, pc) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info] 保存 AV PC , account: ", peerName)
        this._remoteAvPC[peerName] = pc
    }

    get localScreenStream() {
        return this._localScreenStream;
    }

    remoteScreenPC(account) {
        return this._remoteScreenPC[account];
    }

    remoteAvPC(account) {
        return this._remoteAvPC[account];
    }

    get account() {
        return this._account;
    }

    get roomId() {
        return this._roomId;
    }

    setRoomId(id) {
        this._roomId = id
    }

    toString() {
        console.log("account:", this._account, "roomId:", this._roomId, "token:", "socketUrl:", this._socketUrl)
    }

    /**
     * 清除client的部分数据
     * @note 方法定义是清理与上个房间相关的数据
     */
    clean() {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info]: clean client")
        this._roomId = null;
        this._onlinePeer = {}
        this._screenSharingPeer = []
        this._avSharingPeer = []
        this._localAvStream = null
        this._remoteAvPC = {}
        this._localScreenStream = null
        this._remoteScreenPC = {}
    }
}

export {Client}