import { clamp } from './utils.js';

export class Pokemon {
  constructor(spec, level = 5) {
    this.id = spec.id;
    this.name = spec.name;
    this.type = spec.type;
    this.level = level;
    this.exp = 0;
    this.baseStats = spec.baseStats;
    this.moves = spec.moves.map(m => ({...m, currentPP: m.pp}));
    this.evolution = spec.evolution || [];
    this.currentHP = this.maxHP;
  }

  // более мягкий рост HP/атк/деф/спд
  get maxHP() {
    // базовый HP + небольшой прирост на уровень
    return Math.max(1, Math.floor(this.baseStats.hp * 0.6 + this.level * 1.2));
  }
  get atk() {
    return Math.max(1, Math.floor(this.baseStats.atk * 0.5 + this.level * 0.9));
  }
  get def() {
    return Math.max(1, Math.floor(this.baseStats.def * 0.6 + this.level * 0.9));
  }
  get spd() {
    return Math.max(1, Math.floor(this.baseStats.spd * 0.5 + this.level * 0.8));
  }


  attack(moveIndex, target, typeChart) {
    const move = this.moves[moveIndex];
    if (!move || move.currentPP <= 0) return { success:false, reason:'noPP' };
    move.currentPP--;
    const base = move.power || 0;
    const stab = (move.type === this.type) ? 1.2 : 1;
    const eff = (typeChart[move.type] && typeChart[move.type][target.type]) || 1;
    // новая формула: учитываем соотношение ATK/DEF, но делим на коэффициент, чтобы урон был умеренным
    const raw = (this.atk * base) / Math.max(1, target.def * 6);
    const variance = 0.85 + Math.random() * 0.3;
    const damage = Math.max(1, Math.floor(raw * stab * eff * variance));
    target.currentHP = Math.max(0, target.currentHP - damage);
    return { success:true, damage, effective: eff, moveName: move.name };
  }

  gainExp(amount) {
    this.exp += amount;
    const need = this.level * 10 + 20;
    if (this.exp >= need) {
      this.exp -= need;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.currentHP = this.maxHP;
    this.tryEvolve();
  }

  tryEvolve() {
    const evo = this.evolution.find(e => e.level && e.level <= this.level);
    if (evo) {
      // в минимальной версии просто меняем имя и id; для полной версии загрузите spec
      this.id = evo.to;
      this.name = evo.to;
    }
  }
}

export class PokemonFactory {
  constructor(pokemons) { this.pokemons = pokemons; }
  create(id, level=5) {
    const spec = this.pokemons.find(p=>p.id===id);
    if (!spec) throw new Error('Unknown pokemon ' + id);
    return new Pokemon(spec, level);
  }
}
