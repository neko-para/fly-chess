<script setup lang="ts">
import { Decompress } from '@nekosu/game-framework'
import ChessGame from '@/components/ChessGame.vue'
import { PureEvaluateAI } from '@/game/ai'
import { ChessAIClient, LocalGame, PlayerClient } from '@/game/game'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import type { GameConfig } from '@/game/types'
const router = useRouter()
const route = useRoute()

const config = Decompress<GameConfig>(route.query.config as string) || {
  seed: '0',
  group: [0, 1, 2, 3],
}

const game = new LocalGame(config, [
  sg => new PlayerClient(sg),
  sg => new ChessAIClient(sg, new PureEvaluateAI()),
  sg => new ChessAIClient(sg, new PureEvaluateAI()),
  sg => new ChessAIClient(sg, new PureEvaluateAI()),
])

game.start()

function backToMenu() {
  router.push({
    name: 'config',
  })
}
</script>

<template>
  <v-card class="ma-1 d-flex flex-column">
    <v-card-actions>
      <v-btn color="red" @click="backToMenu()">返回</v-btn>
    </v-card-actions>
    <v-card-text> 当前种子: {{ route.query.seed }} </v-card-text>
    <v-card-text>
      排名:
      {{
        game.games[0].data.order
          .map(i => '红黄蓝绿'.substring(i, i + 1))
          .join(' ')
      }}
    </v-card-text>
    <chess-game
      :client="(game.games[0].clients[0] as PlayerClient)"
    ></chess-game>
  </v-card>
</template>
