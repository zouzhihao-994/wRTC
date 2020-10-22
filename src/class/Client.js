'use strict';
import io from 'socket.io-client';

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

        // 连接对象,K:peerName. V:peer
        this._peer = {}

        // 连接对象的流, K:peerName. V:stream
        this._peerStream = {}
        this._remoteScreen = {}
        this._onRemoveScreenStream = null
        this._onRemoteScreenStream = null

        // 该房间的在线客户端id
        this._onlineClient = []
    }

    setOnlineClient(list) {
        this._onlineClient = list;
    }

    addRemoteScreen(remoteScreenName, peer) {
        this._remoteScreen[remoteScreenName] = peer
    }

    setOnRemoteScreenStream(account, stream) {
        this._onRemoteScreenStream = {
            account: account,
            stream: stream
        }
    }


    setOnRemoveScreenStream(value) {
        this._onRemoveScreenStream = value;
    }

    // 判断是否存在远端
    existRemoteScreenList(remoteScreenName) {
        return this._remoteScreenList[remoteScreenName] !== null
    }

    addPeerStream(account, stream) {
        this._peerStream[account] = stream;
    }

    // 判断是否存在peerName
    existPeer(peerName) {
        return this._peer[peerName] !== null
    }

    addRoomParticipantsId(value) {
        this._participants = value;
    }

    setIsJoin(value) {
        this._isJoin = value
    }

    addPeer(peerName, peer) {
        this._peer[peerName] = peer;
    }

    get onlineClientList() {
        return this._onlineClient;
    }

    get remoteScreen() {
        return this._remoteScreen;
    }

    get roomParticipantsId() {
        return this._participants;
    }

    get peerStream() {
        return this._peerStream;
    }

    get onRemoteScreenStream() {
        return this._onRemoteScreenStream;
    }

    get onRemoveScreenStream() {
        return this._onRemoveScreenStream;
    }

    get peerNameList() {
        return this._peerNameList;
    }

    get isJoin() {
        return this._isJoin
    }

    get account() {
        return this._account;
    }

    get roomId() {
        return this._roomId;
    }

    get token() {
        return this._token;
    }

    get socketUrl() {
        return this._socketUrl;
    }

    toString() {
        console.log("account:", this._account, "roomId:", this._roomId, "token:", "socketUrl:", this._socketUrl)
    }
}

export {Client}