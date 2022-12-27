<script setup lang="ts">
import { Smoother } from './game/smoother'
import { useConfigStore } from './stores/config'

const store = useConfigStore()
store.$subscribe((mutation, state) => {
  Smoother.increament = 1 / state.animationSpeed

  localStorage.setItem('config', JSON.stringify(state))
})

const save = localStorage.getItem('config')
if (save) {
  const obj = JSON.parse(save)
  store.$patch({
    animationSpeed: obj.animationSpeed,
    actionSpeed: obj.actionSpeed,
  })
}
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
