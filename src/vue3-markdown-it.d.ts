declare module 'vue3-markdown-it' {
  import { DefineComponent } from 'vue'
  
  const Markdown: DefineComponent<{
    source: string;
    [key: string]: any;
  }>
  
  export default Markdown
} 