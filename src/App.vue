<script setup lang="ts">
import ChessBoard from './components/ChessBoard.vue'
import { PureEvaluateAI } from './game/ai'
import { ChessAIClient, PlayerClient, LocalGame } from './game/game'

const isEval = true

const seed = Math.random().toString()
// const seed = '5'
const game = new LocalGame(seed, [
  new PlayerClient(),
  new ChessAIClient(new PureEvaluateAI()),
  new ChessAIClient(new PureEvaluateAI()),
  new ChessAIClient(new PureEvaluateAI())
])

game.start()

async function main() {
  for (let i = 0; i < 10000; i++) {
    //
  }
}

main()
</script>

<template>
  <chess-board
    :client="(game.games[0].clients[0] as PlayerClient)"
  ></chess-board>
</template>
