import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { shimmerFrom, sliderValue } from './op.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const HALF = 0.95
  const TRACK_Z = -0.15
  const MAT = { w: 2.7, d: 1.3, z: -0.2 }
  const RADIUS = 0.42
  const STRENGTH = 0.82

  // The Op Art mat: Riley-ish wavy stripes, bulged around the thumb like a Vasarely sphere.
  const opMat = new ShaderMaterial({
    uniforms: {
      uThumb: { value: new Vector2(0, TRACK_Z) },
      uRadius: { value: RADIUS },
      uStrength: { value: STRENGTH },
      uTime: { value: 0 },
      uShimmer: { value: 0 },
      uInk: { value: PALETTE.ink.clone() },
      uPaper: { value: PALETTE.tile.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uThumb;
      uniform float uRadius, uStrength, uTime, uShimmer;
      uniform vec3 uInk, uPaper;
      varying vec2 vWorld;
      void main() {
        // Same as bulgeSample() in op.ts.
        vec2 d = vWorld - uThumb;
        float k = 1.0 - min(0.95, uStrength) * exp(-dot(d, d) / (uRadius * uRadius));
        vec2 q = uThumb + d * k;
        float wave = sin(q.x * 3.2 + uTime * 6.0 * uShimmer) * (0.18 + 0.5 * uShimmer);
        float v = q.y * 16.0 + wave;
        // Triangle wave across each stripe, thresholded with a pixel-wide edge so the stripes stay crisp.
        float tri = abs(fract(v) - 0.5) * 2.0;
        float w = fwidth(v) * 2.0;
        float stripe = smoothstep(0.5 - w, 0.5 + w, tri);
        gl_FragColor = vec4(mix(uPaper, uInk, stripe), 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
  const mat = new Mesh(new PlaneGeometry(MAT.w, MAT.d), opMat)
  mat.rotation.x = -Math.PI / 2
  mat.position.set(0, 0.002, MAT.z)
  scene.add(mat)

  // The groove and the thumb: a heavy puck you slide along it.
  const grooveMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5, metalness: 0.2 })
  const groove = new Mesh(new BoxGeometry(HALF * 2 + 0.12, 0.012, 0.05), grooveMat)
  groove.position.set(0, 0.008, TRACK_Z)
  groove.receiveShadow = true
  scene.add(groove)
  const thumb = new Group()
  const puck = new Mesh(new CylinderGeometry(0.11, 0.12, 0.07, 48), new MeshStandardMaterial({ color: '#1d1c1a', roughness: 0.35, metalness: 0.4 }))
  puck.castShadow = true
  puck.position.y = 0.045
  const ring = new Mesh(new CylinderGeometry(0.06, 0.06, 0.004, 40), new MeshStandardMaterial({ color: PALETTE.accent, emissive: PALETTE.accent, emissiveIntensity: 0.6 }))
  ring.position.y = 0.082
  thumb.add(puck, ring)
  thumb.position.set(0, 0, TRACK_Z)
  scene.add(thumb)

  // The value, on a plate in front of the groove.
  const plate = new Mesh(new BoxGeometry(0.42, 0.02, 0.12), grooveMat)
  plate.position.set(0, 0.012, 0.36)
  plate.receiveShadow = true
  scene.add(plate)
  const readout = new Text()
  readout.font = FONTS.bold
  readout.fontSize = 0.05 / CAP_HEIGHT
  readout.color = PALETTE.tile
  readout.anchorX = 'center'
  readout.anchorY = 'middle'
  readout.rotation.x = -Math.PI / 2
  readout.position.set(0, 0.023, 0.36)
  scene.add(readout)

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  let x = 0
  let target = 0
  let speed = 0
  let shown = NaN
  let lastTick = 0

  createDrag(stage, {
    targets: [puck, ring],
    plane: 'floor',
    onMove(point) {
      target = Math.max(-HALF, Math.min(HALF, point.x))
    },
    onEnd() {
      status.textContent = `Value ${sliderValue(x, HALF)}.`
    },
  })

  stage.onFrame((dt, t) => {
    const prev = x
    // The puck has a little weight: it follows the pointer closely but not instantly.
    x = stage.reducedMotion ? target : x + (target - x) * Math.min(1, dt * 18)
    speed = speed * Math.exp(-dt * 6) + (Math.abs(x - prev) / Math.max(dt, 1e-4)) * (1 - Math.exp(-dt * 6))
    thumb.position.x = x
    opMat.uniforms.uThumb.value.set(x, TRACK_Z)
    opMat.uniforms.uShimmer.value = shimmerFrom(speed, stage.reducedMotion)
    opMat.uniforms.uStrength.value = STRENGTH + (stage.reducedMotion ? 0 : Math.min(0.1, speed * 0.04))
    if (!stage.reducedMotion) opMat.uniforms.uTime.value = t
    const value = sliderValue(x, HALF)
    if (value !== shown) {
      shown = value
      readout.text = String(value).padStart(3, '0')
      readout.sync()
      if (Math.abs(value - lastTick) >= 5) {
        sound.tick({ pitch: 0.6 + value / 100 })
        lastTick = value
      }
    }
  })

  stage.onReset(() => {
    x = target = 0
    speed = 0
    status.textContent = 'Value 50.'
  })

  status.textContent = 'Value 50.'
  if (stage.thumbnail) {
    target = x = -0.32
    setTimeout(() => stage.ready(), 800)
  } else setTimeout(() => stage.ready(), 400)
}
