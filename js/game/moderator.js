import { state } from '../core/state.js';
import { openModal, closeModal } from '../utils/modal.js';
import { roleDetails } from '../data/roles.js';

    export function showModeratorPage() {
        document.getElementById('step-draw').classList.add('hidden');
        document.getElementById('step-moderator').classList.remove('hidden');
        renderModeratorList();
        if (orphanFatherPending()) warnOrphanFather();
    }

    /* ---------- PAPAN MODERATOR ---------- */
    export function renderModeratorList() {
        const listContainer = document.getElementById('moderator-list');
        listContainer.innerHTML = "";

        state.players.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = `player-item ${player.alive ? '' : 'dead'}`;

            const icon = roleDetails[player.role].icon;
            const hpBadge = player.hp > 1
                ? `<span class="hp-badge">${"â¤ï¸".repeat(player.hp)}</span>`
                : "";
            const transformedBadge = player.transformedFrom
                ? `<span class="transform-badge">â¬ eks ${player.transformedFrom}</span>`
                : "";

            const orphanFatherBadge = state.players.some(p => p.role === "Orphan" && p.orphanFather === index)
                ? `<span class="orphan-badge">ð¨âð¶ Bapak Angkat</span>`
                : "";

            let orphanChildBadge = "";
            if (player.role === "Orphan" && player.orphanFather !== null) {
                const fatherName = state.players[player.orphanFather].name;
                orphanChildBadge = `<span class="orphan-child-badge">ð¶ Bapak: ${fatherName}</span>`;
            }

            let actionBtn;
            if (player.alive) {
                actionBtn = `<button onclick="toggleStatus(${index})">ð Bunuh</button>`;
            } else if (state.hasDoctor && state.doctorCharges > 0) {
                actionBtn = `<button onclick="doctorRevive(${index})">ð©º Hidupkan</button>`;
            } else {
                actionBtn = `<span class="dead-label">â ï¸ Mati</span>`;
            }

            div.innerHTML = `
                <div>
                    <strong>${player.name}</strong><br>
                    <span class="player-role">${icon} ${player.role}</span>${hpBadge}${transformedBadge}${orphanFatherBadge}${orphanChildBadge}
                </div>
                ${actionBtn}
            `;
            listContainer.appendChild(div);
        });

        renderDoctorStatus();
        renderOrphanZone();
        renderKingZone();
    }

    export function renderDoctorStatus() {
        const el = document.getElementById('doctor-status');
        if (!state.hasDoctor) {
            el.classList.add('hidden');
            return;
        }
        el.classList.remove('hidden');
        el.innerHTML = `<div class="warning-text">ð©º Sisa kesempatan Doctor: ${state.doctorCharges}</div>`;
    }

    export function renderOrphanZone() {
        const zone = document.getElementById('orphan-zone');
        const orphanIdx = state.state.players.findIndex(p => p.role === "Orphan");

        if (orphanIdx === -1 || state.players[orphanIdx].orphanFather !== null) {
            zone.classList.add('hidden');
            zone.innerHTML = "";
            return;
        }

        const options = players
            .map((p, i) => (i === orphanIdx || !p.alive) ? "" : `<option value="${i}">${p.name}</option>`)
            .join("");

        zone.classList.remove('hidden');
        zone.innerHTML = `
            <div class="card-info zone-card">
                <strong>ð¶ Wajib: Pilih Bapak Angkat</strong>
                <p>Orphan <b>${state.players[orphanIdx].name}</b> memilih bapak angkat. Jika bapak angkat mati, ia berubah menjadi Werewolf.</p>
                <select id="orphan-father-select"><option value="">â Pilih pemain â</option>${options}</select>
                <button onclick="pickOrphanFather()">Tetapkan Bapak Angkat</button>
            </div>
        `;
    }

    export function orphanFatherPending() {
        return state.players.some(p => p.role === "Orphan" && p.orphanFather === null);
    }

    export function focusOrphanZone() {
        const zone = document.getElementById('orphan-zone');
        if (!zone) return;
        zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        zone.classList.remove('zone-highlight');
        void zone.offsetWidth;
        zone.classList.add('zone-highlight');
        setTimeout(() => zone.classList.remove('zone-highlight'), 4000);
    }

    export function warnOrphanFather() {
        const orphan = state.players.find(p => p.role === "Orphan" && p.orphanFather === null);
        if (!orphan) return;
        openModal(
            "ð¶ Wajib Pilih Bapak Angkat",
            `<b>${orphan.name}</b> (Orphan) belum memilih bapak angkat! Pilih dulu sebelum melanjutkan permainan atau membunuh pemain.`,
            { confirmText: "Pilih Sekarang", onConfirm: focusOrphanZone }
        );
    }

    export function pickOrphanFather() {
        const orphanIdx = state.state.players.findIndex(p => p.role === "Orphan");
        if (orphanIdx === -1) return;

        const sel = document.getElementById('orphan-father-select');
        if (!sel || sel.value === "") {
            openModal("â ï¸ Pilih Bapak Angkat", "Pilih dulu pemain yang akan jadi bapak angkat!");
            return;
        }

        const fatherIdx = parseInt(sel.value);
        openModal(
            "ð¶ Tetapkan Bapak Angkat?",
            `${state.players[orphanIdx].name} akan menjadikan <b>${state.players[fatherIdx].name}</b> sebagai bapak angkat.`,
            {
                confirmText: "Tetapkan",
                cancelText: "Batal",
                onConfirm: () => {
                    state.players[orphanIdx].orphanFather = fatherIdx;
                    document.getElementById('orphan-zone').classList.remove('zone-highlight');
                    renderModeratorList();
                }
            }
        );
    }

    export function checkOrphanTransform(deadIndex) {
        state.players.forEach(p => {
            if (p.role === "Orphan" && p.orphanFather === deadIndex) {
                p.role = "Werewolf";
                p.transformedFrom = "Orphan";
                p.hp = 1;
                p.alive = true;
                openModal("ð¶â¡ï¸ðº Transformasi!", `${p.name} kehilangan bapak angkatnya, bangkit dari kematian, dan berubah menjadi <b>WEREWOLF!</b>`);
            }
        });
    }

    export function doctorRevive(index) {
        const p = state.players[index];
        if (state.doctorCharges <= 0 || p.alive) return;

        openModal(
            "ð©º Hidupkan dengan Doctor?",
            `${p.name} akan dihidupkan menggunakan 1-satunya kesempatan Doctor.`,
            {
                confirmText: "Hidupkan",
                cancelText: "Batal",
                onConfirm: () => {
                    p.alive = true;
                    p.hp = p.role === "Strong Villager" ? 2 : 1;
                    state.doctorCharges--;
                    renderModeratorList();
                }
            }
        );
    }

    export function toggleStatus(index) {
        const p = state.players[index];

        if (p.alive) {
            if (orphanFatherPending()) {
                warnOrphanFather();
                return;
            }
            const strongNote = p.role === "Strong Villager" && p.hp > 1
                ? ` ${p.name} masih punya ${p.hp} nyawa.`
                : "";
            openModal(
                "ð Bunuh Pemain?",
                `<b>${p.name}</b> akan dibunuh.${strongNote}`,
                {
                    confirmText: "Bunuh",
                    cancelText: "Batal",
                    onConfirm: () => killPlayer(index)
                }
            );
        } else {
            if (!state.hasDoctor || state.doctorCharges <= 0) {
                openModal("ð« Tidak Bisa Hidupkan", "Hanya <b>Doctor</b> yang bisa menghidupkan pemain mati, dan kesempatannya sudah habis atau tidak ada Doctor di permainan ini.");
                return;
            }
            openModal(
                "â¤ï¸ Hidupkan Pemain?",
                `<b>${p.name}</b> akan dibangkitkan kembali.`,
                {
                    confirmText: "Hidupkan",
                    cancelText: "Batal",
                    onConfirm: () => revivePlayer(index)
                }
            );
        }
    }

    export function killPlayer(index) {
        const p = state.players[index];

        if (p.role === "Strong Villager" && p.hp > 1) {
            p.hp--;
            openModal("ðª Bangkit Lagi!", `Strong Villager punya 2 nyawa â <b>${p.name}</b> bangkit! Sisa ${p.hp} nyawa. Bunuh sekali lagi untuk eliminasi.`);
            renderModeratorList();
            return;
        }

        p.alive = false;
        checkOrphanTransform(index);
        renderModeratorList();
    }

    export function revivePlayer(index) {
        if (!state.hasDoctor || state.doctorCharges <= 0) return;
        const p = state.players[index];
        if (p.alive) return;
        p.alive = true;
        p.hp = p.role === "Strong Villager" ? 2 : 1;
        state.doctorCharges--;
        renderModeratorList();
    }


export function resetGame() {
        openModal(
            "ð Mulai Ulang?",
            "Yakin ingin mereset permainan? Semua peran akan diacak ulang.",
            {
                confirmText: "Reset",
                cancelText: "Batal",
                onConfirm: doResetGame
            }
        );
    }

    export function doResetGame() {
        document.getElementById('step-moderator').classList.add('hidden');
        document.getElementById('step-setup').classList.remove('hidden');
        document.getElementById('total-state.players').value = "";
    }
