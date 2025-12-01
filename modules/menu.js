export class Menu {
  constructor() {
    this.onNew = null;
    this.bind();
  }
  bind() {
    // external triggers call triggerNew
  }
  triggerNew() {
    if (this.onNew) this.onNew();
  }
}
