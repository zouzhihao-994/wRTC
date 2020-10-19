'use strict';

// 设置id
const startVideoButtonID = "startVideoBtn"
const callVideoButtonID = "callVideoBtn"
const hangupVideoButtonID = "hangupVideoBtn"

// 设置按钮
let startVideoBtn = document.getElementById(startVideoButtonID)
let callVideoBtn = document.getElementById(callVideoButtonID)
let hangupVideoBtn = document.getElementById(hangupVideoButtonID)

// 设置显示样式
callVideoBtn.disabled = true
hangupVideoBtn.disabled = true

// 绑定事件
startVideoBtn.addEventListener('click', startHandler);
callVideoBtn.addEventListener('click', callHandler);
hangupVideoBtn.addEventListener('click', hangupHandle);

// 本地流和远端流
let localStream
let pc1
let pc2

// 本地视频和远端视频
let startTime;
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

localVideo.addEventListener('loadedmetadata', function () {
    console.log(`Remote video videoWidth: ${this.videoWidth}px , videoHeight:${this.videoHeight}px`);
})

remoteVideo.addEventListener('loadedmetadata', function () {
    console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
})

remoteVideo.addEventListener('resize', () => {
    console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
    if (startTime) {
        const elapsedTime = window.performance.now() - startTime;
        console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
        startTime = null;
    }
});

// 设置约束
const mediaStreamConstraints = {
    video: true,
    audio: true
}

// 仅交换视频
const offerOptions = {
    offerToReceiveVideo: 1,
    offerToReceiveAudio: 1
}

function getName(pc) {
    return pc === pc1 ? "pc1" : "pc2"
}

function getOtherPc(pc) {
    return pc === pc1 ? pc2 : pc1
}

// 开启本地视频
async function startHandler() {
    console.log("requesting local stream")
    startVideoBtn.disabled = true
    try {
        // 获取本地音视频流
        // 调用getUserMedia获取
        const stream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
        console.log("Received local stream")
        localVideo.srcObject = stream
        localStream = stream
        callVideoBtn.disabled = false
    } catch (e) {
        alert(`getUserMedia error: ${e.message}`)
    }
}

function getSelectedSdpSemantics() {
    const sdpSemanticsSelect = document.querySelector('#sdpSemantics');
    const option = sdpSemanticsSelect.options[sdpSemanticsSelect.selectedIndex];
    return option.value === '' ? {} : {sdpSemantics: option.value};
}

async function callHandler() {
    callVideoBtn.disabled = true;
    hangupVideoBtn.disabled = false;
    console.log('Starting call');
    startTime = window.performance.now();
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
    }
    if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`);
    }
    const configuration = getSelectedSdpSemantics();
    console.log('RTCPeerConnection configuration:', configuration);
    pc1 = new RTCPeerConnection(configuration);
    console.log('Created local peer connection object pc1');
    pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
    pc2 = new RTCPeerConnection(configuration);
    console.log('Created remote peer connection object pc2');
    pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
    pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
    pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
    pc2.addEventListener('track', gotRemoteStream);

    localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
    console.log('Added local stream to pc1');

    try {
        console.log('pc1 createOffer start');
        const offer = await pc1.createOffer(offerOptions);
        await onCreateOfferSuccess(offer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}

async function onCreateOfferSuccess(desc) {
    console.log(`Offer from pc1\n${desc.sdp}`);
    console.log('pc1 setLocalDescription start');
    try {
        await pc1.setLocalDescription(desc);
        onSetLocalSuccess(pc1);
    } catch (e) {
        onSetSessionDescriptionError();
    }

    console.log('pc2 setRemoteDescription start');
    try {
        await pc2.setRemoteDescription(desc);
        onSetRemoteSuccess(pc2);
    } catch (e) {
        onSetSessionDescriptionError();
    }

    console.log('pc2 createAnswer start');
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    try {
        const answer = await pc2.createAnswer();
        await onCreateAnswerSuccess(answer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
}

function onSetLocalSuccess(pc) {
    console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
    console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc2 received remote stream');
    }
}

async function onCreateAnswerSuccess(desc) {
    console.log(`Answer from pc2:\n${desc.sdp}`);
    console.log('pc2 setLocalDescription start');
    try {
        await pc2.setLocalDescription(desc);
        onSetLocalSuccess(pc2);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
    console.log('pc1 setRemoteDescription start');
    try {
        await pc1.setRemoteDescription(desc);
        onSetRemoteSuccess(pc1);
    } catch (e) {
        onSetSessionDescriptionError(e);
    }
}

async function onIceCandidate(pc, event) {
    try {
        await (getOtherPc(pc).addIceCandidate(event.candidate));
        onAddIceCandidateSuccess(pc);
    } catch (e) {
        onAddIceCandidateError(pc, e);
    }
    console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(pc) {
    console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
    console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
    if (pc) {
        console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
        console.log('ICE state change event: ', event);
    }
}

function hangupHandle() {
    console.log('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    hangupVideoBtn.disabled = true;
    callVideoBtn.disabled = false;
}






