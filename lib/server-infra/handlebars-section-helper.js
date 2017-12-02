"use strict";
const handlebars = require("handlebars");

module.exports = function (name, options) {
  if (!this._sections) {
    this._sections = Object.create(null);
  }

  this._sections[name] = new handlebars.SafeString(options.fn(this));
  return null;
};
