// modules/battle.js
import { logTo } from './utils.js';

export class Battle {
  constructor(player, enemy, data) {
    this.player = player;
    this.enemy = enemy;
    this.data = data;
    this.onEnd = null;
  }

  start() {
    logTo('#battle-log', `Дикий ${this.enemy.name} появился!`);
    this.render();
  }

  render() {
    const enemyEl = document.getElementById('battle-enemy');
    const playerEl = document.getElementById('battle-player');

    const enemyImg = `assets/images/pokemons/${this.enemy.id}.png`;
    const playerImg = this.player.active
      ? `assets/images/pokemons/${this.player.active.id}.png`
      : '';

    enemyEl.innerHTML = `<img src="${enemyImg}" alt="${this.enemy.name}" width="80" height="80">
      <strong>${this.enemy.name} L${this.enemy.level}</strong>
      <div>HP ${this.enemy.currentHP}/${this.enemy.maxHP}</div>`;

    if (this.player.active) {
      const p = this.player.active;
      playerEl.innerHTML = `<img src="${playerImg}" alt="${p.name}" width="80" height="80">
        <strong>${p.name} L${p.level}</strong>
        <div>HP ${p.currentHP}/${p.maxHP}</div>`;
    } else {
      playerEl.innerHTML = `<strong>Нет активного покемона</strong>`;
    }
  }

  playerActionAttack(moveIndex) {
    const active = this.player.active;
    if (!active || active.currentHP <= 0) {
      logTo('#battle-log', 'Ваш покемон не может атаковать: 0 HP.');
      return;
    }

    const res = active.attack(moveIndex, this.enemy, this.data.types);
    if (!res.success) { logTo('#battle-log', 'Нет PP для этого приёма'); return; }
    logTo('#battle-log', `${active.name} использовал ${res.moveName} и нанес ${res.damage} урона`);

    if (res.effective > 1) logTo('#battle-log', 'Это супер эффективно!');
    else if (res.effective < 1 && res.effective > 0) logTo('#battle-log', 'Это не очень эффективно...');
    else if (res.effective === 0) logTo('#battle-log', 'Атака не действует!');

    if (this.enemy.currentHP <= 0) return this.onEnemyFainted();
    setTimeout(()=> { this.enemyTurn(); this.render(); }, 300);
    this.render();
  }

  playerActionRun() {
    const active = this.player.active;
    if (!active || active.currentHP <= 0) {
      logTo('#battle-log', 'Бежать нельзя: у активного покемона 0 HP.');
      return;
    }

    const base = 0.5;
    const spdDiff = active.spd - this.enemy.spd;
    const levelDiff = active.level - this.enemy.level;
    const chance = Math.min(0.95, Math.max(0.05, base + spdDiff * 0.02 + levelDiff * 0.01));
    if (Math.random() < chance) {
      logTo('#battle-log', 'Вы убежали!');
      this.endBattle(false);
    } else {
      logTo('#battle-log', 'Не удалось убежать!');
      setTimeout(()=> { this.enemyTurn(); this.render(); }, 300);
    }
  }

  playerActionItem(itemId) {
    if (itemId === 'potion') {
      if (this.player.inventory.potion <= 0) { logTo('#battle-log','Нет Potion'); return; }
      this.player.inventory.potion--;
      this.player.active.currentHP = Math.min(this.player.active.maxHP, this.player.active.currentHP + 20);
      logTo('#battle-log', `${this.player.active.name} восстановил HP`);
      setTimeout(()=> { this.enemyTurn(); this.render(); }, 300);
    }
  }

  playerActionSwitch(index) {
    if (index === this.player.activeIndex) {
      logTo('#battle-log', 'Вы уже используете этого покемона.');
      return;
    }
    if (!this.player.switchTo(index)) {
      logTo('#battle-log', 'Смена невозможна');
      return;
    }
    logTo('#battle-log', `Вы сменили на ${this.player.active.name}`);
    setTimeout(()=> { this.enemyTurn(); this.render(); }, 300);
  }

  enemyTurn() {
    if (this.enemy.currentHP <= 0) return;
    const res = this.enemy.attack(0, this.player.active, this.data.types);
    logTo('#battle-log', `${this.enemy.name} атаковал и нанес ${res.damage}`);

    if (res.effective > 1) logTo('#battle-log', 'Это супер эффективно!');
    else if (res.effective < 1 && res.effective > 0) logTo('#battle-log', 'Это не очень эффективно...');
    else if (res.effective === 0) logTo('#battle-log', 'Атака не действует!');

    if (this.player.active.currentHP <= 0) this.onPlayerFainted();
    this.render();
  }

  onEnemyFainted() {
    logTo('#battle-log', `${this.enemy.name} пал!`);
    this.player.active.gainExp(10 + this.enemy.level * 2);
    this.endBattle(true);
  }

  onPlayerFainted() {
    logTo('#battle-log', `${this.player.active.name} пал и покинул ваш отряд!`);

    this.player.party.splice(this.player.activeIndex, 1);

    if (this.player.party.length > 0) {
      this.player.activeIndex = 0;
      logTo('#battle-log', `Вы отправили ${this.player.active.name}`);
      this.render();
    } else {
      this.gameOver();
    }
  }

  gameOver() {
    logTo('#battle-log', 'Все покемоны повержены. Вы проиграли игру.');
    this.endBattle(false);

    this.player.party = [];
    this.player.activeIndex = -1;

    const world = document.getElementById('world-container');
    const menu = document.getElementById('menu-container');
    if (world) world.classList.add('hidden');
    if (menu) menu.classList.remove('hidden');
  }

  endBattle(victory) {
    if (this.onEnd) this.onEnd(victory);
  }

  tryCatch(ballType) {
    const inv = this.player.inventory;
    if (inv[ballType] <= 0) {
      logTo('#battle-log', `Нет ${ballType}`);
      return;
    }

    inv[ballType]--;

    // базовый шанс по типу шара
    let baseChance = 0.3;
    if (ballType === 'greatball') baseChance = 0.5;

    // модификатор по HP врага
    const hpFactor = 1 - (this.enemy.currentHP / this.enemy.maxHP);

    const chance = baseChance + hpFactor * 0.5;

    if (Math.random() < chance) {
      logTo('#battle-log', `Вы поймали ${this.enemy.name}!`);
      this.player.party.push(this.enemy);
      this.endBattle(true);
    } else {
      logTo('#battle-log', `${this.enemy.name} вырвался!`);
      setTimeout(()=> { this.enemyTurn(); this.render(); }, 300);
    }
  }
}
