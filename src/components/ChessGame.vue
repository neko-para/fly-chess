<script setup lang="ts">
import { ref, onMounted, watch, markRaw, computed, reactive } from 'vue'
import { Smoother } from '@/game/smoother'
import type { PlayerClient } from '@/game/game'
import type { ChessID, PlayerID } from '@/game/types'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const props = defineProps<{
  client: PlayerClient
}>()

const size = Math.floor((document.body.clientWidth - 5) / 10 - 1) * 10
const canvasEl = ref<HTMLCanvasElement | null>(null)

const test = new Smoother()
onMounted(() => {
  const ctx = canvasEl.value?.getContext('2d') as CanvasRenderingContext2D
  setInterval(draw(ctx), 1000 / 20)
  test.push({
    x: 20,
    y: 30,
  })
  test.push({
    x: 50,
    y: 70,
  })
  test.push({
    x: 100,
    y: 0,
  })
})

const boardData = [
  [0, 1, 60, 110],
  [0, 0, 110, 80],
  [0, 1, 160, 30],
  [0, 0, 330, 140],
  [0, 0, 330, 220],
  [0, 1, 160, 330],
  [0, 0, 110, 280],
  [0, 1, 60, 250],
  [0, 0, 30, 180],
  [1, 3, 230, 50],
  [1, 2, 270, 130],
  [1, 1, 270, 230],
  [1, 0, 230, 310],
  [2, 0, 60, 180],
  [2, 0, 80, 180],
  [2, 0, 100, 180],
  [2, 0, 120, 180],
  [2, 0, 140, 180],
]

const placeMapping: [number, number][] = [
  [15, 105],
  [38, 118],
  [60, 110],
  [80, 110],
  [102, 118],
  [118, 102],
  [110, 80],
  [110, 60],
  [118, 38],
  [140, 30],
  [160, 30],
  [180, 30],
  [200, 30],
  [220, 30],
  [242, 38],
  [250, 60],
  [250, 80],
  [242, 102],
  [258, 118],
  [280, 110],
  [300, 110],
  [322, 118],
  [330, 140],
  [330, 160],
  [330, 180],
  [330, 200],
  [330, 220],
  [322, 242],
  [300, 250],
  [280, 250],
  [258, 242],
  [242, 258],
  [250, 280],
  [250, 300],
  [242, 322],
  [220, 330],
  [200, 330],
  [180, 330],
  [160, 330],
  [140, 330],
  [118, 322],
  [110, 300],
  [110, 280],
  [118, 258],
  [102, 242],
  [80, 250],
  [60, 250],
  [38, 242],
  [30, 220],
  [30, 200],
  [30, 180],
  [60, 180],
  [80, 180],
  [100, 180],
  [120, 180],
  [140, 180],
  [160, 180],
]

const startPlace: [number, number][] = [
  [40, 40],
  [40, 60],
  [60, 40],
  [60, 60],
]

const colors = ['#FF3F3F', '#CFCF00', '#00CFFF', '#00CF00']

function remap(i: PlayerID, p: [number, number]): [number, number] {
  const [x, y] = p
  switch (i) {
    case 0:
      return [x, y]
    case 1:
      return [360 - y, x]
    case 2:
      return [360 - x, 360 - y]
    case 3:
      return [y, 360 - x]
  }
}

function getPos(p: PlayerID, c: ChessID, x: number) {
  if (x >= 0) {
    return remap(p, placeMapping[x])
  } else {
    return remap(p, startPlace[c])
  }
}

const chesses: {
  pos: Smoother
  player: PlayerID
  chess: ChessID
  place: number
}[] = []

function draw(ctx: CanvasRenderingContext2D): () => void {
  const bg = new Path2D()
  bg.rect(0, 0, 360, 360)

  const ball = new Path2D()
  ball.ellipse(0, 0, 8, 8, 0, 0, Math.PI * 2)

  const rectItem = new Path2D()
  rectItem.rect(-20, -10, 40, 20)

  const triItem = new Path2D('M 0 0 L 40 0 L 0 40 z')

  const squareItem = new Path2D()
  squareItem.rect(-10, -10, 20, 20)

  const boardPaths = [rectItem, triItem, squareItem]

  const arrowItem = new Path2D(
    'M -2 -10 L 2 -10 L 2 0 L 4 0 L 0 10 L -4 0 L -2 0 z'
  )

  const setupAreaItem = new Path2D()
  setupAreaItem.rect(20, 20, 60, 60)

  const finishAreaItem = new Path2D('M 150 150 L 180 180 L 150 210 z')

  const centerRotate = (deg: number) => {
    ctx.translate(180, 180)
    ctx.rotate((deg * Math.PI) / 180)
    ctx.translate(-180, -180)
  }

  const scope = (act: () => void) => {
    ctx.save()
    act()
    ctx.restore()
  }

  const put = (
    path: Path2D,
    opt: {
      translate?: {
        x: number
        y: number
      }
      rotate?: number
      fill?: string
      stroke?: string
    }
  ) => {
    scope(() => {
      if (opt.translate) {
        ctx.translate(opt.translate.x, opt.translate.y)
      }
      if (opt.rotate) {
        ctx.rotate((opt.rotate * Math.PI) / 180)
      }
      if (opt.fill) {
        ctx.fillStyle = opt.fill
        ctx.fill(path)
      }
      if (opt.stroke) {
        ctx.strokeStyle = opt.stroke
        ctx.stroke(path)
      }
    })
  }

  const data = props.client.slave.game.data

  for (let p = 0; p < 4; p++) {
    for (let c = 0; c < 4; c++) {
      const st = getPos(
        p as PlayerID,
        c as ChessID,
        data.chess[p as PlayerID][c as ChessID]
      )
      const smoother = new Smoother({
        x: st[0],
        y: st[1],
      })
      markRaw(smoother)
      watch(
        () => data.chess[p as PlayerID][c as ChessID],
        value => {
          const pos = getPos(p as PlayerID, c as ChessID, value)
          smoother.push({
            x: pos[0],
            y: pos[1],
          })
        }
      )
      chesses.push(
        reactive({
          pos: smoother,
          player: p as PlayerID,
          chess: c as ChessID,
          place: computed<number>(
            () => data.chess[p as PlayerID][c as ChessID]
          ),
        })
      )
    }
  }

  centerRotate(-90)
  return () => {
    put(bg, {
      fill: 'wheat',
    })

    for (const [i, c] of colors.entries()) {
      scope(() => {
        centerRotate(i * 90)

        for (const item of boardData) {
          put(boardPaths[item[0]], {
            translate: {
              x: item[2],
              y: item[3],
            },
            rotate: item[1] * 90,
            fill: c,
            stroke: 'black',
          })
        }
        put(ball, {
          translate: {
            x: 15,
            y: 105,
          },
          fill: 'white',
          stroke: 'black',
        })
        put(setupAreaItem, {
          fill: c,
          stroke: props.client.data.current === i ? 'yellow' : 'black',
        })
        put(ball, {
          translate: {
            x: 40,
            y: 40,
          },
          fill: 'white',
          stroke: 'black',
        })
        put(ball, {
          translate: {
            x: 40,
            y: 60,
          },
          fill: 'white',
          stroke: 'black',
        })
        put(ball, {
          translate: {
            x: 60,
            y: 40,
          },
          fill: 'white',
          stroke: 'black',
        })
        put(ball, {
          translate: {
            x: 60,
            y: 60,
          },
          fill: 'white',
          stroke: 'black',
        })
        put(finishAreaItem, {
          fill: c,
          stroke: 'black',
        })
        put(arrowItem, {
          translate: {
            x: 260,
            y: 150,
          },
          fill: c,
          stroke: 'black',
        })
        put(arrowItem, {
          translate: {
            x: 260,
            y: 210,
          },
          fill: c,
          stroke: 'black',
        })
      })

      const st = new Set<string>()
      chesses.forEach(s => {
        scope(() => {
          const pos = s.pos.get()
          if (!s.pos.moving) {
            while (st.has(`${pos.x},${pos.y}`)) {
              pos.x += 2
              pos.y += 3
            }
            st.add(`${pos.x},${pos.y}`)
          }
          const { x, y } = pos
          ctx.translate(x, y)
          ctx.fillStyle = 'white'
          ctx.fill(ball)
          ctx.stroke(ball)
          ctx.fillStyle = colors[s.player]
          ctx.beginPath()
          ctx.ellipse(0, 0, 5, 5, 0, 0, Math.PI * 2)
          ctx.closePath()
          ctx.fill()
        })
      })

      ctx.font = '16pt consolas'
      scope(() => {
        const pos = remap(
          ((props.client.data.current + 3) % 4) as PlayerID,
          [10, 10]
        )
        centerRotate(90)
        ctx.fillStyle = 'red'
        ctx.fillText(props.client.data.roll.toString(), pos[0] - 5, pos[1] + 5)
      })
    }
  }
}

function onClick(ev: MouseEvent) {
  let choice: ChessID | -1 = -1
  for (let i = 0; i < 4; i++) {
    const cp = getPos(
      3,
      i as ChessID,
      props.client.slave.game.data.chess[0][i as ChessID]
    )
    const dx = ev.offsetX - cp[0]
    const dy = ev.offsetY - cp[1]
    if (dx * dx + dy * dy < 144) {
      choice = i as ChessID
      break
    }
  }
  if (choice === -1) {
    return
  }
  props.client.choose(choice)
}

props.client.clientSlot.bind(async msg => {
  if (msg.msg === 'end' && !props.client.slave.game.data.fin[0]) {
    await Promise.all(
      chesses
        .map(c => c.pos.wait())
        .concat([
          new Promise(resolve => setTimeout(resolve, config.actionSpeed)),
        ])
    )
  }
})
</script>

<template>
  <div class="ma-auto">
    <canvas
      ref="canvasEl"
      :style="{
        width: `${size}px`,
        height: `${size}px`,
      }"
      width="360"
      height="360"
      @click="onClick"
    ></canvas>
  </div>
</template>
