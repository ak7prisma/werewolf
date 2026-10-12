import { switchMenu } from './ui/render.js';
import { openModal, closeModal } from './utils/modal.js';
import { startSetup } from './game/setup.js';
import { prepareDrawScreen, dealCards, spreadCards, pickCard, showReveal, nextPlayer } from './game/draw.js';
import { showModeratorPage, renderModeratorList, renderDoctorStatus, renderOrphanZone, orphanFatherPending, focusOrphanZone, warnOrphanFather, pickOrphanFather, renderKingZone, checkOrphanTransform, doctorRevive, toggleStatus, killPlayer, revivePlayer, resetGame, doResetGame } from './game/moderator.js';
import { state } from './core/state.js';

// wire global functions for inline onclick
window.switchMenu = switchMenu;
window.openModal = openModal;
window.closeModal = closeModal;
window.startSetup = startSetup;
window.prepareDrawScreen = prepareDrawScreen;
window.dealCards = dealCards;
window.spreadCards = spreadCards;
window.pickCard = pickCard;
window.showReveal = showReveal;
window.nextPlayer = nextPlayer;
window.showModeratorPage = showModeratorPage;
window.renderModeratorList = renderModeratorList;
window.renderDoctorStatus = renderDoctorStatus;
window.renderOrphanZone = renderOrphanZone;
window.orphanFatherPending = orphanFatherPending;
window.focusOrphanZone = focusOrphanZone;
window.warnOrphanFather = warnOrphanFather;
window.pickOrphanFather = pickOrphanFather;
window.renderKingZone = renderKingZone;
window.checkOrphanTransform = checkOrphanTransform;
window.doctorRevive = doctorRevive;
window.toggleStatus = toggleStatus;
window.killPlayer = killPlayer;
window.revivePlayer = revivePlayer;
window.resetGame = resetGame;
window.doResetGame = doResetGame;

document.getElementById('nav-game')?.addEventListener('click', () => switchMenu('game-flow'));
document.getElementById('nav-cards')?.addEventListener('click', () => switchMenu('list-card'));
document.getElementById('btn-start-setup')?.addEventListener('click', startSetup);
document.getElementById('btn-deal-cards')?.addEventListener('click', dealCards);
document.getElementById('btn-next-player')?.addEventListener('click', nextPlayer);
document.getElementById('btn-reset-game')?.addEventListener('click', resetGame);
document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal(false);
});
document.getElementById('modal-cancel')?.addEventListener('click', () => closeModal(false));
document.getElementById('modal-confirm')?.addEventListener('click', () => closeModal(true));
document.getElementById('player-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dealCards();
});
