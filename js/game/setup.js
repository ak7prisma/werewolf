import { state } from '../core/state.js';
import { openModal } from '../utils/modal.js';

    export function startSetup() {
        const input = document.getElementById('total-state.players').value;
        state.totalPlayers = parseInt(input);

        if (isNaN(state.totalPlayers) || state.totalPlayers < 4 || state.totalPlayers > 11) {
            openModal("⚠️ Jumlah Pemain", "Jumlah pemain harus antara 4 sampai 11!");
            return;
        }

        let shuffled = [...state.allRoles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        state.availableRoles = shuffled.slice(0, state.totalPlayers);
        enforceActiveRolesRule();

        state.players = [];
        state.currentPlayerIdx = 0;
        state.pendingName = "";
        state.werewolfSpotted = false;
        state.hasDoctor = state.availableRoles.includes("Doctor");
        state.doctorCharges = state.hasDoctor ? 1 : 0;

        document.getElementById('step-setup').classList.add('hidden');
        document.getElementById('step-draw').classList.remove('hidden');
        prepareDrawScreen();
    }

    export function enforceActiveRolesRule() {
        const isActive = r => state.activeRoles.includes(r);
        let missing = state.MIN_ACTIVE_ROLES - state.availableRoles.filter(isActive).length;

        while (missing > 0) {
            const outside = state.allRoles.filter(r => isActive(r) && !state.availableRoles.includes(r));
            if (outside.length === 0) break;

            const outIdx = state.availableRoles.findIndex(r => !isActive(r) && r !== "Werewolf");
            if (outIdx === -1) break;

            const inIdx = Math.floor(Math.random() * outside.length);
            state.availableRoles[outIdx] = outside[inIdx];
            missing--;
        }

        for (let i = state.availableRoles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.availableRoles[i], state.availableRoles[j]] = [state.availableRoles[j], state.availableRoles[i]];
        }
    }

