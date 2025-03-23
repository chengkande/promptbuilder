<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

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
  return marked(outputMarkdown.value) as string
})

// Add from clipboard
const addFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      const id = Date.now().toString()
      const name = `Attachment_${attachments.value.length + 1}`
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
      // Support more text-based file types
      const supportedTypes = [
        'text/plain',
        'text/markdown',
        'application/json',
        'text/javascript',
        'text/html',
        'text/css'
      ]
      
      const isTextFile = supportedTypes.includes(file.type) || 
        /\.(txt|md|json|js|ts|html|css|vue)$/i.test(file.name)
      
      if (isTextFile) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5)
            attachments.value.push({
              id,
              name: file.name,
              content: e.target?.result as string || ''
            })
          } catch (error) {
            console.error('Error processing file:', error)
            alert(`无法处理文件 ${file.name}: ${error}`)
          }
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
          alert(`读取文件 ${file.name} 时发生错误`)
        }
        reader.readAsText(file)
      } else {
        alert(`不支持的文件类型: ${file.name}`)
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
    attachmentName.value = attachment.name
    attachmentContent.value = attachment.content
  }
}

// Real-time update attachment name
const updateAttachmentName = (name: string) => {
  if (selectedAttachmentId.value) {
    const index = attachments.value.findIndex(a => a.id === selectedAttachmentId.value)
    if (index !== -1) {
      attachments.value[index].name = name
    }
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
    alert('Copied to clipboard!')
  } catch (err) {
    alert('Copy failed: ' + err)
  }
}

// Toggle preview
const togglePreview = () => {
  showPreview.value = !showPreview.value
}
</script>

<template>
  <div 
    class="app-container" 
    @dragover.prevent="handleDragOver" 
    @drop.prevent="handleDrop"
    @dragenter.prevent
  >
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
              <div class="attachment-name">{{ attachment.name }}</div>
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
            <input
              v-model="attachmentName"
              placeholder="Attachment name"
              class="attachment-name-input"
              @input="updateAttachmentName(attachmentName)"
            />
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
            <button @click="togglePreview" class="btn">{{ showPreview ? 'Show Markdown' : 'Preview' }}</button>
            <button @click="copyToClipboard" class="btn">Copy to Clipboard</button>
          </div>
          <div class="total-length">Total: {{ totalOutputLength }} characters</div>
        </div>
        
        <div class="output-content">
          <div v-if="!showPreview" class="markdown-output">
            <pre>{{ outputMarkdown }}</pre>
          </div>
          <div v-else class="preview-output" v-html="previewHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f4f5f7;
}

#app {
  height: 100%;
  width: 100%;
}

.app-container {
  width: 100%;
  height: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

h1 {
  text-align: center;
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
  display: flex;
  flex-direction: row;
  gap: 10px;
  flex: 1;
  min-height: 0;
  height: calc(100% - 45px);
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 50%;
  height: 100%;
  overflow: hidden;
}

.prompt-section {
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 30%;
}

.prompt-textarea {
  width: 100%;
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  min-height: 0;
}

.char-count {
  margin-top: 5px;
  text-align: right;
  font-size: 12px;
  color: #777;
}

.attachments-section {
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 30%;
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
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  min-height: 0;
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
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.attachment-name-input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-left: 10px;
}

.attachment-content-textarea {
  width: 100%;
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  min-height: 0;
  overflow-y: auto;
}

.output-section {
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.markdown-output pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 14px;
}

.preview-output {
  font-size: 14px;
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
    flex-direction: column;
    height: calc(100% - 45px);
  }
  
  .input-section {
    width: 100%;
    height: 50%;
  }
  
  .output-section {
    width: 100%;
    height: 50%;
  }
  
  .prompt-section {
    height: 30%;
  }
  
  .attachments-section {
    height: 30%;
  }
}
</style>
