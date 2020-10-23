'use strict';

/**
 * 客户端对象，负责保存客户端基本信息与提供相关方法
 */
class Client {
    constructor(account, roomId, token, url) {
        this._account = account;
        this._roomId = roomId;
        this._token = token
        this._socketUrl = url

        // 本client是否参与到room中
        this._isJoin = false
        // 参与该room的所有其他客户端id
        this._roomParticipantsId = []

        // 连接对象,K:peerName. V:peer pc
        this._peer = {}

        // 连接对象的流, K:peerName. V:stream
        this._peerStream = {}
        // 远端client的屏幕，K:peerName,V:peer pc
        this._remoteScreenPC = {}
        this._removeScreenStream = null
        this._remoteScreenStream = null

        // 该房间的在线客户端id
        this._onlineClient = []
        this._localScreenStream = null
    }


    get localScreenStream() {
        return this._localScreenStream;
    }

    setLocalScreenStream(stream) {
        this._localScreenStream = stream;
    }

    setOnlineClient(list) {
        this._onlineClient = list;
    }

    addRemoteScreenPC(remoteScreenName, peer) {
        this._remoteScreenPC[remoteScreenName] = peer
    }

    // 判断是否存在远端
    existRemoteScreenPC(remoteScreenName) {
        return this._remoteScreenPC[remoteScreenName]
    }

    addPeerStream(account, stream) {
        this._peerStream[account] = stream;
    }

    // 判断是否存在peerName
    existPeer(peerName) {
        return this._peer[peerName]
    }

    setIsJoin(value) {
        this._isJoin = value
    }

    addPeer(peerName, peer) {
        this._peer[peerName] = peer
    }

    get remoteScreen() {
        return this._remoteScreenPC;
    }

    get remoteScreenStream() {
        return this._remoteScreenStream();
    }

    get onRemoveScreenStream() {
        return this._removeScreenStream;
    }

    get peer() {
        return this._peer;
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