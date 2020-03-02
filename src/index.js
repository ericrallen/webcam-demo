function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

var CVD; //return of Canvas2DDisplay

var drawnBlocks = [];
var analyser;
var intermediate = document.getElementById("intermediate");
var canvasCtx = intermediate.getContext("2d");

JEEFACEFILTERAPI.init({
  canvasId: "display",
  NNCpath: "./vendor/", //root of NNC.json file

  //called when video stream is ready and lib initialized :
  callbackReady: function(errCode, spec) {
    if (errCode) throw errCode;
    CVD = JEEFACEFILTERAPI.Canvas2DDisplay(spec);

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true
      })
      .then(stream => {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;

        distortion = audioCtx.createWaveShaper();
        gainNode = audioCtx.createGain();
        biquadFilter = audioCtx.createBiquadFilter();
        convolver = audioCtx.createConvolver();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = 2048;
      });
  }, //end callbackReady()

  //called at each render iteration (drawing loop) :
  callbackTrack: function(detectState) {
    if (analyser) {
      var bufferLength = analyser.fftSize;
      var dataArray = new Uint8Array(bufferLength);

      canvasCtx.clearRect(0, 0, intermediate.width, intermediate.height);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "rgb(200, 200, 200)";
      canvasCtx.fillRect(0, 0, intermediate.width, intermediate.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(0, 0, 0)";
      canvasCtx.beginPath();

      var sliceWidth = (intermediate.width * 1.0) / bufferLength;
      var x = 0;

      for (var i = 0; i < bufferLength; i++) {
        var v = dataArray[i] / 128.0;
        var y = (v * intermediate.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(intermediate.width, intermediate.height / 2);
      canvasCtx.stroke();
    }

    CVD.ctx.globalAlpha = 1.0;

    CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);

    CVD.ctx.strokeStyle = "black";
    CVD.ctx.fillStyle = "black";

    CVD.ctx.fillRect(0, 0, CVD.canvas.width, CVD.canvas.height);

    if (detectState.detected > 0.6) {
      var faceCoo = CVD.getCoordinates(detectState);

      var ghostBlocks = 0;

      CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);

      CVD.ctx.strokeStyle = "black";
      CVD.ctx.fillStyle = "black";

      CVD.ctx.fillRect(0, 0, CVD.canvas.width, CVD.canvas.height);

      CVD.ctx.fillStyle = "white";

      var variance = 0;

      for (
        var y = faceCoo.y - 12;
        y + 12 <= faceCoo.y + faceCoo.h + 12;
        y += 12
      ) {
        for (
          var x = faceCoo.x - 12;
          x + 12 <= faceCoo.x + faceCoo.w + 12;
          x += 12
        ) {
          ghostBlocks++;

          variance = dataArray[x + y] !== 128 ? dataArray[x + y] / 128.0 : 0;

          var rgb = [
            variance > 0.1 || variance < -0.1 ? variance * 100 : 50,
            50,
            50
          ];

          CVD.ctx.shadowColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          CVD.ctx.shadowBlur = randomIntFromInterval(0, variance * 10);

          drawnBlocks.push([x, y, 10, 10, variance]);

          CVD.ctx.fillRect(x, y, 10, 10);
        }
      }

      var ghosts = randomIntFromInterval(1.5, 3.25);

      for (var i = 0; i < ghostBlocks * ghosts; i++) {
        var ghost = drawnBlocks[i];

        if (drawnBlocks.length > ghostBlocks * ghosts) {
          drawnBlocks.shift();
        }

        if (ghost) {
          CVD.ctx.globalAlpha = ghost[4]
            ? ghost[4] / 2
            : randomIntFromInterval(0.01, 0.5);

          CVD.ctx.fillRect(ghost[0], ghost[1], ghost[2], ghost[3]);
        } else {
          break;
        }
      }

      CVD.update_canvasTexture();
    }

    CVD.draw();
  } //end callbackTrack()
}); //end JEEFACEFILTERAPI.init call
