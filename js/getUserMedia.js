// 打开摄像头触发按钮
document.querySelector("#showVideo").addEventListener('click',evt => init(evt))

// 初始化
async function init(evt) {
    const constrains = window.constraints = {
        audio : true,
        video : true
    }

    try {
        const stream = await  navigator.mediaDevices.getUserMedia(constrains);
        handleSuccess(stream)
        evt.target.disabled = true
    }catch (e) {
        handleError(e)
    }
}

function handleSuccess(stream) {
    const video = document.querySelector('video')
    const videoTracks = stream.getVideoTracks()
    console.log('Got stream with constraints',constraints)
    console.log(`Using video device: ${videoTracks[0].label}`)
    window.stream = stream
    video.srcObject = stream
}

function handleError(error) {
    console.error(error)
}
