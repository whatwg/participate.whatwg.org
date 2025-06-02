/* eslint-disable no-invalid-this */
import handlebars from "handlebars";

export default function sectionHelper(name, options) {
  if (!this._sections) {
    this._sections = Object.create(null);
  }

  this._sections[name] = new handlebars.SafeString(options.fn(this));
  return null;
}
