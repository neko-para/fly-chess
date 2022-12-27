<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const router = useRouter()
const seed = ref(Math.random().toString().substring(2, 8))

function launch() {
  router.push({
    name: 'game',
    query: {
      seed: seed.value,
    },
  })
}
</script>

<template>
  <v-card class="ma-1">
    <v-card-title>配置</v-card-title>
    <v-card-text>
      <v-text-field hide-details label="种子" v-model="seed"></v-text-field>
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
