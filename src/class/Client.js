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

        // 当前房间的在线客户端信息 {K:peerName,V:peer}
        this._onlinePeer = {}

        // ---------------remote av--------------------
        // 本地音视频流
        this._localStream = null
        // 用于存储视频流的对端,K:peerName. V:peer pc
        this._remoteAvPC = {}
        this._remoteAvStream = {}

        // ---------------remote screen--------------------
        // 存储本地屏幕流
        this._localScreenStream = null
        // 用于存储屏幕共享的对端，K:peerName,V:peer pc
        this._remoteScreenPC = {}
        // 用于存储对端的stream, K:peerName. V:peer stream
        this._remoteScreenStream = {}
    }


    get localStream() {
        return this._localStream;
    }

    setLocalStream(stream) {
        this._localStream = stream;
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

    addRemoteScreen(remoteScreenName, peer) {
        this._remoteScreenPC[remoteScreenName] = peer
    }

    existRemoteScreen(remoteScreenName) {
        return this._remoteScreenPC[remoteScreenName]
    }

    addPeerStream(account, stream) {
        this._remoteScreenStream[account] = stream;
    }

    existPeer(peerName) {
        return this._remoteAvPC[peerName]
    }

    addPeer(peerName, pc) {
        this._remoteAvPC[peerName] = pc
    }

    get localScreenStream() {
        return this._localScreenStream;
    }

    get remoteScreen() {
        return this._remoteScreenPC;
    }

    get peer() {
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