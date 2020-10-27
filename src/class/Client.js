'use strict';

/**
 * 客户端
 * 主要负责保存客户端基本信息与提供相关方法
 * 同时也保存和对端相关的数据。
 */
class Client {
    constructor(account, roomId, url) {
        this._account = account;
        this._roomId = roomId;
        this._socketUrl = url

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

    /**
     * 添加正在分享的客户端
     * @param account 要添加的正在分享的客户端
     * @api 在收到 {@link onScreenShared} 消息时候，或者本端发起分享的时候调用
     */
    addScreenSharingPeer(account) {
        this._screenSharingPeer.push(account);
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
     * @api 在收到 {@link onCloseShare} 消息时要移除对端，在收到 {@link onDisConnect} 消息时候，
     *      通过 {@link existScreenSharingPeer} 判断是否需要删除
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
        this._remoteScreenPC[remoteScreenName] = peer
    }

    delRemoteScreenPC(account) {
        delete this._remoteScreenPC[account]
    }

    addRemoteAvPC(peerName, pc) {
        this._remoteAvPC[peerName] = pc
    }

    get localScreenStream() {
        return this._localScreenStream;
    }

    get remoteScreen() {
        return this._remoteScreenPC;
    }

    get remoteAvPC() {
        return this._remoteAvPC;
    }

    get account() {
        return this._account;
    }

    get roomId() {
        return this._roomId;
    }

    toString() {
        console.log("account:", this._account, "roomId:", this._roomId, "token:", "socketUrl:", this._socketUrl)
    }
}

export {Client}