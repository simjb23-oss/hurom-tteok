import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// 휴롬 방아 — 몸체 하나 + 찜·치기 통(A) + 뽑기 통(B). 단위 cm.
const box = document.getElementById('v3d')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.localClippingEnabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
box.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#f4f1ea')
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const cam = new THREE.PerspectiveCamera(32, 1, 1, 600)
cam.position.set(46, 44, 96)
const ctl = new OrbitControls(cam, renderer.domElement)
ctl.target.set(0, 16, 0); ctl.enableDamping = true; ctl.minDistance = 40; ctl.maxDistance = 220
scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c4', 1.2))
const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(30, 60, 40); scene.add(sun)
const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ color: '#ebe6dc', roughness: 1 }))
floor.rotation.x = -Math.PI / 2; scene.add(floor)

// 자르는 면: 앞쪽 반(z>0)을 잘라 안을 보여 줌
const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
const mats = []
function mat(o, clip = true) {
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o })
  if (clip) mats.push(m)
  return m
}
const M = {
  body: mat({ color: '#f3ecdf', roughness: .5 }),
  steel: mat({ color: '#e3e6e9', metalness: .55, roughness: .3 }),
  bowl: mat({ color: '#e6e8eb', metalness: .5, roughness: .32 }),
  dark: mat({ color: '#3a3d42', roughness: .6 }),
  clear: mat({ color: '#e6f2f5', transparent: true, opacity: .22, roughness: .05, depthWrite: false }),
  glass: mat({ color: '#dcebef', transparent: true, opacity: .3, roughness: .02, metalness: .1, depthWrite: false }),
  screw: mat({ color: '#f6f1e4', roughness: .35 }),
  motor: mat({ color: '#6b6f75', metalness: .5, roughness: .45 }),
  water: mat({ color: '#7fb6e0', transparent: true, opacity: .55, roughness: .1 }),
  heater: mat({ color: '#d9603b', roughness: .5 }),
  warm: mat({ color: '#e8a25a', roughness: .5 }),
  pcb: mat({ color: '#2f7d4a', roughness: .6 }),
  green: mat({ color: '#0FC54F', roughness: .4 }),
  sil: mat({ color: '#dfe3df', roughness: .7 }),
  rice: mat({ color: '#fbfaf6', roughness: .9 }),
  dough: mat({ color: '#fbf8f0', roughness: .35 }),
  noz: mat({ color: '#e3e6e9', metalness: .55, roughness: .3 }),
  tteok: mat({ color: '#fbf8f0', roughness: .5 }, false),
  plate: mat({ color: '#ffffff', roughness: .4 }, false),
  led: mat({ color: '#0FC54F', emissive: '#0FC54F', emissiveIntensity: .7 }, false),
}

const parts = [] // 그룹마다 {key, label, dy, set: 'base'|'A'|'B'}
function part(parent, set, key, label, dy, tag) {
  const g = new THREE.Group(); g.userData = { key, label, dy, set, tag: new THREE.Vector3(...tag) }; parent.add(g); parts.push(g); return g
}
function lathe(pts, m, seg = 72) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m) }
function cyl(rt, rb, h, m, seg = 64, open = false) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m) }
function tube(points, r, m, seg = 40) { const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); const t = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 12), m); t.userData.curve = c; return t }

// ───────── 몸체(공용) ─────────
const body = part(scene, 'base', 'body', '몸체(공용)', 0, [10.4, 8, 0])
body.add(lathe([[0, 0], [9.4, 0], [10, .6], [10.2, 2], [10.2, 15], [9.8, 15.8], [9, 16], [0, 16]], M.body))
const top = lathe([[2.2, 16], [8.6, 16], [8.6, 16.25], [2.2, 16.25]], M.steel); body.add(top)
const dial = cyl(1.1, 1.1, .5, M.led, 32); dial.rotation.x = Math.PI / 2; dial.position.set(0, 11.5, 10.15); body.add(dial)
for (let i = 0; i < 4; i++) { const d = cyl(.22, .22, .3, M.led, 12); d.rotation.x = Math.PI / 2; d.position.set(-2.1 + i * 1.4, 14, 9.95); body.add(d) }

const motor = part(scene, 'base', 'motor', 'BLDC 모터 · 2단 감속기', 0, [-4.5, 6, 0])
const mo = cyl(3.6, 3.6, 6, M.motor); mo.position.y = 6; motor.add(mo)
const g1 = cyl(4.6, 4.6, 2, M.steel); g1.position.y = 10.1; motor.add(g1)
const g2 = cyl(4.6, 4.6, 2, M.motor); g2.position.y = 12.4; motor.add(g2)
const coup = cyl(1.3, 1.3, 2.6, M.steel, 6); coup.position.y = 15.1; motor.add(coup)

const steam = part(scene, 'base', 'steam', '펌프 → 순간 히터 → 스팀 포트', 0, [-4, 9, -7])
const pump = cyl(1, 1, 2.2, M.motor, 20); pump.position.set(-3.2, 6, -7); steam.add(pump)
const heat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.2), M.heater); heat.position.set(1.6, 8.5, -7); steam.add(heat)
const port = cyl(.9, .9, .6, M.sil, 20); port.position.set(0, 15.9, -7.5); steam.add(port)
const waterPath = tube([[0, 3, -10.5], [-3.2, 4.2, -8], [-3.2, 7, -7], [0, 8.5, -7], [1.6, 8.5, -7], [2.2, 11, -7.4], [1.2, 14.5, -7.5], [0, 16.2, -7.5], [0, 17.4, -7.5], [0, 17.4, -3]], .35, M.sil, 80)
steam.add(waterPath)

const tank = part(scene, 'base', 'tank', '물통 300mL(떼어 씻음)', 4, [0, 15, -14])
const tk = new THREE.Mesh(new THREE.BoxGeometry(9, 13, 4), M.clear); tk.position.set(0, 7.5, -12.4); tank.add(tk)
const wt = new THREE.Mesh(new THREE.BoxGeometry(8.4, 8, 3.4), M.water); wt.position.set(0, 5, -12.4); tank.add(wt)

const pcb = part(scene, 'base', 'pcb', '제어 기판 · 다이얼', 0, [4, 12, 9])
const board = new THREE.Mesh(new THREE.BoxGeometry(6, 4, .4), M.pcb); board.position.set(0, 12, 8.6); pcb.add(board)

// ───────── A: 찜·치기 통 ─────────
const A = new THREE.Group(); scene.add(A)
const bowl = part(A, 'A', 'bowl', '스테인리스 통(식기세척기 OK)', 4, [9.2, 24, 0])
bowl.add(lathe([[1.3, 16.3], [8.4, 16.3], [8.9, 16.8], [9, 29], [9.5, 29.7], [9.5, 30]], M.bowl))
const sleeve = cyl(1.3, 1.3, 3, M.bowl, 32); sleeve.position.y = 17.8; bowl.add(sleeve)
const inlet = cyl(.8, .8, 1, M.bowl, 16); inlet.position.set(0, 16.3, -7.5); bowl.add(inlet)
for (const s of [1, -1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(1.6, .45, 12, 24, Math.PI), M.dark); h.rotation.y = s > 0 ? 0 : Math.PI; h.rotation.z = -Math.PI / 2 * s; h.position.set(9.6 * s, 26.5, 0); bowl.add(h) }
const sieve = part(A, 'A', 'sieve', '구멍판(1.2mm · 떼어 씻음)', 8, [8.4, 18.8, 0])
sieve.add(lathe([[1.4, 18.6], [8.5, 18.6], [8.5, 18.85], [1.4, 18.85]], M.steel))
const holeG = new THREE.CircleGeometry(.22, 8), holeM = new THREE.MeshBasicMaterial({ color: '#555' }); mats.push(holeM)
for (let r = 2.4; r < 8.2; r += 1.1) for (let a = 0; a < Math.PI * 2; a += 1.1 / r) { const hm = new THREE.Mesh(holeG, holeM); hm.rotation.x = -Math.PI / 2; hm.position.set(Math.cos(a) * r, 18.87, Math.sin(a) * r); hm.userData.z = hm.position.z; sieve.add(hm) }
const blade = part(A, 'A', 'blade', '치기 날개(뽑아 씻음)', 12, [3, 20.5, 0])
const hub = cyl(1.1, 1.1, 3.4, M.screw, 24); hub.position.y = 20.3; blade.add(hub)
const arm = new THREE.Mesh(new THREE.BoxGeometry(14.6, .9, 1.8), M.screw); arm.position.y = 19.6; arm.rotation.x = .35; blade.add(arm)
const rice = lathe([[0, 25], [5, 23.6], [8.2, 20.4], [8.4, 19.4], [0, 19.4]], M.rice); A.add(rice)
const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), M.dough); lump.scale.set(6.4, 3.4, 5.6); lump.position.y = 22.2; lump.visible = false; A.add(lump)
const lidA = part(A, 'A', 'lidA', '유리 뚜껑 · 김 빠짐 구멍', 16, [0, 33, 0])
lidA.add(lathe([[0, 32.6], [3, 32.4], [7, 31.2], [9.6, 30], [9.6, 29.85]], M.glass))
const rim = new THREE.Mesh(new THREE.TorusGeometry(9.6, .25, 8, 72), M.steel); rim.rotation.x = Math.PI / 2; rim.position.y = 29.95; lidA.add(rim)
const knob = cyl(1.1, 1.4, 1.4, M.dark, 32); knob.position.y = 33.2; lidA.add(knob)

// ───────── B: 뽑기 헤드(가로형 · 제병기와 같은 방식) ─────────
const B = new THREE.Group(); scene.add(B)
const head = part(B, 'B', 'head', '기어 헤드(물에 안 닿음 · 닦기만)', 3, [-6, 21, -6])
const hb = new THREE.Mesh(new THREE.BoxGeometry(11, 10, 7), M.body); hb.position.set(0, 21.3, -5.6); head.add(hb)
const hcap = cyl(5.5, 5.5, 7, M.body, 48); hcap.rotation.x = Math.PI / 2; hcap.position.set(0, 26.3, -5.6); head.add(hcap)
const bv1 = cyl(1.8, 1.2, 1.4, M.steel, 20); bv1.position.set(0, 18.6, -5.6); head.add(bv1)
const bvS = cyl(.6, .6, 4, M.steel, 12); bvS.position.set(0, 17.4, -5.6); head.add(bvS)
const bv2 = cyl(1.8, 1.2, 1.4, M.steel, 20); bv2.rotation.x = Math.PI / 2; bv2.position.set(0, 22, -4.4); head.add(bv2)
const bvO = cyl(.6, .6, 3, M.steel, 12); bvO.rotation.x = Math.PI / 2; bvO.position.set(0, 22, -2.4); head.add(bvO)
const barrel = part(B, 'B', 'barrel', '뽑기 통 · 투입구(트라이탄)', 8, [0, 34.5, 1])
const bt = cyl(4.2, 4.2, 10.4, M.clear, 48, true); bt.rotation.x = Math.PI / 2; bt.position.set(0, 22, 3); barrel.add(bt)
const hop = lathe([[2.6, 25.6], [3, 25.6], [7.4, 33.4], [7.4, 34], [6.9, 34], [2.6, 26.2]], M.clear); hop.position.z = .6; barrel.add(hop)
const fill = cyl(3.4, 3.4, 9.4, M.dough, 40); fill.rotation.x = Math.PI / 2; fill.position.set(0, 22, 3); fill.visible = false; barrel.add(fill)
const feedD = cyl(2.6, 5, 5, M.dough, 32); feedD.position.set(0, 28.5, .6); feedD.visible = false; barrel.add(feedD)
const screw = part(B, 'B', 'screw', '스크루(울템) · 통과 틈 1mm', 14, [4.5, 22, 2])
const core = cyl(2.2, 1.4, 10, M.screw, 40); core.rotation.x = Math.PI / 2; core.position.set(0, 22, 3); screw.add(core)
const sp = []; for (let i = 0; i <= 260; i++) { const t = i / 260, a = t * Math.PI * 2 * 4; sp.push([Math.cos(a) * 3.2, 22 + Math.sin(a) * 3.2, -1.8 + t * 9.6]) }
screw.add(tube(sp, .55, M.screw, 520))
const nozzle = part(B, 'B', 'noz', '노즐 3종(돌려 끼움)', 0, [0, 26, 10])
const nz = cyl(4.5, 4.5, 1.8, M.noz, 48, true); nz.rotation.x = Math.PI / 2; nz.position.set(0, 22, 9.2); nozzle.add(nz)
const die = new THREE.Mesh(new THREE.RingGeometry(1.25, 4.5, 48), M.noz); die.position.set(0, 22, 10.1); nozzle.add(die)
const pusher = part(B, 'B', 'pusher', '누름봉', 10, [4, 40, 1])
const ph = cyl(2.4, 2.4, 10, M.body, 32); ph.position.set(0, 33, .6); pusher.add(ph)
const pk = cyl(3.2, 3.2, 1.2, M.body, 40); pk.position.set(0, 38.4, .6); pusher.add(pk)
const tteokCurve = new THREE.CatmullRomCurve3([[0, 22, 10.6], [0, 21, 14], [0, 10, 18], [0, 2.2, 22], [0, 2.2, 32]].map(p => new THREE.Vector3(...p)))
const tteok = new THREE.Mesh(new THREE.TubeGeometry(tteokCurve, 90, 1.2, 20), M.tteok); B.add(tteok)
const dish = cyl(8, 7, .8, M.plate, 48); dish.position.set(0, .4, 26); B.add(dish)

// 김 · 물 알갱이
const puffs = []
const puffM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .8 })
for (let i = 0; i < 46; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.38, 8, 8), puffM); p.visible = false; p.userData.t = Math.random(); A.add(p); puffs.push(p) }
const drops = []
for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.42, 8, 8), new THREE.MeshBasicMaterial({ color: '#2f86e0' })); f.visible = false; f.userData.t = i / 18; steam.add(f); drops.push(f) }

// ── 상태 ──
let explode = 0, explodeTo = 0, cutOn = false, step = 0, stepT = 0, mode = 0, modeTo = 0
function setCut(on) { cutOn = on; mats.forEach(m => { m.clippingPlanes = on ? [cut] : []; m.needsUpdate = true }) }
const ui = document.getElementById('v3d-ui')
const say = document.getElementById('v3d-say')
const lines = {
  0: '몸체 하나에 통 두 개를 바꿔 끼웁니다. 왼쪽 스테인리스 통은 찌고 치고, 오른쪽 뽑기 헤드는 가래떡을 가로로 뽑습니다(방앗간 제병기와 같은 방식). 마우스로 돌려 보세요.',
  1: '① 찌기 — 물통의 물을 작은 펌프가 조금씩 순간 히터로 보내 바로 김으로 만듭니다. 김은 스팀 포트로 통 바닥 아래에 들어가 구멍판(1.2mm) 위 불린 쌀을 20~25분 찝니다. 물통에 물이 고여 끓지 않으니 물때가 덜 생깁니다.',
  2: '② 치기 — 같은 통에서 바닥 날개가 돌며 찐 쌀을 치대 반죽을 만듭니다(분당 약 90회 · 6~8분). 반죽을 옮기지 않으니 셔터·깔때기가 없습니다. 일본 가정용 떡 기계가 오래 써 온 방식입니다.',
  3: '③ 바꿔 끼우기 — 알림이 울리면 손잡이로 통을 들어내고(유리 뚜껑을 덮어 두면 반죽이 따뜻하게 남습니다), 같은 축에 뽑기 헤드를 끼웁니다. 헤드 안 베벨 기어가 세로 축의 힘을 가로 스크루로 돌립니다.',
  4: '④ 뽑기 — 반죽을 주걱으로 투입구에 넣고 누름봉으로 누르면, 통에 꼭 맞는 가로 스크루(틈 1mm)가 분당 20~25회로 밀어 앞 노즐로 가래떡을 뽑습니다(약 4분). 단면은 오른쪽 반을 잘라 보여 줍니다.',
}
ui.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return
  const a = b.dataset.a
  if (a === 'whole') { explodeTo = 0; setCut(false); step = 0; modeTo = 0 }
  if (a === 'explode') { explodeTo = 1; step = 0 }
  if (a === 'cut') { setCut(!cutOn); explodeTo = 0 }
  if (a === 'swap') { modeTo = modeTo ? 0 : 1; step = 0; explodeTo = 0 }
  if (a.startsWith('s')) { step = +a[1]; stepT = 0; explodeTo = 0; modeTo = step >= 3 ? 1 : 0; setCut(step !== 3) }
  ui.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b || (x.dataset.a === 'cut' && cutOn && a !== 'whole')))
  say.textContent = lines[step] || (a === 'explode' ? '지금 몸체에 끼운 통의 부품을 위로 띄워 펼쳤습니다. 음식에 닿는 부품은 모두 떼어 씻습니다.' : a === 'swap' ? (modeTo ? '뽑기 헤드를 끼웠습니다. 찜·치기 통은 옆에 내려 두었습니다.' : '찜·치기 통을 끼웠습니다.') : lines[0])
})
say.textContent = lines[0]

const tags = document.getElementById('v3d-tags')
parts.forEach(g => { const d = document.createElement('span'); d.textContent = g.userData.label; tags.appendChild(d); g.userData.el = d })

function size() { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
new ResizeObserver(size).observe(box); size()

const v = new THREE.Vector3(), clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05)
  stepT += dt
  explode += (explodeTo - explode) * Math.min(1, dt * 5)
  mode += (modeTo - mode) * Math.min(1, dt * 2.2)
  // 통 위치: 몸체 위 ↔ 옆 바닥
  const lift = Math.sin(Math.PI * mode) * 10
  A.position.set(-30 * mode, -16.3 * mode + lift, 0)
  B.position.set(30 * (1 - mode), -16.3 * (1 - mode) + Math.sin(Math.PI * (1 - mode)) * 10, 0)
  tteok.visible = dish.visible = mode > .95
  const active = modeTo ? 'B' : 'A'
  cut.normal.set(modeTo ? -1 : 0, 0, modeTo ? 0 : -1)
  parts.forEach(g => { g.position.y = (g.userData.set === 'base' || g.userData.set === active) ? g.userData.dy * explode : 0 })
  // ① 찌기
  puffs.forEach(p => {
    p.visible = step === 1
    if (step === 1) { p.userData.t = (p.userData.t + dt * .45) % 1; const t = p.userData.t, a = p.id * 2.4, r = 2 + (p.id % 6); p.position.set(Math.cos(a) * r, 17.4 + t * 13, Math.sin(a) * r * .9); p.material.opacity = .8 * (1 - t) }
  })
  drops.forEach(f => { f.visible = step === 1; if (step === 1) { f.userData.t = (f.userData.t + dt * .28) % 1; f.position.copy(waterPath.userData.curve.getPoint(f.userData.t)) } })
  M.heater.emissive.set(step === 1 ? '#ff5a1f' : '#000000'); M.heater.emissiveIntensity = step === 1 ? .9 : 0
  // ② 치기
  rice.visible = step <= 1
  lump.visible = step === 2
  if (step === 2) { blade.rotation.y += dt * 9; lump.rotation.y += dt * 3; const k = 1 + Math.sin(stepT * 9) * .06; lump.scale.set(6.4 * k, 3.4 / k, 5.6 * k) }
  // ④ 뽑기
  fill.visible = feedD.visible = step === 4
  if (step === 4) {
    screw.rotation.z += dt * 2.2
    const f = Math.max(.1, 1 - stepT / 5); feedD.scale.y = f; feedD.position.y = 26 + 5 * f / 2
    pusher.position.y = -Math.min(5, stepT * 1.2)
  } else if (explode < .01) pusher.position.y = 0
  const grow = step === 4 ? Math.min(1, stepT / 4.5) : (step === 0 ? 1 : 0)
  tteok.geometry.setDrawRange(0, Math.floor(tteok.geometry.index.count * grow / 6) * 6)
  ctl.target.y = 16 + 8 * explode
  ctl.update()
  renderer.render(scene, cam)
  const w = box.clientWidth, h = box.clientHeight
  parts.forEach(g => {
    const d = g.userData.el
    const show = (explodeTo === 1 || cutOn) && (g.userData.set === 'base' || g.userData.set === active) && Math.abs(mode - modeTo) < .05
    d.style.display = show ? 'block' : 'none'
    if (!show) return
    v.copy(g.userData.tag); g.localToWorld(v); v.project(cam)
    d.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px)`
  })
})
