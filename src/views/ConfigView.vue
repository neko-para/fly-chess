<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Compress } from '@nekosu/game-framework'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const router = useRouter()

const gameType = ref(0)
const gameConfig = reactive({
  seed: Math.random().toString().substring(2, 8),
  group: computed(() => {
    return gameType.value === 0 ? [0, 1, 2, 3] : [0, 1, 0, 1]
  }),
})

function launch() {
  router.push({
    name: 'game',
    query: {
      config: Compress(gameConfig),
    },
  })
}
</script>

<template>
  <v-card class="ma-1">
    <v-card-title>配置</v-card-title>
    <v-card-text>
      <v-text-field
        hide-details
        label="种子"
        v-model="gameConfig.seed"
      ></v-text-field>
      <v-radio-group hide-details v-model="gameType" inline>
        <v-radio label="1v1v1v1" :value="0"></v-radio>
        <v-radio label="2v2" :value="1"></v-radio>
      </v-radio-group>
      <v-text-field
        hide-details
        label="每步延时"
        v-model="config.actionSpeed"
        suffix="ms"
      ></v-text-field>
      <v-text-field
        hide-details
        label="动画速度"
        v-model="config.animationSpeed"
      ></v-text-field>
    </v-card-text>
    <v-card-actions>
      <v-btn color="red" @click="launch()">开始</v-btn>
    </v-card-actions>
  </v-card>
</template>
