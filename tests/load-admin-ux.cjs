/**
 * Load admin-ux.js into a Node sandbox and return window.KNAdminUX.
 * Avoids a browser; stubs only the DOM APIs the IIFE registers on.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadAdminUx() {
  const file = path.join(__dirname, "..", "admin-ux.js");
  const code = fs.readFileSync(file, "utf8");
  const window = {
    localStorage: {
      _data: Object.create(null),
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
      },
      setItem(key, value) {
        this._data[key] = String(value);
      },
      removeItem(key) {
        delete this._data[key];
      }
    }
  };
  const document = {
    addEventListener() {},
    dispatchEvent() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const sandbox = {
    window,
    document,
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Number,
    String,
    Array,
    Set,
    Map,
    Object,
    Boolean,
    JSON,
    Error
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(code, sandbox, { filename: "admin-ux.js" });
  if (!window.KNAdminUX) {
    throw new Error("KNAdminUX failed to load");
  }
  return window.KNAdminUX;
}

module.exports = { loadAdminUx };
