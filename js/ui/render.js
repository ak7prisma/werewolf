export function switchMenu(menu) {
  const isCards = menu === 'list-card';
  document.getElementById('list-card').classList.toggle('hidden', !isCards);
  document.getElementById('game-flow').classList.toggle('hidden', isCards);
  document.getElementById('nav-cards').classList.toggle('active', isCards);
  document.getElementById('nav-game').classList.toggle('active', !isCards);
}
