import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
  const animationSpeed = ref(40)
  const actionSpeed = ref(1000)

  return {
    animationSpeed,
    actionSpeed,
  }
})
