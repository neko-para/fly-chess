<script setup lang="ts">
import { computed, defineProps } from 'vue'
import { ChessGame, PlayerClient } from '@/game/game'
import type { PlayerID, ChessID } from '@/game/types'
import { SlaveGame } from '@nekosu/game-framework'

const props = defineProps<{
  client: PlayerClient
}>()

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
  [2, 0, 140, 180]
]

const startPlace: [number, number][] = [
  [40, 40],
  [40, 60],
  [60, 40],
  [60, 60]
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
  [160, 180]
]

const boardType = ['#rectItem', '#triItem', '#squareItem']
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

const chessData = computed<
  [number, number, string, PlayerID, ChessID, number][]
>(() => {
  const res: [number, number, string, PlayerID, ChessID, number][] = []
  const st = new Set<string>()
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const pos = (
        props.client.slave as SlaveGame<ChessID, PlayerID, ChessGame>
      ).game.data.chess[i as PlayerID][j as ChessID]
      let [x, y] = remap(
        i as PlayerID,
        pos >= 0 ? placeMapping[pos] : startPlace[j]
      )
      while (st.has(`${x}${y}`)) {
        x += 2
        y -= 2
      }
      st.add(`${x}${y}`)
      res.push([x, y, colors[i], i as PlayerID, j as ChessID, pos])
    }
  }
  return res
})

function clickChess(idx: number) {
  const [x, y, c, i, j, pos] = chessData.value[idx]
  if (i !== 0) {
    return
  }
  props.client.choose(j)
}
</script>

<template>
  <svg width="360" height="360" view-box="0 0 360 360">
    <rect x="0" y="0" width="360" height="360" fill="wheat"></rect>
    <defs>
      <g id="rectItem">
        <rect x="-20" y="-10" width="40" height="20" stroke="black"></rect>
        <!-- <circle r="8" fill="white" stroke="black"></circle> -->
      </g>
      <g id="triItem">
        <path d="M 0 0 L 40 0 L 0 40 z" stroke="black"></path>
        <!-- <circle cx="12" cy="12" r="8" fill="white" stroke="black"></circle> -->
      </g>
      <g id="squareItem">
        <rect x="-10" y="-10" width="20" height="20" stroke="black"></rect>
        <!-- <circle r="8" fill="white" stroke="black"></circle> -->
      </g>
      <g id="arrowItem">
        <path d="M -2 -10 L 2 -10 L 2 0 L 4 0 L 0 10 L -4 0 L -2 0 z"></path>
      </g>
      <g id="chess">
        <circle r="8" fill="white" stroke="black"></circle>
        <circle r="5"></circle>
      </g>
      <g id="partofBoard" stroke-linejoin="round">
        <use
          v-for="(dat, i) in boardData"
          :key="`board-item-${i}`"
          :xlink:href="boardType[dat[0]]"
          :transform="`translate(${dat[2]}, ${dat[3]}) rotate(${90 * dat[1]})`"
        ></use>
        <circle cx="15" cy="105" r="8" fill="white" stroke="black"></circle>
        <rect x="20" y="20" width="60" height="60"></rect>
        <circle cx="40" cy="40" r="8" fill="white" stroke="black"></circle>
        <circle cx="40" cy="60" r="8" fill="white" stroke="black"></circle>
        <circle cx="60" cy="40" r="8" fill="white" stroke="black"></circle>
        <circle cx="60" cy="60" r="8" fill="white" stroke="black"></circle>
        <path d="M 150 150 L 180 180 L 150 210 z" stroke="black"></path>
        <use
          xlink:href="#arrowItem"
          transform="translate(260, 150)"
          stroke="black"
        ></use>
        <use
          xlink:href="#arrowItem"
          transform="translate(260, 210)"
          stroke="black"
        ></use>
      </g>
    </defs>
    <use
      v-for="(color, i) in colors"
      :key="`board-${i}`"
      xlink:href="#partofBoard"
      :fill="color"
      :stroke="client.slave?.game.data.current === i ? 'yellow' : 'black'"
      :transform="`translate(180, 180) rotate(${i * 90}) translate(-180, -180)`"
    ></use>
    <use
      v-for="(dat, i) in chessData"
      :key="`chess-${i}`"
      xlink:href="#chess"
      :fill="dat[2]"
      :stroke="dat[2]"
      :transform="`translate(${dat[0]}, ${dat[1]})`"
      style="transition: all 0.2s"
      @click="clickChess(i)"
    ></use>
    <text
      :x="[0, 3].includes(client.data.current) ? 5 : 343"
      :y="client.data.current < 2 ? 20 : 356"
      font-family="consolas"
      font-size="20"
    >
      {{ client.data.roll }}
    </text>
  </svg>
</template>
