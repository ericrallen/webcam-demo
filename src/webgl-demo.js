const main = document.getElementById("main");
const videoElement = document.getElementById("video");
const outputCanvas = document.getElementById("output");
const loader = document.getElementById("loading");
const outputContext = outputCanvas.getContext("webgl");

const renderer = new THREE.WebGLRenderer({ canvas: outputCanvas });

const scene = new THREE.Scene();

const composer = new THREE.EffectComposer(renderer);

const uniforms = {
  iTime: { value: 0 },
  iResolution: { value: new THREE.Vector3() }
};

const isAndroid = () => /Android/i.test(navigator.userAgent);

const isiOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isMobile = () => isAndroid() || isiOS();

const killLoader = () => {
  loader.style.display = "none";
  main.style.display = "flex";
};

const render = time => {
  time *= 0.001; // convert to seconds

  uniforms.iResolution.value.set(outputCanvas.width, outputCanvas.height, 1);
  uniforms.iTime.value = time;

  composer.render();

  requestAnimationFrame(render);
};

// borrowed from: https://threejsfundamentals.org/threejs/lessons/threejs-post-processing.html
const fragmentShader = `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  uniform vec3 iResolution;
  uniform sampler2D iChannel0;

  void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord.xy / iResolution.xy;
      vec3 col;
      
      /*** Sobel kernels ***/
      // Note: GLSL's mat3 is COLUMN-major ->  mat3[col][row]
      mat3 sobelX = mat3(-1.0, -2.0, -1.0,
                        0.0,  0.0, 0.0,
                        1.0,  2.0,  1.0);
      mat3 sobelY = mat3(-1.0,  0.0,  1.0,
                        -2.0,  0.0, 2.0,
                        -1.0,  0.0,  1.0);  
      
      float sumX = 0.2;	// x-axis change
      float sumY = 0.2;	// y-axis change
      
      for(int i = -1; i <= 1; i++)
      {
          for(int j = -1; j <= 1; j++)
          {
              // texture coordinates should be between 0.0 and 1.0
              float x = (fragCoord.x + float(i))/iResolution.x;	
          float y =  (fragCoord.y + float(j))/iResolution.y;
              
              // Convolve kernels with image
              sumX += length(texture2D( iChannel0, vec2(x, y) ).xyz) * float(sobelX[1+i][1+j]);
              sumY += length(texture2D( iChannel0, vec2(x, y) ).xyz) * float(sobelY[1+i][1+j]);
          }
      }
      
      float g = abs(sumX) + abs(sumY);
      // g = sqrt((sumX*sumX) + (sumY*sumY));
      
      if(g > 1.0)
          col = vec3(1.0,1.0,1.0);
      else
          col = col * 0.0;
      
    fragColor.xyz = col;
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
`;

const startUp = () => {
  const constraints = {
    video: true,
    audio: true
  };

  if (isMobile()) {
    constraints.video = { facingMode: "user" };
  }

  try {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async stream => {
        videoElement.srcObject = stream;

        await new Promise(resolve => (videoElement.onloadedmetadata = resolve));

        videoElement.width = document.body.clientWidth;
        videoElement.height = document.body.clientHeight;

        videoElement.play();

        // const videoImage = document.createElement("canvas");
        // videoImage.width = videoElement.width;
        // videoImage.height = videoElement.height;

        // const videoImageContext = videoImage.getContext("2d");
        // // background color if no video present

        // videoImageContext.fillStyle = "#ff0000";
        // videoImageContext.fillRect(0, 0, videoImage.width, videoImage.height);

        // videoTexture = new THREE.Texture(videoImage);
        // videoTexture.minFilter = THREE.LinearFilter;
        // videoTexture.magFilter = THREE.LinearFilter;

        // const videoMaterial = new THREE.MeshBasicMaterial({
        //   map: videoTexture
        // });

        // const videoGeometry = new THREE.PlaneGeometry(4, 3);
        // const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);

        // videoMesh.position.set(0, 0, 0);

        // scene.add(videoMesh);

        var texture = new THREE.VideoTexture(videoElement);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBFormat;

        const geometry = new THREE.PlaneBufferGeometry();

        uniforms.iChannel0 = { value: texture };

        const material = new THREE.ShaderMaterial({
          fragmentShader,
          uniforms
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);

        scene.add(mesh);

        const camera = new THREE.PerspectiveCamera(
          1,
          document.body.clientWidth / document.body.clientHeight,
          1,
          1000
        );

        camera.position.z = 1;

        renderer.setSize(document.body.clientWidth, document.body.clientHeight);

        // const bloomPass = new THREE.BloomPass(1.7);

        // const effectCopy = new THREE.ShaderPass(THREE.CopyShader);
        // effectCopy.renderToScreen = true;

        // const glitchPass = new THREE.GlitchPass();

        composer.addPass(new THREE.RenderPass(scene, camera));
        // composer.addPass(bloomPass);
        // composer.addPass(glitchPass);
        // composer.addPass(effectCopy);

        render();

        killLoader();
      })
      .catch(e => console.error(e));
  } catch (e) {
    console.error(e);
    alert("Sorry, but your browser doesn't appear to support video capture.");
  }
};

document.addEventListener("DOMContentLoaded", () => startUp());
