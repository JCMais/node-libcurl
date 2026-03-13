const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  makeCurlRequest: (url) => ipcRenderer.invoke('make-curl-request', url),
})
