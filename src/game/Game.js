import {
  ROWS, COLS, CELL, BOARD_X, BOARD_W, WIDTH, HEIGHT,
  START_DEW, DEW, ENEMIES,
} from './config.js'
import { play } from './audio.js'
import { setMusicIntensity } from './music.js'

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
const rand = (a, b) => a + Math.random() * (b - a)
const cellCenter = (row, col) => ({ x: BOARD_X + col * CELL + CELL / 2, y: row * CELL + CELL / 2 })

/**
 * Moteur du jeu : simulation + rendu canvas.
 * Communique avec Vue uniquement via l'objet réactif `ui`.
 */
export class Game {
  /** @param defs stats des défenseurs, améliorations du joueur déjà appliquées */
  constructor(canvas, ui, level, defs) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.width = WIDTH
    canvas.height = HEIGHT

    this.ui = ui
    this.level = level
    this.defs = defs
    this.finalAt = level.waves.at(-1).at
    this.lanes = level.lanes ?? Array.from({ length: ROWS }, (_, r) => r)

    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    this.enemies = []
    this.projectiles = []
    this.drops = []
    this.effects = []
    this.particles = []
    this.texts = [] // textes flottants (+25…)
    this.shake = 0 // secousse de l'écran, en secondes restantes
    this.danger = 0 // 0..1, un insecte approche de la cabane
    this.intense = false // musique de nuée en cours
    this.spawnQueue = []
    this.nextWave = 0
    this.announced = new Set()
    this.bannerTime = 0
    this.time = 0
    this.skyTimer = rand(3, 5)
    this.lastRow = -1
    this.hover = null
    this.cooldowns = Object.fromEntries(Object.keys(defs).map((k) => [k, 0]))
    this.planted = Object.fromEntries(Object.keys(defs).map((k) => [k, 0]))
    this.decor = Array.from({ length: 14 }, () => ({
      x: rand(BOARD_X + BOARD_W + 10, WIDTH - 10),
      y: rand(10, HEIGHT - 10),
      e: Math.random() < 0.6 ? '🌿' : '🍀',
    }))

    Object.assign(ui, {
      dew: level.startDew ?? START_DEW,
      selected: null,
      cooldowns: { ...this.cooldowns },
      status: 'playing',
      progress: 0,
      banner: '',
      paused: false,
      speed: 1,
    })
  }

  // ---------------------------------------------------------------- boucle

  start() {
    this.last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - this.last) / 1000, 0.05)
      this.last = now
      if (!this.ui.paused && this.ui.status === 'playing') {
        for (let i = 0; i < this.ui.speed; i++) this.update(dt)
      }
      this.render()
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  update(dt) {
    this.time += dt
    this.updateWaves(dt)
    this.updateSky(dt)
    this.updateDefenders(dt)
    this.updateProjectiles(dt)
    this.updateEnemies(dt)
    this.updateDrops(dt)
    this.updateEffects(dt)
    this.syncUi(dt)
    this.checkEnd()
  }

  // ---------------------------------------------------------------- vagues

  updateWaves(dt) {
    const waves = this.level.waves
    while (this.nextWave < waves.length && this.time >= waves[this.nextWave].at) {
      const wave = waves[this.nextWave++]
      const gap = wave.big ? 0.7 : 1.6
      wave.spawns.forEach((type, i) => this.spawnQueue.push({ type, delay: i * gap }))
    }

    const upcoming = waves[this.nextWave]
    if (upcoming?.big && !this.announced.has(this.nextWave) && this.time >= upcoming.at - 4) {
      this.announced.add(this.nextWave)
      this.showBanner(this.nextWave === waves.length - 1 ? 'Dernière nuée !' : 'Une nuée approche !')
      play('wave')
      this.intense = true
      this.intenseFrom = upcoming.at
      setMusicIntensity(1)
    }
    // retour au calme quand la nuée est quasiment éliminée
    if (this.intense && this.time > this.intenseFrom && !this.spawnQueue.length && this.enemies.length <= 2) {
      this.intense = false
      setMusicIntensity(0)
    }
    if (this.bannerTime > 0 && (this.bannerTime -= dt) <= 0) this.ui.banner = ''

    for (const s of this.spawnQueue) s.delay -= dt
    for (const s of this.spawnQueue.filter((s) => s.delay <= 0)) this.spawnEnemy(s.type)
    this.spawnQueue = this.spawnQueue.filter((s) => s.delay > 0)
  }

  showBanner(text) {
    this.ui.banner = text
    this.bannerTime = 3
  }

  spawnEnemy(type) {
    // rangée au hasard, en évitant de répéter la précédente
    const choices = this.lanes.length > 1 ? this.lanes.filter((r) => r !== this.lastRow) : this.lanes
    const row = choices[Math.floor(Math.random() * choices.length)]
    this.lastRow = row
    const def = ENEMIES[type]
    this.enemies.push({
      type, def, row,
      x: WIDTH + rand(10, 40),
      y: row * CELL + CELL / 2,
      hp: def.hp,
      eating: false,
      hitFlash: 0,
      wobble: Math.random() * 6,
    })
  }

  // ---------------------------------------------------------------- rosée

  updateSky(dt) {
    if (this.level.night || (this.skyTimer -= dt) > 0) return
    this.skyTimer = rand(...DEW.skyInterval)
    this.drops.push({
      x: rand(BOARD_X + 30, BOARD_X + BOARD_W - 30),
      y: -30,
      vy: 55,
      gravity: 0,
      targetY: rand(60, HEIGHT - 40),
      life: DEW.lifetime,
    })
  }

  updateDrops(dt) {
    for (const d of this.drops) {
      if (d.collecting) {
        // vol vers le compteur (coin haut gauche)
        d.x += (20 - d.x) * Math.min(1, dt * 8)
        d.y += (16 - d.y) * Math.min(1, dt * 8)
        if (Math.hypot(d.x - 20, d.y - 16) < 12) d.dead = true
      } else if (!d.landed) {
        d.vy += d.gravity * dt
        d.y += d.vy * dt
        if (d.vy > 0 && d.y >= d.targetY) {
          d.y = d.targetY
          d.landed = true
        }
      } else if ((d.life -= dt) <= 0) {
        d.dead = true
      }
    }
    this.drops = this.drops.filter((d) => !d.dead)
  }

  collect(drop) {
    drop.collecting = true
    this.ui.dew += DEW.value
    play('collect')
    this.floatText(drop.x, drop.y - 20, `+${DEW.value}`, '#e1f5fe')
    this.burst(drop.x, drop.y, { n: 8, colors: ['#e1f5fe', '#81d4fa', '#fff'], g: 0, speed: [40, 110], life: [0.3, 0.5] })
  }

  // ---------------------------------------------------------------- défenseurs

  canPlant(type) {
    return this.ui.dew >= this.defs[type].cost && this.cooldowns[type] <= 0
  }

  plant(type, row, col) {
    if (this.grid[row][col] || !this.lanes.includes(row) || !this.canPlant(type)) return false
    const def = this.defs[type]
    this.ui.dew -= def.cost
    this.cooldowns[type] = def.cooldown
    this.planted[type]++
    const { x, y } = cellCenter(row, col)
    this.grid[row][col] = {
      type, def, row, col, x, y,
      hp: def.hp,
      timer: def.produce?.first ?? def.explode?.fuse ?? 0,
      anim: Math.random() * 6,
      born: 0, // pour l'animation d'apparition
      hitFlash: 0,
      recoil: 0,
    }
    this.dirt(x, y + 26)
    play(def.explode ? 'fuse' : 'plant')
    return true
  }

  removeDefender(d) {
    this.grid[d.row][d.col] = null
  }

  /** Plante dévorée par un insecte */
  destroyDefender(d) {
    this.removeDefender(d)
    play('plantLost')
    this.burst(d.x, d.y, { n: 6, emoji: '🍃', speed: [60, 160], up: 120, life: [0.6, 1], size: [18, 26] })
    this.burst(d.x, d.y, { n: 10, colors: ['#558b2f', '#7cb342', '#33691e'], speed: [60, 180], up: 100 })
  }

  allDefenders() {
    return this.grid.flat().filter(Boolean)
  }

  updateDefenders(dt) {
    for (const d of this.allDefenders()) {
      d.anim += dt
      d.born += dt
      d.hitFlash = Math.max(0, d.hitFlash - dt)
      d.recoil = Math.max(0, d.recoil - dt)
      const { produce, attack, explode } = d.def

      if (produce && (d.timer -= dt) <= 0) {
        d.timer = produce.every
        this.drops.push({
          x: d.x + rand(-22, 22),
          y: d.y - 10,
          vy: -170,
          gravity: 520,
          targetY: d.y + rand(14, 28),
          life: DEW.lifetime,
        })
        play('produce')
        this.burst(d.x, d.y - 10, { n: 10, colors: ['#fff59d', '#ffee58', '#fff'], g: -40, speed: [30, 90], life: [0.4, 0.8] })
      }

      if (attack) {
        d.timer = Math.max(0, d.timer - dt)
        if (d.timer === 0 && this.hasTargetInRow(d.row, d.x)) {
          d.timer = attack.every
          d.recoil = 0.15
          this.projectiles.push({ row: d.row, x: d.x + 22, y: d.y - 6, speed: attack.speed, damage: attack.damage })
          play('shoot')
        }
      }

      if (explode && (d.timer -= dt) <= 0) this.explode(d)
    }
  }

  hasTargetInRow(row, x) {
    return this.enemies.some((e) => e.row === row && e.x > x && e.x < BOARD_X + BOARD_W + 20)
  }

  explode(d) {
    const { damage, range } = d.def.explode
    for (const e of this.enemies) {
      if (Math.abs(e.row - d.row) <= 1 && Math.abs(e.x - d.x) <= CELL * range) this.hurt(e, damage)
    }
    this.effects.push({ kind: 'boom', x: d.x, y: d.y, t: 0, dur: 0.6 })
    this.removeDefender(d)
    play('explode')
    this.shake = 0.45
    this.burst(d.x, d.y, { n: 40, colors: ['#ffeb3b', '#ff9800', '#ff5722', '#5d4037'], speed: [120, 420], up: 80, life: [0.4, 1], size: [3, 7] })
    this.burst(d.x, d.y, { n: 5, emoji: '🔥', speed: [40, 140], up: 60, life: [0.5, 0.9], size: [22, 32], g: -60 })
  }

  // ---------------------------------------------------------------- projectiles

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.x += p.speed * dt
      // les pépins passent sous un insecte en plein saut
      const hit = this.enemies.find((e) => e.row === p.row && e.hp > 0 && !e.leap && Math.abs(e.x - p.x) < 22)
      if (hit) {
        this.hurt(hit, p.damage)
        this.effects.push({ kind: 'splash', x: p.x, y: p.y, t: 0, dur: 0.25 })
        this.burst(p.x, p.y, { n: 5, colors: ['#e53935', '#ff7043', '#ffcc80'], speed: [40, 140], up: 40, life: [0.2, 0.4] })
        play('hit')
        p.dead = true
      } else if (p.x > WIDTH + 20) {
        p.dead = true
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead)
  }

  // ---------------------------------------------------------------- insectes

  hurt(enemy, amount) {
    enemy.hp -= amount
    enemy.hitFlash = 0.1
    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true
      this.effects.push({ kind: 'puff', x: enemy.x, y: enemy.y, t: 0, dur: 0.5 })
      this.burst(enemy.x, enemy.y, { n: 14, colors: ['#9ccc65', '#c5e1a5', '#827717'], speed: [60, 200], up: 120 })
      play('die')
    }
  }

  updateEnemies(dt) {
    this.enemies = this.enemies.filter((e) => e.hp > 0)
    let closest = Infinity
    for (const e of this.enemies) {
      closest = Math.min(closest, e.x)
      e.hitFlash = Math.max(0, e.hitFlash - dt)
      if (e.leap) {
        this.updateLeap(e, dt)
        continue
      }
      // le défenseur juste devant la bouche de l'insecte
      const target = this.grid[e.row].find((d) => d && e.x - d.x >= 0 && e.x - d.x < 58)
      if (target && e.def.jump && !e.jumped) {
        e.jumped = true
        e.leap = { from: e.x, to: target.x - 62, t: 0 }
        play('jump')
      } else if (target) {
        e.eating = true
        target.hp -= e.def.bite * dt
        target.hitFlash = 0.08
        play('bite')
        if (Math.random() < dt * 6) {
          this.burst(target.x + 20, target.y, { n: 2, colors: ['#7cb342', '#aed581'], speed: [30, 90], up: 60 })
        }
        if (target.hp <= 0) this.destroyDefender(target)
      } else {
        e.eating = false
        e.x -= (e.jumped ? e.def.jump.speedAfter : e.def.speed) * dt
      }
      e.wobble += dt * (e.eating ? 14 : 6)
      if (e.x < BOARD_X - 20) this.ui.status = 'lost'
    }
    // alerte : un insecte à moins de deux cases de la cabane
    const target = closest < BOARD_X + CELL * 2 ? 1 : 0
    this.danger += (target - this.danger) * Math.min(1, dt * 3)
  }

  updateLeap(e, dt) {
    const leap = e.leap
    leap.t = Math.min(1, leap.t + dt / e.def.jump.duration)
    e.x = leap.from + (leap.to - leap.from) * leap.t
    e.lift = Math.sin(leap.t * Math.PI) * 60
    if (leap.t === 1) {
      e.leap = null
      e.lift = 0
    }
  }

  // ---------------------------------------------------------------- divers

  updateEffects(dt) {
    for (const f of this.effects) f.t += dt
    this.effects = this.effects.filter((f) => f.t < f.dur)

    for (const p of this.particles) {
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    for (const t of this.texts) {
      t.y -= 40 * dt
      t.life -= dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)

    this.shake = Math.max(0, this.shake - dt)
  }

  /** Gerbe de particules (ronds colorés, ou emojis si `emoji` est fourni) */
  burst(x, y, { n = 8, colors = ['#fff'], emoji, speed = [60, 180], up = 0, g = 500, life = [0.4, 0.7], size = [2, 4] } = {}) {
    for (let i = 0; i < n; i++) {
      const angle = rand(0, Math.PI * 2)
      const v = rand(...speed)
      const max = rand(...life)
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - up,
        g, life: max, max,
        size: rand(...size),
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji,
        rot: rand(0, Math.PI * 2),
        vr: rand(-6, 6),
      })
    }
  }

  dirt(x, y) {
    this.burst(x, y, { n: 10, colors: ['#795548', '#8d6e63', '#5d4037'], speed: [40, 140], up: 140, g: 700, size: [2, 5] })
  }

  floatText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.9, max: 0.9 })
  }

  syncUi(dt) {
    for (const [type, def] of Object.entries(this.defs)) {
      this.cooldowns[type] = Math.max(0, this.cooldowns[type] - dt)
      const ratio = Math.ceil((this.cooldowns[type] / def.cooldown) * 100) / 100
      if (this.ui.cooldowns[type] !== ratio) this.ui.cooldowns[type] = ratio
    }
    const progress = Math.round(Math.min(1, this.time / this.finalAt) * 100) / 100
    if (this.ui.progress !== progress) this.ui.progress = progress
  }

  checkEnd() {
    if (this.ui.status !== 'playing') return
    const done = this.nextWave >= this.level.waves.length && !this.spawnQueue.length && !this.enemies.length
    if (done) this.ui.status = 'won'
  }

  // ---------------------------------------------------------------- entrées

  toCanvas(evt) {
    const r = this.canvas.getBoundingClientRect()
    return { x: ((evt.clientX - r.left) * WIDTH) / r.width, y: ((evt.clientY - r.top) * HEIGHT) / r.height }
  }

  cellAt({ x, y }) {
    const col = Math.floor((x - BOARD_X) / CELL)
    const row = Math.floor(y / CELL)
    return col >= 0 && col < COLS && row >= 0 && row < ROWS ? { row, col } : null
  }

  pointerMove(evt) {
    const p = this.toCanvas(evt)
    this.hover = this.cellAt(p)
    this.overDrop = !!this.dropAt(p)
    this.canvas.style.cursor = this.overDrop ? 'pointer' : ''
  }

  pointerLeave() {
    this.hover = null
  }

  dropAt(p) {
    return this.drops.findLast((d) => !d.collecting && Math.hypot(d.x - p.x, d.y - p.y) < 34)
  }

  click(evt) {
    if (this.ui.paused || this.ui.status !== 'playing') return
    const p = this.toCanvas(evt)
    const drop = this.dropAt(p)
    if (drop) return this.collect(drop)

    const cell = this.cellAt(p)
    const sel = this.ui.selected
    if (!cell || !sel) return
    if (sel === 'shovel') {
      const d = this.grid[cell.row][cell.col]
      if (d) {
        this.removeDefender(d)
        this.dirt(d.x, d.y + 26)
        play('shovel')
      }
      this.ui.selected = null
    } else if (this.plant(sel, cell.row, cell.col)) {
      this.ui.selected = null
    }
  }

  // ---------------------------------------------------------------- rendu

  render() {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) {
      const k = this.shake * 22
      ctx.translate(rand(-k, k), rand(-k, k))
    }
    this.drawBoard(ctx)
    this.drawHover(ctx)
    for (const d of this.allDefenders()) this.drawDefender(ctx, d)
    for (const e of [...this.enemies].sort((a, b) => a.y - b.y)) this.drawEnemy(ctx, e)
    for (const p of this.projectiles) this.drawProjectile(ctx, p)
    for (const f of this.effects) this.drawEffect(ctx, f)
    for (const p of this.particles) this.drawParticle(ctx, p)
    for (const d of this.drops) this.drawDrop(ctx, d)
    for (const t of this.texts) this.drawText(ctx, t)
    ctx.restore()
    this.drawDanger(ctx)
  }

  drawParticle(ctx, p) {
    const alpha = Math.min(1, (p.life / p.max) * 1.5)
    if (p.emoji) {
      this.emoji(ctx, p.emoji, p.x, p.y, p.size, { alpha, rotate: p.rot })
      return
    }
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  drawText(ctx, t) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, (t.life / t.max) * 2)
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,0,.5)'
    ctx.strokeText(t.text, t.x, t.y)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x, t.y)
    ctx.restore()
  }

  drawDanger(ctx) {
    if (this.danger < 0.02) return
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 8)
    const g = ctx.createLinearGradient(0, 0, 220, 0)
    g.addColorStop(0, `rgba(229,57,53,${0.45 * this.danger * pulse})`)
    g.addColorStop(1, 'rgba(229,57,53,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 220, HEIGHT)
  }

  drawBoard(ctx) {
    // zone d'arrivée
    ctx.fillStyle = '#4f7d33'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    for (const d of this.decor) this.emoji(ctx, d.e, d.x, d.y, 22, { alpha: 0.55 })

    // pelouse en damier
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#7cb342' : '#8bc34a'
        if (r % 2) ctx.fillStyle = (r + c) % 2 ? '#74ab3c' : '#83bb44'
        if (!this.lanes.includes(r)) ctx.fillStyle = (r + c) % 2 ? '#9c7b5a' : '#a58463' // rangée en friche
        ctx.fillRect(BOARD_X + c * CELL, r * CELL, CELL, CELL)
      }
    }
    if (this.level.night) {
      ctx.fillStyle = 'rgba(30,30,90,.35)'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      this.emoji(ctx, '🌙', WIDTH - 48, 40, 34)
    }

    // bande de terre + palissade + cabane
    ctx.fillStyle = '#8d6e4f'
    ctx.fillRect(0, 0, BOARD_X, HEIGHT)
    ctx.fillStyle = '#6d4c33'
    for (let y = 0; y < HEIGHT; y += 24) ctx.fillRect(BOARD_X - 14, y + 2, 10, 20)
    ctx.fillRect(BOARD_X - 16, 0, 2, HEIGHT)
    this.emoji(ctx, '🛖', 30, HEIGHT / 2, 46)
  }

  drawHover(ctx) {
    const sel = this.ui.selected
    if (!this.hover || !sel || this.ui.status !== 'playing') return
    const { row, col } = this.hover
    if (!this.lanes.includes(row)) return
    const occupant = this.grid[row][col]
    const { x, y } = cellCenter(row, col)

    if (sel === 'shovel') {
      if (!occupant) return
      ctx.fillStyle = 'rgba(229,57,53,.3)'
      ctx.fillRect(BOARD_X + col * CELL, row * CELL, CELL, CELL)
      return
    }
    if (occupant) return
    if (this.defs[sel].explode) {
      const range = this.defs[sel].explode.range
      ctx.fillStyle = 'rgba(255,152,0,.15)'
      ctx.fillRect(x - CELL * range, y - CELL * 1.5, CELL * range * 2, CELL * 3)
    }
    ctx.fillStyle = 'rgba(255,255,255,.2)'
    ctx.fillRect(BOARD_X + col * CELL, row * CELL, CELL, CELL)
    this.emoji(ctx, this.defs[sel].emoji, x, y, 58, { alpha: 0.5 })
  }

  drawDefender(ctx, d) {
    this.shadow(ctx, d.x, d.y + 30, 26)
    const opts = { flash: d.hitFlash > 0 }
    if (d.type === 'rosee') {
      opts.scaleY = 1 + Math.sin(d.anim * 3) * 0.05
      if (d.timer < 1) opts.glow = 'rgba(255,241,118,.8)'
    } else if (d.type === 'tomate') {
      opts.scaleX = 1 - d.recoil * 0.8
      opts.scaleY = 1 + d.recoil * 0.6
    } else if (d.type === 'piment') {
      const k = 1 - d.timer / d.def.explode.fuse
      opts.scaleX = opts.scaleY = 1 + k * 0.5
      opts.rotate = Math.sin(d.anim * 40) * 0.15 * k
      opts.glow = `rgba(255,87,34,${k})`
    }
    // apparition avec un léger rebond
    const k = Math.min(1, d.born / 0.3)
    const pop = 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2
    opts.scaleX = (opts.scaleX ?? 1) * pop
    opts.scaleY = (opts.scaleY ?? 1) * pop
    this.emoji(ctx, d.def.emoji, d.x, d.y + (1 - pop) * 20, 58, opts)
    if (d.hp < d.def.hp && !d.def.explode) this.hpBar(ctx, d.x, d.y + 40, d.hp / d.def.hp, '#66bb6a')
  }

  drawEnemy(ctx, e) {
    const bob = (e.eating ? 0 : Math.sin(e.wobble) * 3) - (e.lift || 0)
    this.shadow(ctx, e.x, e.y + 26, e.def.size * 0.45)
    this.emoji(ctx, e.def.emoji, e.x, e.y + bob, e.def.size, {
      rotate: e.eating ? Math.sin(e.wobble) * 0.18 : 0,
      flash: e.hitFlash > 0,
    })
    if (e.hp < e.def.hp) this.hpBar(ctx, e.x, e.y + bob - e.def.size / 2 - 6, e.hp / e.def.hp, '#ef5350')
  }

  drawProjectile(ctx, p) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#c62828'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p.x - 2, p.y - 2, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffcdd2'
    ctx.fill()
  }

  drawDrop(ctx, d) {
    const alpha = d.landed ? Math.min(1, d.life / 2) : 1
    const pulse = d.landed && !d.collecting ? 1 + Math.sin(this.time * 5) * 0.06 : 1
    this.emoji(ctx, '💧', d.x, d.y, 34, { alpha, scaleX: pulse, scaleY: pulse, glow: 'rgba(179,229,252,.9)' })
  }

  drawEffect(ctx, f) {
    const k = f.t / f.dur
    ctx.save()
    if (f.kind === 'splash') {
      ctx.globalAlpha = 1 - k
      ctx.strokeStyle = '#ff7043'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(f.x, f.y, 4 + k * 14, 0, Math.PI * 2)
      ctx.stroke()
    } else if (f.kind === 'puff') {
      this.emoji(ctx, '💨', f.x, f.y - k * 20, 34, { alpha: 1 - k })
    } else if (f.kind === 'boom') {
      const radius = CELL * 1.6 * Math.min(1, k * 2)
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius)
      g.addColorStop(0, `rgba(255,235,59,${1 - k})`)
      g.addColorStop(0.5, `rgba(255,112,67,${0.8 * (1 - k)})`)
      g.addColorStop(1, 'rgba(255,87,34,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(f.x, f.y, radius, 0, Math.PI * 2)
      ctx.fill()
      this.emoji(ctx, '💥', f.x, f.y, 80 + k * 40, { alpha: 1 - k })
    }
    ctx.restore()
  }

  shadow(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,.18)'
    ctx.beginPath()
    ctx.ellipse(x, y, w, w * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  hpBar(ctx, x, y, ratio, color) {
    ctx.fillStyle = 'rgba(0,0,0,.45)'
    ctx.fillRect(x - 20, y - 3, 40, 6)
    ctx.fillStyle = color
    ctx.fillRect(x - 19, y - 2, 38 * Math.max(0, ratio), 4)
  }

  emoji(ctx, char, x, y, size, { alpha = 1, scaleX = 1, scaleY = 1, rotate = 0, flash = false, glow } = {}) {
    ctx.save()
    ctx.translate(x, y)
    if (rotate) ctx.rotate(rotate)
    ctx.scale(scaleX, scaleY)
    ctx.globalAlpha = alpha
    if (glow) {
      ctx.shadowColor = glow
      ctx.shadowBlur = 16
    }
    if (flash) ctx.filter = 'brightness(1.8)'
    ctx.fillStyle = '#000' // l'alpha du fillStyle s'applique aussi aux emojis couleur
    ctx.font = `${size}px ${EMOJI_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, 0, 0)
    ctx.restore()
  }
}
