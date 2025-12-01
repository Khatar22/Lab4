// modules/player.js
export class Player {
  constructor() {
    this.party = [];
    this.inventory = { pokeball: 10, greatball: 2, potion: 3 };
    this.activeIndex = 0;
  }

  chooseStarter(pokemon) {
    this.party = [pokemon];
    this.activeIndex = 0;
  }

  addToParty(pokemon) {
    if (this.party.length >= 3) return false;
    this.party.push(pokemon);
    return true;
  }

  canCatch() {
    return this.party.length < 3;
  }

  switchTo(index) {
    if (index < 0 || index >= this.party.length) return false;
    if (index === this.activeIndex) return false; // запрещаем переключение на того же
    this.activeIndex = index;
    return true;
  }

  get active()
  {
    return this.party[this.activeIndex];
  }
}
