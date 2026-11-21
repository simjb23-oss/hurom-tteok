import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const box = document.getElementById('v3d')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.localClippingEnabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
box.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#f4f1ea')
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const cam = new THREE.PerspectiveCamera(32, 1, 1, 500)
cam.position.set(66, 52, 104)
const ctl = new OrbitControls(cam, renderer.domElement)
ctl.target.set(0, 24, 0); ctl.enableDamping = true; ctl.minDistance = 40; ctl.maxDistance = 180
scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c4', 1.2))
const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(30, 60, 40); scene.add(sun)
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#ebe6dc', roughness: 1 }))
floor.rotation.x = -Math.PI / 2; scene.add(floor)

// 자르는 면: 앞쪽 반을 잘라 안을 보여 줌
const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
const mats = []
function mat(o, clip = true) {
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o })
  if (clip) mats.push(m)
  return m
}
const M = {
  body: mat({ color: '#f3ecdf', roughness: .55 }),
  steel: mat({ color: '#c9ccd0', metalness: .9, roughness: .28 }),
  clear: mat({ color: '#dfeef2', transparent: true, opacity: .22, roughness: .05, depthWrite: false }),
  screw: mat({ color: '#f6f1e4', roughness: .35 }),
  motor: mat({ color: '#6b6f75', metalness: .5, roughness: .45 }),
  water: mat({ color: '#7fb6e0', transparent: true, opacity: .55, roughness: .1 }),
  heater: mat({ color: '#d9603b', roughness: .5 }),
  pcb: mat({ color: '#2f7d4a', roughness: .6 }),
  gate: mat({ color: '#0FC54F', roughness: .4 }),
  rice: mat({ color: '#fbfaf6', roughness: .9 }),
  sil: mat({ color: '#dfe3df', roughness: .7 }),
  noz: mat({ color: '#c9ccd0', metalness: .85, roughness: .3 }, false),
  tteok: mat({ color: '#fbf8f0', roughness: .6 }, false),
  green: mat({ color: '#0FC54F', emissive: '#0FC54F', emissiveIntensity: .6 }, false),
}

const parts = [] // {key, group, home y, explode dy, label}
function part(key, label, dy) {
  const g = new THREE.Group(); g.userData = { key, label, dy }; scene.add(g); parts.push(g); return g
}
function lathe(pts, m, seg = 72) {
  return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m)
}
function cyl(rt, rb, h, m, seg = 64, open = false) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m) }

// ① 몸체(바깥 껍데기)
const body = part('body', '몸체', 0)
body.add(lathe([[0, 0], [8.2, 0], [9, .8], [9.2, 3], [9.2, 21], [8.8, 22], [0, 22]], M.body))
const btn = cyl(.9, .9, .4, M.green, 32, false); btn.rotation.x = Math.PI / 2; btn.position.set(0, 18, 9.25); body.add(btn)

// ② 모터 · 감속기
const motor = part('motor', '모터 · 감속기', 0)
const mo = cyl(3.6, 3.6, 8, M.motor); mo.position.set(0, 6.5, -1.5); motor.add(mo)
const gb = cyl(4.6, 4.6, 3, M.steel); gb.position.set(0, 12, -1.5); motor.add(gb)
const shaft = cyl(.6, .6, 9, M.steel, 16); shaft.position.set(0, 17.5, 0); motor.add(shaft)

// ③ 물통 · 스팀 히터
const steam = part('steam', '물통 · 스팀 히터', 0)
const tank = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 2.8), M.water); tank.position.set(0, 9, -6.4); steam.add(tank)
const heat = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 2.4), M.heater); heat.position.set(2.5, 17, -5.4); steam.add(heat)
const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.5, 18.2, -5.4), new THREE.Vector3(5.6, 23, -5.2), new THREE.Vector3(6.4, 31, -4), new THREE.Vector3(5.2, 33.4, -2.5)]), 40, .45, 12), M.steel)
steam.add(pipe)
const pipeCurve = pipe.geometry.parameters.path
const flow = []
for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.42, 8, 8), new THREE.MeshBasicMaterial({ color: '#4aa3e8' })); f.visible = false; f.userData.t = i / 14; steam.add(f); flow.push(f) }
const drops = []
for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 8), new THREE.MeshBasicMaterial({ color: '#3d8fd1' })); f.visible = false; f.userData.t = i / 6; steam.add(f); drops.push(f) }

// ④ 제어 기판
const pcb = part('pcb', '제어 기판 · 버튼', 0)
const board = new THREE.Mesh(new THREE.BoxGeometry(6, 4, .4), M.pcb); board.position.set(0, 17.5, 7.6); pcb.add(board)

// ⑤ 스테인리스 받침판
const base = part('base', '스테인리스 받침판', 3)
base.add(lathe([[1, 22], [7.6, 22], [7.6, 23.4], [1, 23.4]], M.steel))

// ⑥ 스크루 통(투명) + 스크루
const barrel = part('barrel', '스크루 통', 5.5)
barrel.add(lathe([[4.4, 23.4], [4.6, 23.4], [4.6, 32.4], [4.4, 32.4]], M.clear))
const outlet = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 24, 3), new THREE.Vector3(0, 22, 6.5), new THREE.Vector3(0, 13, 8.6), new THREE.Vector3(0, 12, 9.4)]), 40, 1.5, 20), M.sil)
barrel.add(outlet)

const screw = part('screw', '스크루(울템)', 8.5)
const core = cyl(1.6, 2.2, 8.6, M.screw, 40); core.position.y = 27.9; screw.add(core)
const pts = []; for (let i = 0; i <= 200; i++) { const t = i / 200, a = t * Math.PI * 2 * 3.2; pts.push(new THREE.Vector3(Math.cos(a) * 2.9, 24 + t * 8, Math.sin(a) * 2.9)) }
screw.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, .85, 10), M.screw))

// ⑦ 여닫는 바닥판(찜통 → 스크루)
const gate = part('gate', '여닫는 바닥판', 11.5)
const gateM = cyl(4.4, 4.4, .5, M.gate); gateM.position.y = 32.8; gate.add(gateM)

// ⑧ 투명 찜통 + 스팀판 + 쌀가루
const chamber = part('chamber', '투명 찜통', 15)
chamber.add(lathe([[4.4, 33], [8.2, 33.6], [8.4, 34], [8.4, 43], [8.1, 43]], M.clear))
const basket = lathe([[0, 34.6], [7.2, 34.6], [7.4, 39]], M.steel); chamber.add(basket)
const rice = lathe([[0, 38.6], [6.6, 34.9], [7, 35.2], [0, 35.2]], M.rice); chamber.add(rice)

// ⑨ 뚜껑
const lid = part('lid', '뚜껑', 19)
lid.add(lathe([[0, 45], [3, 44.9], [7, 44], [8.6, 43.2], [8.6, 42.9]], M.clear))
const knob = cyl(1.3, 1.6, 1.6, M.body, 32); knob.position.y = 45.6; lid.add(knob)

// ⑩ 노즐 + 떡
const noz = part('noz', '노즐(바꿔 끼움)', 0)
const nz = cyl(2.1, 2.1, 3, M.noz, 40); nz.rotation.x = Math.PI / 2; nz.position.set(0, 12, 10.6); noz.add(nz)
const tteokCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 12, 11.5), new THREE.Vector3(0, 10, 16), new THREE.Vector3(0, 2.5, 19), new THREE.Vector3(0, 1.3, 26), new THREE.Vector3(0, 1.3, 34)])
const tteok = new THREE.Mesh(new THREE.TubeGeometry(tteokCurve, 80, 1.2, 20), M.tteok)
noz.add(tteok)

// 스팀 알갱이
const puffG = new THREE.SphereGeometry(.35, 8, 8)
const puffM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .8 })
const puffs = []
for (let i = 0; i < 40; i++) { const p = new THREE.Mesh(puffG, puffM); p.visible = false; p.userData.t = Math.random(); chamber.add(p); puffs.push(p) }

// ── 상태 ──
let explode = 0, explodeTo = 0, cutOn = false, step = 0, stepT = 0
function setCut(on) { cutOn = on; mats.forEach(m => { m.clippingPlanes = on ? [cut] : []; m.needsUpdate = true }) }
const ui = document.getElementById('v3d-ui')
const say = document.getElementById('v3d-say')
const lines = {
  0: '마우스로 돌려 보세요. 「단면」을 누르면 앞쪽 반을 잘라 안이 보입니다.',
  1: '① 찌기 — 뒤쪽 물통(300mL, 파란 상자)의 물이 조금씩 스팀 히터(빨간 블록, 약 800W)로 들어가 끓습니다. 김은 스테인리스 관을 타고 찜통 바닥 아래로 들어가, 구멍 뚫린 스팀판을 지나 쌀가루를 20~25분 찝니다. 물통은 몸체 뒤에서 빼서 채웁니다.',
  2: '② 치기 — 초록 구멍판이 열리면 스크루 끝이 찐 반죽을 물어 스크루 통으로 끌어내리고, 분당 20~25회로 천천히 돌며 치댑니다.',
  3: '③ 뽑기 — 스크루가 반죽을 아래로 밀어 실리콘 통로를 지나 앞 노즐로 가래떡을 뽑습니다.',
}
ui.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return
  const a = b.dataset.a
  if (a === 'whole') { explodeTo = 0; setCut(false); step = 0 }
  if (a === 'explode') { explodeTo = 1; step = 0 }
  if (a === 'cut') { setCut(!cutOn); explodeTo = 0 }
  if (a.startsWith('s')) { step = +a[1]; stepT = 0; explodeTo = 0; setCut(true) }
  ui.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b || (x.dataset.a === 'cut' && cutOn && a !== 'whole')))
  say.textContent = lines[step] || (a === 'explode' ? '부품을 위로 띄워 펼쳤습니다. 아래 목록의 번호와 같습니다.' : lines[0])
})
say.textContent = lines[0]

// 이름표
const tags = document.getElementById('v3d-tags')
const tagFor = { body: [9.4, 8, 0], motor: [-4, 6, 0], steam: [-4, 9, -7], pcb: [3, 17.5, 8], base: [7.8, 22.7, 0], barrel: [-4.8, 28, 0], screw: [3, 26, 0], gate: [-4.6, 32.8, 0], chamber: [8.6, 38, 0], lid: [0, 46.5, 0], noz: [0, 12, 12.2] }
parts.forEach(g => {
  const d = document.createElement('span'); d.textContent = g.userData.label; tags.appendChild(d); g.userData.tag = d
})

function size() {
  const w = box.clientWidth, h = box.clientHeight
  renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix()
}
new ResizeObserver(size).observe(box); size()

const v = new THREE.Vector3(), clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05)
  explode += (explodeTo - explode) * Math.min(1, dt * 5)
  parts.forEach(g => { g.position.y = g.userData.dy * explode })
  stepT += dt
  // 찌기: 김
  puffs.forEach(p => {
    p.visible = step === 1
    if (step === 1) { p.userData.t = (p.userData.t + dt * .5) % 1; const t = p.userData.t, a = p.id * 2.4; p.position.set(Math.cos(a) * 5 * t, 35 + t * 9, Math.sin(a) * 5 * t); p.material.opacity = .8 * (1 - t) }
  })
  flow.forEach(f => { f.visible = step === 1; if (step === 1) { f.userData.t = (f.userData.t + dt * .35) % 1; f.position.copy(pipeCurve.getPoint(f.userData.t)) } })
  drops.forEach(f => { f.visible = step === 1; if (step === 1) { f.userData.t = (f.userData.t + dt * .5) % 1; const t = f.userData.t; f.position.set(1 + t * 1.5, 15 + t * 2, -5.4) } })
  M.heater.emissive.set(step === 1 ? '#ff5a1f' : '#000000'); M.heater.emissiveIntensity = step === 1 ? .9 : 0
  // 치기 · 뽑기: 바닥판 열림 · 스크루 회전
  gateM.position.x = THREE.MathUtils.lerp(gateM.position.x, step >= 2 ? 6 : 0, dt * 3)
  if (step >= 2) screw.rotation.y += dt * 1.6
  rice.visible = step < 2
  // 뽑기: 떡이 자라 나옴
  const grow = step === 3 ? Math.min(1, stepT / 4) : (step === 0 ? 1 : 0)
  tteok.geometry.setDrawRange(0, Math.floor(tteok.geometry.index.count * grow / 6) * 6)
  ctl.target.y = 24 + 7 * explode
  ctl.update()
  renderer.render(scene, cam)
  const w = box.clientWidth, h = box.clientHeight
  parts.forEach(g => {
    const t = tagFor[g.userData.key], d = g.userData.tag
    const show = explodeTo === 1 || cutOn
    d.style.display = show ? 'block' : 'none'
    if (!show) return
    v.set(t[0], t[1] + g.position.y, t[2]).project(cam)
    d.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px)`
  })
})
