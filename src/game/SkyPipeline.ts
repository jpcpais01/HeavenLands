import Phaser from 'phaser';

// Drifting cloud shadows and the vignette, in one full-screen pass. They
// used to be two blended full-screen layers, and filling the screen is what
// phones struggle with most. The result is the same as drawing the clouds
// and then the black vignette over them.
//
// Drawn by one screen-fixed image covering the canvas; the image's texture
// is the cloud tile, sampled in world space from the fragment's position.

/** The cloud tile's size (the 'clouds' texture, see art/textures.ts). */
const CLOUD_TILE = 256;
/** How fast Heaven Lands' shafts of light drift and breathe (radians a second). */
const DRIFT = [0.21, 0.13, 0.31, 0.09];

const FRAG = `
#define SHADER_NAME SKY_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uWorldOrigin;
uniform float uZoom;
uniform vec2 uTile;
uniform vec2 uTileSize;
uniform float uCloudAlpha;
uniform float uVignette;
// Heaven Lands' light: a luminous veil in place of the dark vignette, and
// soft shafts of light falling through the air (see skyState.heaven).
uniform float uHeaven;
uniform vec4 uVeil;
uniform vec4 uShafts;
uniform vec4 uDrift;

varying vec2 outTexCoord;

void main ()
{
    vec2 screen = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 world = uWorldOrigin + screen / uZoom;
    // Premultiplied, like every Phaser texture.
    vec4 cloud = texture2D(uMainSampler, fract((world + uTile) / uTileSize)) * uCloudAlpha;

    // Same falloff the vignette texture used to have.
    float d = length(screen / uResolution - 0.5) / 0.92;
    float g = sin(min(d, 1.0) * 3.14 * uVignette);
    float v = d > 1.0 ? 1.0 : g * g * g;

    if (uHeaven == 0.0)
    {
        gl_FragColor = vec4(cloud.rgb * (1.0 - v), 1.0 - (1.0 - cloud.a) * (1.0 - v));
        return;
    }

    // Shafts: bands across a slant (rays falling from the upper left), each a sum
    // of waves that repeat exactly once per tile, as the clouds do, so nothing
    // jumps when the tile wraps. They breathe and drift slowly along the slant.
    const float TAU = 6.2831853;
    vec2 q = fract(world / uTileSize) * TAU;
    float across = 3.0 * q.x - 2.0 * q.y;
    float along = 2.0 * q.x + 3.0 * q.y;
    float band = 0.55 * sin(across + uDrift.x) + 0.3 * sin(2.0 * across - uDrift.y + 1.7) + 0.15 * sin(5.0 * across + uDrift.z);
    float beam = smoothstep(0.25, 0.95, band) * (0.6 + 0.4 * sin(along - uDrift.w));
    float s = beam * uShafts.a;
    vec4 acc = cloud;
    acc = vec4(uShafts.rgb * s, s) + acc * (1.0 - s);

    // The veil: the edges glow pale instead of darkening, and most along the top,
    // as if the sky above were full of light.
    float e = smoothstep(0.55, 1.1, d);
    float top = 1.0 - screen.y / uResolution.y;
    float a = clamp((e + top * top * 0.4) * uVeil.a, 0.0, 0.9);
    acc = vec4(uVeil.rgb * a, a) + acc * (1.0 - a);
    gl_FragColor = acc;
}
`;

/** What the world scene sets each frame. */
export const skyState = {
  /** Cloud shadow strength, 0 to 1. */
  clouds: 0,
  tileX: 0,
  tileY: 0,
  /** Vignette strength, as Phaser's vignette effect. */
  vignette: 0.3,
  /** Heaven Lands' light, in place of the vignette: off, the plain dark vignette. */
  heaven: {
    on: false,
    /** The veil's colour, and how strongly it lies over the edges and the top. */
    veil: [1, 1, 1, 0] as [number, number, number, number],
    /** The shafts' colour, and how strong the brightest is. */
    shafts: [1, 1, 1, 0] as [number, number, number, number],
    /** Seconds, for the shafts' drift. */
    time: 0,
  },
};

export class SkyPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  onRender(_scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void {
    const z = camera.zoom;
    // Screen x = (worldX - scrollX) * z + width / 2 * (1 - z).
    // The clouds repeat every tile, so only where the view is within one matters: a phone's shader
    // floats can't tell pixels apart half a million pixels out (the Everwood's middle).
    const ox = camera.scrollX - (camera.width / 2) * (1 - z) / z;
    const oy = camera.scrollY - (camera.height / 2) * (1 - z) / z;
    this.set2f('uWorldOrigin', ox - Math.floor(ox / CLOUD_TILE) * CLOUD_TILE, oy - Math.floor(oy / CLOUD_TILE) * CLOUD_TILE);
    this.set1f('uZoom', z);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set2f('uTile', skyState.tileX, skyState.tileY);
    this.set1f('uCloudAlpha', skyState.clouds);
    this.set1f('uVignette', skyState.vignette);
    const h = skyState.heaven;
    this.set1f('uHeaven', h.on ? 1 : 0);
    if (h.on) {
      this.set4f('uVeil', ...h.veil);
      this.set4f('uShafts', ...h.shafts);
      // The shafts' drifts as angles worked out here, so a phone's floats stay
      // sharp however long the game runs.
      const t = h.time;
      const turn = (rate: number): number => (t * rate) % (Math.PI * 2);
      this.set4f('uDrift', turn(DRIFT[0]), turn(DRIFT[1]), turn(DRIFT[2]), turn(DRIFT[3]));
    }
  }

  onBind(gameObject?: Phaser.GameObjects.GameObject): void {
    const frame = (gameObject as Phaser.GameObjects.Image | undefined)?.frame;
    if (frame) this.set2f('uTileSize', frame.width, frame.height);
  }
}
