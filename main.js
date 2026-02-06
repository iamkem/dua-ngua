const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");

let mainWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true, // Cho phép sử dụng Node.js trong renderer process
      contextIsolation: false, // Tắt context isolation
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");

  // mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", () => {
  createMainWindow();

  Store.initRenderer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.on("save-user-name", (event, name) => {
  // store.set("name", name);
});

ipcMain.on("get-user-name", () => {
  // return store.get("name");
});
