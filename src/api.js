'use strict'
import {client, rtcService, socket, roomService, init} from "./index"

class RtcApi {

    constructor() {
    }


    /**
     * 初始化客户端
     * @param option 初始化参数
     */
    init(option) {
        init(option)
    }

    /**
     * 客户端加入房间
     * @param roomId 加入房间
     */
    joinRoom(roomId) {
        console.log(">>> ", new Date().toLocaleTimeString(), " [info]: join room ", roomId)
        roomService.join(roomId)
    }

    /**
     * 获取桌面流
     * @returns {Promise<>} resolve:桌面的流.reject:错误信息
     */
    getScreenStream() {
        return new Promise((resolve, reject) => {
            rtcService.getScreenStream().then(
                stream => {
                    return resolve(stream)
                }
            ).catch(
                error => {
                    return reject(error)
                }
            )
        })
    }


    /**
     * 离开房间
     */
    leaveRoom(account, roomId) {

    }

    /**
     * 播放视频
     * @param video dom组件
     * @param stream 要播放的流
     */
    play(video, stream) {
        video.scrObject = stream
    }

    /**
     * 发布屏幕流到房间
     */
    shareScreen() {
        shareService
    }

    shareVideo() {

    }

    shareAudio() {

    }


    unPublish() {

    }

    /**
     * 是否订阅远端音频流
     */
    configRemoteAudio() {

    }

    /**
     * 是否订阅远端相机流
     */
    configRemoteCameraTrack() {

    }

    /**
     * 是否订阅远端屏幕流
     */
    configRemoteScreenTrack() {

    }

    /**
     * 订阅远端流
     */
    subscribe() {

    }

    /**
     * 取消订阅远端流
     */
    unSubscribe() {

    }

    /**
     * 预览本地摄像头
     */
    startPreview() {

    }

    /**
     * 结束预览本地摄像头
     */
    stopPreview() {

    }

    onJoined() {

    }
}

export {RtcApi}










