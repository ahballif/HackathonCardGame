import { validateDeckLists } from './rules.js';

const KEY = 'history-heroes-decks-v1';
export function readDeckLists(library) {
  try {
    const lists = JSON.parse(localStorage.getItem(KEY));
    if (!lists) return null;
    validateDeckLists(library, lists);
    return lists;
  } catch { return null; }
}

export function installDeckBuilder(library, onSave) {
  const dialog = document.getElementById('deck-builder');
  const grid = document.getElementById('deck-grid');
  const count = document.getElementById('deck-count');
  const status = document.getElementById('deck-status');
  const search = document.getElementById('deck-search');
  const save = document.getElementById('deck-save');
  let owner = 0;
  let lists;
  const randomDeck = () => {
    const cards = [...library];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.slice(0, 16).map(card => card.name);
  };
  function render() {
    count.textContent = `Player ${owner + 1} · ${lists[owner].length}/16 selected`;
    document.querySelectorAll('[data-deck-player]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.deckPlayer) === owner)));
    save.disabled = lists.some(deck => deck.length !== 16);
    grid.replaceChildren();
    library.filter(card => card.name.toLowerCase().includes(search.value.toLowerCase())).forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deck-card';
      button.setAttribute('aria-pressed', String(lists[owner].includes(card.name)));
      const image = document.createElement('img');
      image.src = `Cards/${card.image}`;
      image.alt = '';
      const name = document.createElement('span');
      name.textContent = card.name;
      const arrows = document.createElement('small');
      arrows.textContent = [...card.push.slice(0, 4)].map((force, i) => `${['↑', '→', '↓', '←'][i]}${force}`).join('  ');
      button.append(image, name, arrows);
      button.onclick = () => {
        const index = lists[owner].indexOf(card.name);
        if (index >= 0) lists[owner].splice(index, 1);
        else if (lists[owner].length < 16) lists[owner].push(card.name);
        else { status.textContent = 'Remove a card before adding another. Each deck has 16 heroes.'; return; }
        status.textContent = '';
        render();
      };
      grid.append(button);
    });
  }
  document.getElementById('deck-builder-open').onclick = () => {
    lists = readDeckLists(library) ?? [randomDeck(), randomDeck()];
    owner = 0; search.value = ''; status.textContent = '';
    render(); dialog.showModal();
  };
  document.getElementById('deck-close').onclick = () => dialog.close();
  document.querySelectorAll('[data-deck-player]').forEach(button => { button.onclick = () => { owner = Number(button.dataset.deckPlayer); render(); }; });
  search.oninput = render;
  document.getElementById('deck-random').onclick = () => { lists[owner] = randomDeck(); status.textContent = ''; render(); };
  document.getElementById('deck-clear').onclick = () => { lists[owner] = []; status.textContent = ''; render(); };
  save.onclick = () => {
    try {
      validateDeckLists(library, lists);
      localStorage.setItem(KEY, JSON.stringify(lists));
      onSave(lists);
      dialog.close();
    } catch (error) { status.textContent = error.message; }
  };
}
