const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const argv = process.argv;
var mainWindow = null;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
		height: 780,
		frame: true,
		icon: path.join(__dirname, '/resources/filmstrip.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/renderer/player.html')
}

app.on('ready', createWindow)

ipcMain.on('request-cmd-argv', (event, arg) => {
  event.reply('response-cmd-argv', argv)
})

ipcMain.on('toggle-dev-tools', (event, annotationMode) => {
  if(annotationMode && !mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.toggleDevTools()
  }
  else if(!annotationMode && mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.toggleDevTools()
  }
})
