import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useParameterStore = defineStore('parameter', () => {
  const gain = ref(0)

  function setGain(newValue: number) {
    gain.value = newValue
  }

  return { gain, setGain }
})
