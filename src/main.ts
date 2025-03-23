import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 注册全局自定义指令
app.directive('focus', {
  mounted: (el) => {
    el.focus()
  }
})

app.mount('#app')
