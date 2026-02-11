const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const Store = require("electron-store");

const isDev = !app.isPackaged;

let mainWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev, // Chặn DevTools hoàn toàn khi production
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

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
