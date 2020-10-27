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


    get localAvStream() {
        return this._localAvStream;
    }

    setLocalAvStream(stream) {
        this._localAvStream = stream;
    }

    getOnlinePeer(peerName) {
        return this._onlinePeer[peerName];
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

    delRemoteScreenPC(account){
        this._remoteScreenPC.delete(account);
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