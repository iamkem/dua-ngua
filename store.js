const Store = require("electron-store");

const store = new Store();

class StoreManager {
  static getStore = () => store;

  static get(key) {
    return store.get(key);
  }

  static set(key, value) {
    store.set(key, value);
  }

  static delete(key) {
    store.delete(key);
  }

  static clear() {
    store.clear();
  }
}

module.exports = StoreManager;
