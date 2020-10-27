const SCREEN_SHARE = "screen_share"
const AV_SHARE = "av_share"

const iceServer = {
    "iceServers": [{
        'urls': 'turn:119.23.33.178:3478',
        'username': 'leung',
        'credential': '362203'
    }]
}

// 本地环境
const local_env = "ws://127.0.0.1:9944"
// 测试环境
const test_env = "https://tools-socket.test.maxhub.vip"
// 在这里切换url环境
const socketUrl = local_env

export {SCREEN_SHARE, AV_SHARE, iceServer, local_env, test_env, socketUrl}