<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import 'github-markdown-css'

interface Attachment {
  id: string;
  name: string;
  content: string;
}

const promptText = ref<string>('')
const attachments = ref<Attachment[]>([])
const selectedAttachmentId = ref<string | null>(null)
const attachmentName = ref<string>('')
const attachmentContent = ref<string>('')
const showPreview = ref<boolean>(false)
const showCopyTip = ref<boolean>(false)
const copyTipMessage = ref<string>('')
const editingAttachmentId = ref<string | null>(null)
const editingAttachmentName = ref<string>('')

// 初始化marked设置
onMounted(() => {
  marked.setOptions({
    renderer: new marked.Renderer(),
    // @ts-ignore - highlight属性在新版本marked类型定义中可能缺失
    highlight: function(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: true,
    headerPrefix: 'heading-',
    sanitize: false,
    smartLists: true,
    smartypants: true
  });

  // 自定义renderer
  const renderer = new marked.Renderer();
  
  // 增强链接渲染
  // @ts-ignore - 类型兼容性问题，marked的类型定义可能与实际使用不一致
  renderer.link = function(href: string, title: string | null, text: string) {
    // @ts-ignore
    const link = marked.Renderer.prototype.link.call(this, href, title, text);
    return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
  };
  
  // 增强图片渲染
  // @ts-ignore - 类型兼容性问题，marked的类型定义可能与实际使用不一致
  renderer.image = function(href: string, title: string | null, text: string) {
    return `<img src="${href}" alt="${text}" title="${title || text}" class="markdown-img" />`;
  };
  
  // 设置自定义renderer
  marked.use({ renderer });
  
  // 如果已经是预览状态，设置代码复制功能
  if (showPreview.value) {
    nextTick(() => {
      setupCodeCopy()
    })
  }
  
  // 添加全局点击事件处理程序
  document.addEventListener('click', (e) => {
    // 如果正在编辑并且点击的不是输入框，则保存名称
    if (editingAttachmentId.value && !(e.target as HTMLElement).classList.contains('edit-attachment-name')) {
      saveAttachmentName()
    }
  })
})

// Calculate character count
const promptLength = computed(() => promptText.value.length)
const totalAttachmentsLength = computed(() => {
  return attachments.value.reduce((total, attachment) => total + attachment.content.length, 0)
})
const totalOutputLength = computed(() => {
  return promptLength.value + totalAttachmentsLength.value
})

// Generate output markdown
const outputMarkdown = computed(() => {
  let output = promptText.value + '\n\n'
  
  if (attachments.value.length > 0) {
    attachments.value.forEach(attachment => {
      output += `### ${attachment.name}\n\`\`\`\n${attachment.content}\n\`\`\`\n\n`
    })
  }
  
  return output
})

// Preview Markdown HTML
const previewHtml = computed(() => {
  const html = marked(outputMarkdown.value) as string
  return html
})

// 添加复制代码功能
const setupCodeCopy = () => {
  setTimeout(() => {
    const codeBlocks = document.querySelectorAll('.markdown-body pre')
    codeBlocks.forEach((block, index) => {
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn'
      copyBtn.textContent = '复制'
      copyBtn.addEventListener('click', () => {
        const code = block.querySelector('code')?.textContent || ''
        navigator.clipboard.writeText(code)
          .then(() => {
            copyBtn.textContent = '已复制!'
            setTimeout(() => {
              copyBtn.textContent = '复制'
            }, 2000)
          })
          .catch(err => {
            console.error('复制失败:', err)
          })
      })
      
      // 仅当按钮不存在时添加
      if (!block.querySelector('.copy-btn')) {
        if (block instanceof HTMLElement) {
          block.style.position = 'relative'
        }
        block.appendChild(copyBtn)
      }
    })
  }, 100)
}

// 监听预览变化，设置代码复制功能
watch(showPreview, (newVal) => {
  if (newVal) {
    nextTick(() => {
      setupCodeCopy()
    })
  }
})

// 监听markdown内容变化，在预览状态下重新设置代码复制按钮
watch(outputMarkdown, () => {
  if (showPreview.value) {
    nextTick(() => {
      setupCodeCopy()
    })
  }
})

// Add from clipboard
const addFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      const id = Date.now().toString()
      const name = `Untitled_${attachments.value.length + 1}`
      attachments.value.push({ id, name, content: text })
    }
  } catch (err) {
    alert('Unable to get content from clipboard: ' + err)
  }
}

// Handle file drop
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  
  if (event.dataTransfer?.files) {
    Array.from(event.dataTransfer.files).forEach(file => {
      // Only process text files
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 5)
          attachments.value.push({
            id,
            name: file.name,
            content: e.target?.result as string || ''
          })
        }
        reader.readAsText(file)
      }
    })
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

// Select attachment
const selectAttachment = (id: string) => {
  const attachment = attachments.value.find(a => a.id === id)
  if (attachment) {
    selectedAttachmentId.value = id
    attachmentContent.value = attachment.content
  }
}

// Start editing attachment name
const startEditingName = (id: string, name: string) => {
  // 选中附件
  selectAttachment(id)
  // 设置编辑状态
  editingAttachmentId.value = id
  editingAttachmentName.value = name
}

// Save edited attachment name
const saveAttachmentName = () => {
  if (editingAttachmentId.value) {
    const index = attachments.value.findIndex(a => a.id === editingAttachmentId.value)
    if (index !== -1 && editingAttachmentName.value.trim() !== '') {
      attachments.value[index].name = editingAttachmentName.value.trim()
    }
    editingAttachmentId.value = null
  }
}

// Real-time update attachment content
const updateAttachmentContent = (content: string) => {
  if (selectedAttachmentId.value) {
    const index = attachments.value.findIndex(a => a.id === selectedAttachmentId.value)
    if (index !== -1) {
      attachments.value[index].content = content
    }
  }
}

// Delete attachment
const deleteAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id)
  if (selectedAttachmentId.value === id) {
    selectedAttachmentId.value = null
    attachmentName.value = ''
    attachmentContent.value = ''
  }
}

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(outputMarkdown.value)
    copyTipMessage.value = '已复制到剪贴板！'
    showCopyTip.value = true
    setTimeout(() => {
      showCopyTip.value = false
    }, 2000)
  } catch (err) {
    copyTipMessage.value = '复制失败：' + err
    showCopyTip.value = true
    setTimeout(() => {
      showCopyTip.value = false
    }, 3000)
  }
}

// Toggle preview
const togglePreview = () => {
  showPreview.value = !showPreview.value
}
</script>

<template>
  <div class="app-container" @dragover="handleDragOver" @drop="handleDrop">
    <h1>LLM Prompt Builder</h1>
    
    <div class="main-content">
      <div class="input-section">
        <div class="prompt-section">
          <h2>Prompt Input</h2>
          <textarea
            v-model="promptText"
            placeholder="Enter your prompt here..."
            class="prompt-textarea"
          ></textarea>
          <div class="char-count">Characters: {{ promptLength }}</div>
        </div>
        
        <div class="attachments-section">
          <div class="attachments-header">
            <h2>Attachments</h2>
            <div class="attachment-actions">
              <button @click="addFromClipboard" class="btn">Paste</button>
              <div class="dropzone-hint">Drop files</div>
            </div>
          </div>
          
          <div class="attachments-list">
            <div
              v-for="attachment in attachments"
              :key="attachment.id"
              :class="['attachment-item', { 'selected': selectedAttachmentId === attachment.id }]"
              @click="selectAttachment(attachment.id)"
            >
              <div 
                v-if="editingAttachmentId !== attachment.id" 
                class="attachment-name"
                @dblclick="startEditingName(attachment.id, attachment.name)"
              >
                {{ attachment.name }}
              </div>
              <input
                v-else
                v-model="editingAttachmentName"
                class="edit-attachment-name"
                @blur="saveAttachmentName"
                @keyup.enter="saveAttachmentName"
                @click.stop
                ref="editNameInput"
                v-focus
              />
              <div class="attachment-length">{{ attachment.content.length }} chars</div>
              <button @click.stop="deleteAttachment(attachment.id)" class="delete-btn">Delete</button>
            </div>
            <div v-if="attachments.length === 0" class="no-attachments">
              No attachments
            </div>
          </div>
        </div>
        
        <div v-if="selectedAttachmentId" class="attachment-editor">
          <div class="editor-header">
            <h3>Edit Attachment</h3>
          </div>
          <textarea
            v-model="attachmentContent"
            placeholder="Attachment content..."
            class="attachment-content-textarea"
            @input="updateAttachmentContent(attachmentContent)"
          ></textarea>
        </div>
      </div>
      
      <div class="output-section">
        <div class="output-header">
          <h2>Generated Prompt</h2>
          <div class="output-actions">
            <button @click="togglePreview" class="btn">{{ showPreview ? 'Text' : 'Preview' }}</button>
            <button @click="copyToClipboard" class="btn">Copy</button>
          </div>
          <div class="total-length">Total: {{ totalOutputLength }} characters</div>
        </div>
        
        <div class="output-content">
          <div v-if="!showPreview" class="markdown-output">
            <pre>{{ outputMarkdown }}</pre>
          </div>
          <div v-else class="preview-output markdown-body" v-html="previewHtml"></div>
        </div>
      </div>
    </div>
    
    <!-- 复制成功提示 -->
    <div v-if="showCopyTip" class="copy-tip">
      {{ copyTipMessage }}
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box; 
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
}


.app-container {
  width: 100%;
  height: 100%;
  margin-left: 100px;
  margin-right: 100px;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box; /* 确保padding不会导致溢出 */
}

h1 {
  text-align: left;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 1.3rem;
}

h2 {
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 1.1rem;
}

h3 {
  font-size: 1rem;
}

.main-content {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 10px;
  flex: 1;
  overflow: hidden;
  max-width: 100%; /* 确保不超过父容器宽度 */
  box-sizing: border-box;
}

.input-section, .output-section {
  width: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.prompt-section{
  flex: 1;
  height: 40%;
  display: flex;
  flex-direction: column;
}

.attachments-section{
  display: flex;
  flex-direction: column;
  max-height: 30%;
  overflow: auto;
}
.attachment-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompt-textarea{
  flex: 1;
}
.attachment-content-textarea {
  flex: 1;
}

.char-count {
  margin-top: 5px;
  text-align: right;
  font-size: 12px;
  color: #777;
}

.attachments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.attachment-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dropzone-hint {
  font-size: 12px;
  color: #777;
}

.attachments-list {
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: background-color 0.2s;
}

.attachment-item:hover {
  background-color: #eaeaea;
}

.attachment-item.selected {
  background-color: #e1f5fe;
}

.attachment-name {
  flex-grow: 1;
  font-weight: 500;
  cursor: text;
}

.edit-attachment-name {
  flex-grow: 1;
  font-weight: 500;
  padding: 3px 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
  outline: none;
}

.attachment-length {
  font-size: 12px;
  color: #777;
  margin-right: 10px;
}

.delete-btn {
  background-color: #ff5252;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 12px;
}

.no-attachments {
  text-align: center;
  color: #999;
  padding: 10px;
}

.attachment-editor {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.attachment-content-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  overflow-y: auto;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.output-actions {
  display: flex;
  gap: 10px;
}

.total-length {
  font-size: 12px;
  color: #777;
}

.output-content {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  overflow-y: auto;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.markdown-output pre {
  overflow-x: auto;
  max-width: calc(100% - 20px);
  white-space: pre-wrap;
  word-break: break-word;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.preview-output {
  font-size: 14px;
  padding: 16px;
  flex: 1;
}

/* Markdown预览样式 */
.markdown-body {
  box-sizing: border-box;
  min-width: 100%;
  max-width: none;
  margin: 0 auto;
}

.markdown-body pre {
  background-color: #f6f8fa;
  border-radius: 3px;
  padding: 16px;
  overflow: auto;
}

.markdown-body code {
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 3px;
  padding: 0.2em 0.4em;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

.markdown-body pre code {
  background-color: transparent;
  padding: 0;
}

.markdown-body img {
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-body table {
  display: block;
  width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 16px;
  margin-bottom: 16px;
}

.markdown-body table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}

.markdown-body table tr {
  background-color: #ffffff;
  border-top: 1px solid #d0d7de;
}

.markdown-body table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body ul ul,
.markdown-body ul ol,
.markdown-body ol ol,
.markdown-body ol ul {
  margin-top: 0;
  margin-bottom: 0;
}

.markdown-body li {
  word-wrap: break-all;
}

.markdown-body li + li {
  margin-top: 0.25em;
}

.markdown-body blockquote {
  padding: 0 1em;
  color: #57606a;
  border-left: 0.25em solid #d0d7de;
  margin: 0 0 16px 0;
}

.btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 13px;
}

.btn:hover {
  background-color: #2980b9;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .output-section {
    min-height: 300px;
  }
}

@media (min-width: 769px) {
  .output-section {
    min-width: 400px;
  }
}

/* 优化子元素高度分配 */
.prompt-section {
  display: flex;
  flex-direction: column;
}

.attachments-section {
  /* min-height: 150px; */
  /* max-height: 30vh; */
  display: flex;
  flex-direction: column;
}

.attachments-list {
  display: flex;
  flex-direction: column;
}

.attachment-editor {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

/* 优化滚动区域 */
.attachments-list,
.attachment-content-textarea {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 优化移动端体验 */
@media (max-width: 720) {
  .btn {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  h1 {
    font-size: 1.1rem;
  }
  
  h2 {
    font-size: 1rem;
  }
}

/* 代码复制按钮样式 */
.copy-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background-color: #3498db;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.copy-btn:hover {
  opacity: 1;
}

/* 增强图片样式 */
.markdown-body .markdown-img {
  display: block;
  max-width: 100%;
  margin: 16px auto;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 增强链接样式 */
.markdown-body a {
  color: #0969da;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

/* 增强标题样式 */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body h1 {
  padding-bottom: 0.3em;
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body h2 {
  padding-bottom: 0.3em;
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
}

/* 复制提示框样式 */
.copy-tip {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  animation: fadeInOut 2s ease;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(20px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}
</style>

