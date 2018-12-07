
const path = require("path");
const { app, BrowserWindow } = require('electron');

app.commandLine.appendSwitch('ignore-gpu-blacklist');

const isDev = () => {
    return process.mainModule.filename.indexOf('app.asar') === -1;
};

const indexPath = isDev() ? './dev.html' : './index.html';

if (isDev()) { require('electron-reload')([path.join(__dirname)]); }

let mainWindow;

function createWindow() {

    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'assets', 'img', 'logo.png'),
        width: 800,
        height: 600
    });
    mainWindow.maximize();
    mainWindow.loadFile(indexPath);

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow();
    }
});
