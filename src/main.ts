import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

// onOpenUrl((urls) => {
//   console.log("deeplink urls:", urls);
// })

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
