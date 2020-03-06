const main = document.getElementById("main");
const videoElement = document.getElementById("video");
const outputCanvas = document.getElementById("output");
const loader = document.getElementById("loading");
const outputContext = outputCanvas.getContext("2d");

const gridSize = 2;
const gutterSize = 1;

const isAndroid = () => /Android/i.test(navigator.userAgent);

const isiOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isMobile = () => isAndroid() || isiOS();

const killLoader = () => {
  loader.style.display = "none";
  main.style.display = "flex";
};

const startSegmenting = async net => {
  const segments = await net.segmentPerson(videoElement, {
    flipHorizontal: true,
    internalResolution: "low",
    segmentationThreshold: 0.7
  });

  outputContext.clearRect(
    0,
    0,
    document.body.clientWidth,
    document.body.clientHeight
  );

  for (let y = 0; y < document.body.clientHeight; y++) {
    for (let x = 0; x < document.body.clientWidth; x++) {
      var index = (y * document.body.clientWidth + x) * 4;

      if (segments.data[index + 3]) {
        outputContext.fillStyle = "rgb(0, 0, 0)";
        outputContext.fillRect(index, y, 1, 1);
      } else {
        outputContext.fillStyle = "rgb(200, 200, 200)";
        outputContext.fillRect(x, y, gridSize, gridSize);
      }

      x = x + gridSize;
    }
    y = y + gridSize;
  }
};

const render = network => {
  if (videoElement.paused || videoElement.ended) {
    return;
  }

  startSegmenting(network);

  requestAnimationFrame(() => {
    render(network);
  });
};

const startup = async () => {
  const constraints = {
    video: true,
    audio: true
  };

  if (isMobile()) {
    constraints.video = { facingMode: "user" };
  }

  const netOptions = {
    architecture: "MobileNetV1",
    multiplier: 0.5,
    outputStride: 16,
    quantBytes: 1
  };

  try {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async stream => {
        videoElement.srcObject = stream;

        await new Promise(resolve => (video.onloadedmetadata = resolve));

        videoElement.width = document.body.clientWidth;
        videoElement.height = document.body.clientHeight;

        bodyPix
          .load(netOptions)
          .then(network => {
            videoElement.addEventListener("play", () => render(network), false);

            videoElement.play();

            killLoader();
          })
          .catch(e => console.error(e));
      })
      .catch(e => console.error(e));
  } catch (e) {
    console.error(e);
    alert("Sorry, but your browser doesn't appear to support video capture.");
  }
};

document.addEventListener("DOMContentLoaded", () => startup());
