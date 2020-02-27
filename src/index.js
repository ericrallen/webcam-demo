function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

var CVD; //return of Canvas2DDisplay

var drawnBlocks = [];
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
var audio = document.getElementById("audio");
var video = document.getElementById("video");
var intermediate = document.getElementById("intermediate");
var ctx = intermediate.getContext("2d");

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
        var source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        video.srcObject = stream;
      });
  }, //end callbackReady()

  //called at each render iteration (drawing loop) :
  callbackTrack: function(detectState) {
    ctx.drawImage(video, 0, 0, 600, 400);

    CVD.ctx.globalAlpha = 1.0;

    CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);

    CVD.ctx.strokeStyle = "black";
    CVD.ctx.fillStyle = "black";

    CVD.ctx.fillRect(0, 0, CVD.canvas.width, CVD.canvas.height);

    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    if (detectState.detected > 0.6) {
      //draw a border around the face
      var faceCoo = CVD.getCoordinates(detectState);

      var ghostBlocks = 0;

      CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);

      CVD.ctx.strokeStyle = "black";
      CVD.ctx.fillStyle = "black";

      CVD.ctx.fillRect(0, 0, CVD.canvas.width, CVD.canvas.height);

      CVD.ctx.fillStyle = "white";

      var barHeight = dataArray[randomIntFromInterval(0, bufferLength)] / 2;

      var rgbAdjust = randomIntFromInterval(0, 2);

      var rgb = [barHeight + 100, 50, 50];

      // rgb[rgbAdjust] = barHeight + 100;

      CVD.ctx.shadowColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      CVD.ctx.shadowBlur = randomIntFromInterval(0, barHeight / 25);

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

          drawnBlocks.push([x, y, 10, 10]);

          CVD.ctx.fillRect(x, y, 10, 10);
        }
      }

      var ghosts = randomIntFromInterval(1.5, 4.5);

      CVD.ctx.globalAlpha = barHeight / 100;

      for (var i = 0; i < ghostBlocks * ghosts; i++) {
        var ghost = drawnBlocks[i];

        if (drawnBlocks.length > ghostBlocks * ghosts) {
          drawnBlocks.shift();
        }

        if (ghost) {
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
