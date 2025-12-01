// main.js
import { loadJSON } from './modules/utils.js';
import { Menu } from './modules/menu.js';
import { Player } from './modules/player.js';
import { World } from './modules/world.js';
import { PokemonFactory } from './modules/pokemon.js';
import { Battle } from './modules/battle.js';

const DATA = { pokemons: null, types: null };

async function init() {
  DATA.pokemons = await loadJSON('data/pokemons.json');
  DATA.types = await loadJSON('data/types.json');
  DATA.wild = await loadJSON('data/wild.json');

  const menu = new Menu();
  const player = new Player();
  const world = new World(20,12);
  const pokemonFactory = new PokemonFactory(DATA.pokemons);

  // передаём список диких покемонов в мир
  world.wildPool = DATA.wild;

  menu.onNew = () => {
    world.init();
    document.getElementById('scene-menu').classList.add('hidden');
    document.getElementById('scene-choose').classList.remove('hidden');
    renderStarters();
  };

  function renderStarters() {
    const container = document.getElementById('starters');
    container.innerHTML = '';
    const starters = ['torchic','mudkip','treecko'];
    for (const id of starters) {
      const spec = DATA.pokemons.find(p => p.id === id);
      const card = document.createElement('div');
      card.className = 'card';
      const imgPath = `assets/images/pokemons/${spec.id}.png`;

      card.innerHTML = `
      <h3>${spec.name}</h3>
      <img src="${imgPath}" alt="${spec.name}" width="64" height="64" style="display:block;margin:6px 0"/>
      <div class="small-muted">Тип: ${spec.type}</div>
      <div style="margin-top:8px">
        <button data-id="${spec.id}">Выбрать</button>
      </div>
    `;

      container.appendChild(card);

      card.querySelector('button').addEventListener('click', () => {
        const pkm = pokemonFactory.create(spec.id, 5);
        player.chooseStarter(pkm);
        enterWorld();
      });
    }
  }

  function enterWorld() {
    document.getElementById('scene-choose').classList.add('hidden');
    document.getElementById('scene-world').classList.remove('hidden');
    renderWorld();
    renderPanels();
  }

  function renderWorld() {
    const map = document.getElementById('map-container');
    map.innerHTML = '';
    for (let y=0;y<world.height;y++){
      for (let x=0;x<world.width;x++){
        const tile = document.createElement('div');
        tile.className = 'tile ' + world.tileAt(x,y);
        if (x===world.playerPos.x && y===world.playerPos.y) tile.classList.add('player');
        map.appendChild(tile);
      }
    }
  }

  function renderPanels() {
    const partyEl = document.getElementById('party-panel');
    partyEl.innerHTML = '<strong>Команда</strong><br/>';
    player.party.forEach((p,idx)=>{
      const img = `assets/images/pokemons/${p.id}.png`;
      const activeMark = idx === player.activeIndex ? '> ' : '';
      partyEl.innerHTML += `${activeMark}<img src="${img}" alt="${p.name}" width="28" height="28" style="vertical-align:middle;margin-right:6px"/> ${p.name} L${p.level} HP ${p.currentHP}/${p.maxHP}<br/>`;
    });
    const inv = document.getElementById('inventory-panel');
    inv.innerHTML = `<strong>Инвентарь</strong><br/>Pokeball: ${player.inventory.pokeball} Greatball: ${player.inventory.greatball} Potion: ${player.inventory.potion}`;
  }

  window.addEventListener('keydown', async (e) => {
    if (document.getElementById('scene-world').classList.contains('hidden')) return;

    // поддержка стрелок и WASD
    const mapKeys = {
      ArrowUp: [0,-1],    w: [0,-1], W: [0,-1], ц: [0,-1], Ц: [0,-1],
      ArrowDown: [0,1],   s: [0,1],  S: [0,1], ы: [0,1], Ы: [0,1],
      ArrowLeft: [-1,0],  a: [-1,0], A: [-1,0], ф: [-1,0], Ф: [-1,0],
      ArrowRight: [1,0],  d: [1,0],  D: [1,0], в: [1,0], В: [1,0]
    };

    if (mapKeys[e.key]) {
      const [dx,dy] = mapKeys[e.key];
      const res = world.move(dx,dy);
      if (res.moved) {
        renderWorld();
        const enc = world.tryEncounter(res.tile, 0.2);
        if (enc) {
          const enemy = pokemonFactory.create(enc.id, enc.level);
          startBattle(enemy);
        }
      }
    }
  });

  function startBattle(enemy) {
    document.getElementById('scene-world').classList.add('hidden');
    document.getElementById('scene-battle').classList.remove('hidden');
    const battle = new Battle(player, enemy, { types: DATA.types, pokemons: DATA.pokemons });
    battle.start();

    document.getElementById('act-attack').onclick = () => {
      const extra = document.getElementById('battle-extra');
      extra.classList.remove('hidden');
      extra.innerHTML = '';
      player.active.moves.forEach((m,idx)=>{
        const b = document.createElement('button'); b.textContent = `${m.name} (${m.currentPP}/${m.pp})`;
        b.addEventListener('click', ()=>{ battle.playerActionAttack(idx); });
        extra.appendChild(b);
      });
    };
    document.getElementById('act-run').onclick = ()=> battle.playerActionRun();
    document.getElementById('act-item').onclick = ()=> {
      const extra = document.getElementById('battle-extra');
      extra.classList.remove('hidden'); extra.innerHTML='';
      const potion = document.createElement('button'); potion.textContent = `Potion (${player.inventory.potion})`;
      potion.onclick = ()=> { battle.playerActionItem('potion'); };
      const pokeb = document.createElement('button'); pokeb.textContent = `Pokeball (${player.inventory.pokeball})`;
      pokeb.onclick = ()=> { battle.tryCatch('pokeball'); };
      const great = document.createElement('button'); great.textContent = `Greatball (${player.inventory.greatball})`;
      great.onclick = ()=> { battle.tryCatch('greatball'); };
      extra.appendChild(potion); extra.appendChild(pokeb); extra.appendChild(great);
    };
    document.getElementById('act-switch').onclick = ()=> {
      const extra = document.getElementById('battle-extra');
      extra.classList.remove('hidden'); extra.innerHTML='';
      player.party.forEach((p,idx)=>{
        const b = document.createElement('button'); b.textContent = `${p.name} L${p.level} HP ${p.currentHP}/${p.maxHP}`;
        b.onclick = ()=> battle.playerActionSwitch(idx);
        extra.appendChild(b);
      });
    };

    battle.onEnd = (victory) => {
      document.getElementById('scene-battle').classList.add('hidden');
      document.getElementById('scene-world').classList.remove('hidden');
      renderWorld();
      renderPanels();
      document.getElementById('battle-log').textContent = '';
      document.getElementById('battle-extra').classList.add('hidden');
    };
  }

  document.getElementById('btn-new').addEventListener('click', ()=> menu.triggerNew());
  document.getElementById('btn-exit').addEventListener('click', ()=> window.close?.());
  document.getElementById('btn-back-to-menu').addEventListener('click', ()=> {
    document.getElementById('scene-choose').classList.add('hidden');
    document.getElementById('scene-menu').classList.remove('hidden');
  });
  document.getElementById('btn-new-game-small').addEventListener('click', ()=> menu.triggerNew());

  document.getElementById('scene-menu').classList.remove('hidden');
}

init();
