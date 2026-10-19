// Dark pixel-art outline: the scene is drawn into a texture with a depth buffer, then a screen
// pass darkens every pixel that sits on the near side of a depth jump (a silhouette). The
// camera is orthographic, so depth is linear and flat floors never produce a line. The line is
// one rendered pixel thick, so in the Pixel/Retro modes it is as thick as the pixel grid.
import * as THREE from "three";

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const FRAG = `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float range;      // far - near of the scene camera (world units per unit of depth)
uniform float threshold;  // depth jump (world units) that counts as an edge
uniform vec3 lineColor;
uniform float strength;
varying vec2 vUv;
float depthAt(vec2 offset) { return texture2D(tDepth, vUv + offset * texel).x * range; }
void main() {
  vec4 col = texture2D(tColor, vUv);
  float d = depthAt(vec2(0.0));
  // positive when the neighbours are farther away: this pixel is on the near side of the edge
  float lap = max(depthAt(vec2(1.0, 0.0)) + depthAt(vec2(-1.0, 0.0)) - 2.0 * d, 0.0)
            + max(depthAt(vec2(0.0, 1.0)) + depthAt(vec2(0.0, -1.0)) - 2.0 * d, 0.0);
  float edge = step(threshold, lap) * strength;
  gl_FragColor = vec4(mix(col.rgb, lineColor, edge), 1.0);
  #include <colorspace_fragment>
}`;

export class Outline {
  constructor(renderer, { color = "#10142a", strength = 0.85, threshold = 0.3 } = {}) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.target.depthTexture = new THREE.DepthTexture(1, 1);
    this.target.depthTexture.type = THREE.UnsignedIntType;
    this.target.depthTexture.minFilter = THREE.NearestFilter;
    this.target.depthTexture.magFilter = THREE.NearestFilter;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        texel: { value: new THREE.Vector2(1, 1) },
        range: { value: 200 },
        threshold: { value: threshold },
        lineColor: { value: new THREE.Color(color) },
        strength: { value: strength },
      },
    });
    this.screen = new THREE.Scene();
    this.screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.size = new THREE.Vector2();
  }

  // Call after renderer.setSize / setPixelRatio.
  resize() {
    this.renderer.getDrawingBufferSize(this.size);
    const w = Math.max(1, Math.floor(this.size.x));
    const h = Math.max(1, Math.floor(this.size.y));
    this.target.setSize(w, h);
    this.material.uniforms.texel.value.set(1 / w, 1 / h);
  }

  render(scene, camera) {
    this.material.uniforms.range.value = camera.far - camera.near;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.screen, this.screenCamera);
  }
}
