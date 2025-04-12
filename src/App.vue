<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Markdown from 'vue3-markdown-it'
import 'highlight.js/styles/github.css'

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

// 添加全局点击事件
onMounted(() => {
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
// 添加防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: number | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 修改outputMarkdown计算属性
const isOutputStable = ref(true)
const debouncedOutputMarkdown = ref<string>('')
const updateDebouncedOutput = debounce(() => {
  let output = promptText.value + '\n\n'
  
  if (attachments.value.length > 0) {
    attachments.value.forEach(attachment => {
      output += `### ${attachment.name}\n\`\`\`\n${attachment.content}\n\`\`\`\n\n`
    })
  }
  
  debouncedOutputMarkdown.value = output
  isOutputStable.value = true
}, 500)

// 监听相关数据变化
watch([promptText, attachments], () => {
  isOutputStable.value = false
  updateDebouncedOutput()
}, { deep: true })

// 保存为XML文件
const saveToXML = () => {
  // 创建XML内容
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xmlContent += '<promptBuilder>\n'
  
  // 添加提示词
  xmlContent += `  <prompt><![CDATA[${promptText.value}]]></prompt>\n`
  
  // 添加附件
  if (attachments.value.length > 0) {
    xmlContent += '  <attachments>\n'
    attachments.value.forEach(attachment => {
      xmlContent += `    <attachment>\n`
      xmlContent += `      <name><![CDATA[${attachment.name}]]></name>\n`
      xmlContent += `      <content><![CDATA[${attachment.content}]]></content>\n`
      xmlContent += `    </attachment>\n`
    })
    xmlContent += '  </attachments>\n'
  }
  
  xmlContent += '</promptBuilder>'
  
  // 创建Blob对象
  const blob = new Blob([xmlContent], { type: 'text/xml' })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prompt_builder.xml'
  document.body.appendChild(a)
  a.click()
  
  // 清理
  URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// 打开XML文件
const openFromXML = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  
  const file = input.files[0]
  
  // 限制文件大小为1MB
  const maxSize = 1024 * 1024 // 1MB
  if (file.size > maxSize) {
    alert(`文件 "${file.name}" 太大，不能超过1MB`)
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const xmlText = e.target?.result as string
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
      
      // 解析提示词
      const promptElement = xmlDoc.querySelector('prompt')
      if (promptElement) {
        promptText.value = promptElement.textContent || ''
      }
      
      // 解析附件
      const attachmentElements = xmlDoc.querySelectorAll('attachment')
      if (attachmentElements.length > 0) {
        // 清空现有附件
        attachments.value = []
        
        // 添加新附件
        attachmentElements.forEach(attachmentElement => {
          const nameElement = attachmentElement.querySelector('name')
          const contentElement = attachmentElement.querySelector('content')
          
          if (nameElement && contentElement) {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5)
            attachments.value.push({
              id,
              name: nameElement.textContent || 'Untitled',
              content: contentElement.textContent || ''
            })
          }
        })
      }
    } catch (err) {
      alert('解析XML文件失败: ' + err)
    }
  }
  
  reader.readAsText(file)
  // 重置input，以便可以再次选择同一文件
  input.value = ''
}

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
      // 限制文件大小为1MB
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        alert(`文件 "${file.name}" 太大，不能超过1MB`);
        return;
      }
      
      // 所有文件都作为文本文件处理
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

// 拖拽相关方法
const draggedItem = ref<string | null>(null)
const draggedOverItem = ref<string | null>(null)

// 开始拖拽
const dragStart = (id: string) => {
  draggedItem.value = id
}

// 拖拽结束
const dragEnd = () => {
  draggedItem.value = null
  draggedOverItem.value = null
}

// 拖拽经过某元素
const dragOver = (event: DragEvent, id: string) => {
  event.preventDefault()
  if (id !== draggedItem.value) {
    draggedOverItem.value = id
  }
}

// 拖拽离开某元素
const dragLeave = () => {
  draggedOverItem.value = null
}

// 放置拖拽元素
const drop = (event: DragEvent) => {
  event.preventDefault()
  if (draggedItem.value && draggedOverItem.value) {
    // 找到两个元素的索引
    const draggedIndex = attachments.value.findIndex(item => item.id === draggedItem.value)
    const dropIndex = attachments.value.findIndex(item => item.id === draggedOverItem.value)
    
    if (draggedIndex !== -1 && dropIndex !== -1) {
      // 将元素从原位置移除并插入到新位置
      const [movedItem] = attachments.value.splice(draggedIndex, 1)
      attachments.value.splice(dropIndex, 0, movedItem)
    }
  }
  dragEnd()
}

// 添加空附件
const addEmptyAttachment = () => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5)
  const name = `Untitled_${attachments.value.length + 1}`
  attachments.value.push({ id, name, content: '' })
  
  // 自动选择新创建的附件
  selectAttachment(id)
}

// Copy to clipboard
const copyToClipboard = async () => {
  if (!isOutputStable.value) return;
  
  try {
    await navigator.clipboard.writeText(debouncedOutputMarkdown.value);
    copyTipMessage.value = '已复制到剪贴板！';
    showCopyTip.value = true;
    setTimeout(() => {
      showCopyTip.value = false;
    }, 2000);
  } catch (err) {
    copyTipMessage.value = '复制失败：' + err;
    showCopyTip.value = true;
    setTimeout(() => {
      showCopyTip.value = false;
    }, 3000);
  }
}

// Toggle preview
const togglePreview = () => {
  showPreview.value = !showPreview.value
}

// 用于触发文件选择的ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// 触发文件选择对话框
const triggerFileSelect = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}
</script>

<template>
  <div class="app-container" @dragover="handleDragOver" @drop="handleDrop">
    <h1>LLM Prompt Builder</h1>
    
    <div class="main-content">
      <div class="input-section">
        <div class="prompt-section">
          <div class="prompt-header">
            <h2>Prompt Input</h2>
            <div class="prompt-actions">
              <button @click="saveToXML" class="btn">Save</button>
              <button @click="triggerFileSelect" class="btn">Open</button>
              <input 
                type="file" 
                ref="fileInputRef" 
                @change="openFromXML" 
                accept=".xml" 
                style="display: none;"
              />
            </div>
          </div>
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
              <button @click="addEmptyAttachment" class="add-btn" title="创建新附件">+</button>
              <button @click="addFromClipboard" class="btn">Paste</button>
              <div class="dropzone-hint">Drop files</div>
            </div>
          </div>
          
          <div class="attachments-list">
            <div
              v-for="attachment in attachments"
              :key="attachment.id"
              :class="[
                'attachment-item', 
                { 
                  'selected': selectedAttachmentId === attachment.id,
                  'dragging': draggedItem === attachment.id,
                  'drag-over': draggedOverItem === attachment.id
                }
              ]"
              @click="selectAttachment(attachment.id)"
              draggable="true"
              @dragstart="dragStart(attachment.id)"
              @dragend="dragEnd"
              @dragover="dragOver($event, attachment.id)"
              @dragleave="dragLeave"
              @drop="drop($event)"
            >
              <div class="drag-handle">☰</div>
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
            <button @click="copyToClipboard" class="btn" :disabled="!isOutputStable">Copy</button>
          </div>
          <div class="total-length">Total: {{ totalOutputLength }} characters</div>
        </div>
        
        <div class="output-content">
          <div v-if="!showPreview" class="markdown-output">
            <pre>{{ debouncedOutputMarkdown }}</pre>
          </div>
          <Markdown v-else :source="debouncedOutputMarkdown" class="preview-output" />
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

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.prompt-actions {
  display: flex;
  gap: 10px;
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
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  outline: none;
}

.prompt-textarea:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
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

.attachment-item.dragging {
  opacity: 0.5;
}

.attachment-item.drag-over {
  border: 2px dashed #3498db;
}

.drag-handle {
  cursor: move;
  color: #777;
  margin-right: 8px;
  user-select: none;
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
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  outline: none;
  overflow-y: auto;
}

.attachment-content-textarea:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
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

.add-btn {
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.2s;
  padding: 0;
  line-height: 1;
}

.add-btn:hover {
  background-color: #219653;
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

button.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
