import { state } from '../core/state.js';
import { openModal } from '../utils/modal.js';
import { showModeratorPage } from './moderator.js';
import { roleDetails } from '../data/roles.js';

    export function prepareDrawScreen() {
        document.getElementById('draw-title').innerText = `Pemain ke-${state.currentPlayerIdx + 1} dari ${state.totalPlayers}`;
        document.getElementById('player-name').value = "";
        document.getElementById('input-name-zone').classList.remove('hidden');
        document.getElementById('card-fan-zone').classList.add('hidden');
        document.getElementById('card-reveal-zone').classList.add('hidden');
    }

    /* ---------- KOCOK & SEBAR KARTU ---------- */
    export function dealCards() {
        const nameInput = document.getElementById('player-name').value.trim();
        if (nameInput === "") {
            openModal("⚠️ Nama Kosong", "Ketik namamu dulu sebelum mengambil kartu!");
            return;
        }
        state.pendingName = nameInput;

        document.getElementById('input-name-zone').classList.add('hidden');

        const zone = document.getElementById('card-fan-zone');
        const fan = document.getElementById('card-fan');
        const hint = document.getElementById('pick-hint');
        const label = document.getElementById('shuffle-label');

        zone.classList.remove('hidden');
        hint.classList.add('hidden');
        label.innerText = "🎴 Mengocok kartu…";
        fan.classList.remove('shuffling');
        fan.innerHTML = "";

        const remaining = state.availableRoles.length;
        for (let i = 0; i < remaining; i++) {
            const c = document.createElement('div');
            c.className = 'deal-card';
            c.onclick = () => pickCard(i);
            c.innerHTML = `
                <div class="deal-card-inner">
                    <div class="deal-front"></div>
                    <div class="deal-back"></div>
                </div>`;
            fan.appendChild(c);
        }

        setTimeout(() => fan.classList.add('shuffling'), 40);
        setTimeout(spreadCards, 1600);
    }

    export function spreadCards() {
        const fan = document.getElementById('card-fan');
        const cards = fan.querySelectorAll('.deal-card');
        const n = cards.length;

        fan.classList.remove('shuffling');

        const spacing = 30;
        cards.forEach((c, i) => {
            const offset = i - (n - 1) / 2;
            const x = offset * spacing;
            const y = -Math.abs(offset) * 7;
            const rot = offset * 5;
            setTimeout(() => {
                c.style.setProperty('--x', `${x}px`);
                c.style.setProperty('--y', `${y}px`);
                c.style.setProperty('--rot', `${rot}deg`);
            }, i * 35);
        });

        document.getElementById('shuffle-label').innerText = "✨ Kartu siap!";
        document.getElementById('pick-hint').classList.remove('hidden');
    }

    export function setCardFront(card, role) {
        const front = card.querySelector('.deal-front');
        front.innerHTML = `<span class="deal-front-icon">${roleDetails[role].icon}</span><span class="deal-front-name">${role}</span>`;
    }

    export function pickCard(i) {
        if (i >= state.availableRoles.length) return;

        if (state.currentPlayerIdx === state.totalPlayers - 1 && !state.werewolfSpotted) {
            const wIdx = state.availableRoles.indexOf("Werewolf");
            if (wIdx > -1 && wIdx !== i) {
                [state.availableRoles[wIdx], state.availableRoles[i]] = [state.availableRoles[i], state.availableRoles[wIdx]];
            }
            state.currentRole = "Werewolf";
            state.werewolfSpotted = true;
        } else {
            state.currentRole = state.availableRoles[i];
            if (state.currentRole === "Werewolf") {
                state.werewolfSpotted = true;
            }
        }
        state.availableRoles.splice(i, 1);

        state.players.push({
            name: state.pendingName,
            role: state.currentRole,
            alive: true,
            hp: state.currentRole === "Strong Villager" ? 2 : 1,
            orphanFather: null,
            transformedFrom: null
        });

        const cards = document.querySelectorAll('.deal-card');
        cards.forEach((c, idx) => {
            if (idx !== i) {
                c.classList.add('faded');
            } else {
                setCardFront(c, state.currentRole);
                c.classList.add('flipped');
            }
        });

        setTimeout(showReveal, 900);
    }

    export function showReveal() {
        document.getElementById('card-icon').innerText = roleDetails[state.currentRole].icon;
        document.getElementById('role-result').innerText = state.currentRole;
        document.getElementById('role-description').innerText = roleDetails[state.currentRole].desc;
        document.getElementById('card-display').classList.toggle('ww-mode', state.currentRole === "Werewolf");

        document.getElementById('card-fan-zone').classList.add('hidden');
        document.getElementById('card-reveal-zone').classList.remove('hidden');
    }

    export function nextPlayer() {
        state.currentPlayerIdx++;
        if (state.currentPlayerIdx < state.totalPlayers) {
            prepareDrawScreen();
        } else {
            showModeratorPage();
        }
    }

