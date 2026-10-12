
    const roleDetails = {
        "Werewolf": { icon: "dY?�", desc: "Kamu serigala! Mangsalah warga setiap malam dan tutupi jejakmu dengan kebohongan yang meyakinkan." },
        "Seer":     { icon: "dY`?�,?", desc: "Kamu peramal. Terawang satu orang setiap malam untuk menguji apakah dia musuh atau kawan." },
        "Guardian": { icon: "dY>��,?", desc: "Kamu pelindung. Pilih satu pemain setiap malam untuk dijaga dari gigitan Werewolf." },
        "Hunter":   { icon: "dY?1", desc: "Kamu pemburu! Saat kamu mati, tarik pelatuk dan tembak satu pemain lain pilihanmu." },
        "Lycan":    { icon: "dY?", desc: "Kamu warga baik dengan darah terkutuk. Jika diperiksa Seer, kamu terbaca sebagai Werewolf!" },
        "Disease":  { icon: "dY�", desc: "Tubuhmu beracun. Jika kamu dimangsa Werewolf, mereka keracunan dan absen berburu malam berikutnya." },
        "Cursed":   { icon: "dYc,", desc: "Kamu terkutuk. Gigitan Werewolf tak membunuhmu - justru mengubahmu menjadi salah satu dari mereka." },
        "Strong Villager": { icon: "dY'�", desc: "Kamu warga bertubuh kekar dengan 2 nyawa! Jika dibunuh Werewolf, kamu bangkit sekali lagi. Gunakan kesempatan itu dengan bijak." },
        "Orphan":   { icon: "dY`", desc: "Kamu yatim piatu. Pilih 1 pemain sebagai bapak angkatmu. Jika dia mati, kamu bangkit dan berubah menjadi Werewolf!" },
        "Doctor":   { icon: "dYc�", desc: "Kamu dokter desa. Kamu punya 1 kesempatan untuk menghidupkan kembali 1 pemain yang sudah mati. Pakai dengan bijak." },
        "King":     { icon: "dY``", desc: "Kamu raja desa. Saat vote warga seri, hak prerogatif ada padamu: tentukan satu kandidat terikat untuk dieliminasi." }
    };

    let allRoles = Object.keys(roleDetails);
    const activeRoles = ["Seer", "Guardian", "Doctor"];
    const MIN_ACTIVE_ROLES = 2;
    let availableRoles = [];
    let players = [];
    let totalPlayers = 0;
    let currentPlayerIdx = 0;
    let currentRole = "";
    let pendingName = "";
    let werewolfSpotted = false;
    let hasDoctor = false;
    let doctorCharges = 0;
    let modalCallback = null;

    function switchMenu(menu) {
        const isCards = menu === 'list-card';
        document.getElementById('list-card').classList.toggle('hidden', !isCards);
        document.getElementById('game-flow').classList.toggle('hidden', isCards);
        document.getElementById('nav-cards').classList.toggle('active', isCards);
        document.getElementById('nav-game').classList.toggle('active', !isCards);
    }

    /* ---------- MODAL ---------- */
    function openModal(title, message, opts = {}) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerHTML = message;
        document.getElementById('modal-confirm').innerText = opts.confirmText || "OK";
        const cancel = document.getElementById('modal-cancel');
        if (opts.cancelText) {
            cancel.style.display = "";
            cancel.innerText = opts.cancelText;
        } else {
            cancel.style.display = "none";
        }
        modalCallback = opts.onConfirm || null;
        document.getElementById('modal-backdrop').classList.remove('hidden');
    }

    function closeModal(confirmed) {
        document.getElementById('modal-backdrop').classList.add('hidden');
        if (confirmed && modalCallback) modalCallback();
        modalCallback = null;
    }

    function startSetup() {
        const input = document.getElementById('total-players').value;
        totalPlayers = parseInt(input);

        if (isNaN(totalPlayers) || totalPlayers < 4 || totalPlayers > 11) {
            openModal("⚠️ Jumlah Pemain", "Jumlah pemain harus antara 4 sampai 11!");
            return;
        }

        let shuffled = [...allRoles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        availableRoles = shuffled.slice(0, totalPlayers);
        enforceActiveRolesRule();

        players = [];
        currentPlayerIdx = 0;
        pendingName = "";
        werewolfSpotted = false;
        hasDoctor = availableRoles.includes("Doctor");
        doctorCharges = hasDoctor ? 1 : 0;

        document.getElementById('step-setup').classList.add('hidden');
        document.getElementById('step-draw').classList.remove('hidden');
        prepareDrawScreen();
    }

    function enforceActiveRolesRule() {
        const isActive = r => activeRoles.includes(r);
        let missing = MIN_ACTIVE_ROLES - availableRoles.filter(isActive).length;

        while (missing > 0) {
            const outside = allRoles.filter(r => isActive(r) && !availableRoles.includes(r));
            if (outside.length === 0) break;

            const outIdx = availableRoles.findIndex(r => !isActive(r) && r !== "Werewolf");
            if (outIdx === -1) break;

            const inIdx = Math.floor(Math.random() * outside.length);
            availableRoles[outIdx] = outside[inIdx];
            missing--;
        }

        for (let i = availableRoles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
        }
    }

    function prepareDrawScreen() {
        document.getElementById('draw-title').innerText = `Pemain ke-${currentPlayerIdx + 1} dari ${totalPlayers}`;
        document.getElementById('player-name').value = "";
        document.getElementById('input-name-zone').classList.remove('hidden');
        document.getElementById('card-fan-zone').classList.add('hidden');
        document.getElementById('card-reveal-zone').classList.add('hidden');
    }

    /* ---------- KOCOK & SEBAR KARTU ---------- */
    function dealCards() {
        const nameInput = document.getElementById('player-name').value.trim();
        if (nameInput === "") {
            openModal("⚠️ Nama Kosong", "Ketik namamu dulu sebelum mengambil kartu!");
            return;
        }
        pendingName = nameInput;

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

        const remaining = availableRoles.length;
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

    function spreadCards() {
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

    function setCardFront(card, role) {
        const front = card.querySelector('.deal-front');
        front.innerHTML = `<span class="deal-front-icon">${roleDetails[role].icon}</span><span class="deal-front-name">${role}</span>`;
    }

    function pickCard(i) {
        if (i >= availableRoles.length) return;

        if (currentPlayerIdx === totalPlayers - 1 && !werewolfSpotted) {
            const wIdx = availableRoles.indexOf("Werewolf");
            if (wIdx > -1 && wIdx !== i) {
                [availableRoles[wIdx], availableRoles[i]] = [availableRoles[i], availableRoles[wIdx]];
            }
            currentRole = "Werewolf";
            werewolfSpotted = true;
        } else {
            currentRole = availableRoles[i];
            if (currentRole === "Werewolf") {
                werewolfSpotted = true;
            }
        }
        availableRoles.splice(i, 1);

        players.push({
            name: pendingName,
            role: currentRole,
            alive: true,
            hp: currentRole === "Strong Villager" ? 2 : 1,
            orphanFather: null,
            transformedFrom: null
        });

        const cards = document.querySelectorAll('.deal-card');
        cards.forEach((c, idx) => {
            if (idx !== i) {
                c.classList.add('faded');
            } else {
                setCardFront(c, currentRole);
                c.classList.add('flipped');
            }
        });

        setTimeout(showReveal, 900);
    }

    function showReveal() {
        document.getElementById('card-icon').innerText = roleDetails[currentRole].icon;
        document.getElementById('role-result').innerText = currentRole;
        document.getElementById('role-description').innerText = roleDetails[currentRole].desc;
        document.getElementById('card-display').classList.toggle('ww-mode', currentRole === "Werewolf");

        document.getElementById('card-fan-zone').classList.add('hidden');
        document.getElementById('card-reveal-zone').classList.remove('hidden');
    }

    function nextPlayer() {
        currentPlayerIdx++;
        if (currentPlayerIdx < totalPlayers) {
            prepareDrawScreen();
        } else {
            showModeratorPage();
        }
    }

    function showModeratorPage() {
        document.getElementById('step-draw').classList.add('hidden');
        document.getElementById('step-moderator').classList.remove('hidden');
        renderModeratorList();
        if (orphanFatherPending()) warnOrphanFather();
    }

    /* ---------- PAPAN MODERATOR ---------- */
    function renderModeratorList() {
        const listContainer = document.getElementById('moderator-list');
        listContainer.innerHTML = "";

        players.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = `player-item ${player.alive ? '' : 'dead'}`;

            const icon = roleDetails[player.role].icon;
            const hpBadge = player.hp > 1
                ? `<span class="hp-badge">${"❤️".repeat(player.hp)}</span>`
                : "";
            const transformedBadge = player.transformedFrom
                ? `<span class="transform-badge">⬅ eks ${player.transformedFrom}</span>`
                : "";

            const orphanFatherBadge = players.some(p => p.role === "Orphan" && p.orphanFather === index)
                ? `<span class="orphan-badge">👨‍👶 Bapak Angkat</span>`
                : "";

            let orphanChildBadge = "";
            if (player.role === "Orphan" && player.orphanFather !== null) {
                const fatherName = players[player.orphanFather].name;
                orphanChildBadge = `<span class="orphan-child-badge">👶 Bapak: ${fatherName}</span>`;
            }

            let actionBtn;
            if (player.alive) {
                actionBtn = `<button onclick="toggleStatus(${index})">💀 Bunuh</button>`;
            } else if (hasDoctor && doctorCharges > 0) {
                actionBtn = `<button onclick="doctorRevive(${index})">🩺 Hidupkan</button>`;
            } else {
                actionBtn = `<span class="dead-label">☠️ Mati</span>`;
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

    function renderDoctorStatus() {
        const el = document.getElementById('doctor-status');
        if (!hasDoctor) {
            el.classList.add('hidden');
            return;
        }
        el.classList.remove('hidden');
        el.innerHTML = `<div class="warning-text">🩺 Sisa kesempatan Doctor: ${doctorCharges}</div>`;
    }

    function renderOrphanZone() {
        const zone = document.getElementById('orphan-zone');
        const orphanIdx = players.findIndex(p => p.role === "Orphan");

        if (orphanIdx === -1 || players[orphanIdx].orphanFather !== null) {
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
                <strong>👶 Wajib: Pilih Bapak Angkat</strong>
                <p>Orphan <b>${players[orphanIdx].name}</b> memilih bapak angkat. Jika bapak angkat mati, ia berubah menjadi Werewolf.</p>
                <select id="orphan-father-select"><option value="">— Pilih pemain —</option>${options}</select>
                <button onclick="pickOrphanFather()">Tetapkan Bapak Angkat</button>
            </div>
        `;
    }

    function orphanFatherPending() {
        return players.some(p => p.role === "Orphan" && p.orphanFather === null);
    }

    function focusOrphanZone() {
        const zone = document.getElementById('orphan-zone');
        if (!zone) return;
        zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        zone.classList.remove('zone-highlight');
        void zone.offsetWidth;
        zone.classList.add('zone-highlight');
        setTimeout(() => zone.classList.remove('zone-highlight'), 4000);
    }

    function warnOrphanFather() {
        const orphan = players.find(p => p.role === "Orphan" && p.orphanFather === null);
        if (!orphan) return;
        openModal(
            "👶 Wajib Pilih Bapak Angkat",
            `<b>${orphan.name}</b> (Orphan) belum memilih bapak angkat! Pilih dulu sebelum melanjutkan permainan atau membunuh pemain.`,
            { confirmText: "Pilih Sekarang", onConfirm: focusOrphanZone }
        );
    }

    function pickOrphanFather() {
        const orphanIdx = players.findIndex(p => p.role === "Orphan");
        if (orphanIdx === -1) return;

        const sel = document.getElementById('orphan-father-select');
        if (!sel || sel.value === "") {
            openModal("⚠️ Pilih Bapak Angkat", "Pilih dulu pemain yang akan jadi bapak angkat!");
            return;
        }

        const fatherIdx = parseInt(sel.value);
        openModal(
            "👶 Tetapkan Bapak Angkat?",
            `${players[orphanIdx].name} akan menjadikan <b>${players[fatherIdx].name}</b> sebagai bapak angkat.`,
            {
                confirmText: "Tetapkan",
                cancelText: "Batal",
                onConfirm: () => {
                    players[orphanIdx].orphanFather = fatherIdx;
                    document.getElementById('orphan-zone').classList.remove('zone-highlight');
                    renderModeratorList();
                }
            }
        );
    }

    function renderKingZone() {
        const zone = document.getElementById('king-zone');
        const kingIdx = players.findIndex(p => p.role === 'King' && p.alive);

        if (kingIdx === -1) {
            zone.classList.add('hidden');
            zone.innerHTML = '';
            return;
        }

        zone.classList.remove('hidden');
        zone.innerHTML = 
            <div class='card-info zone-card'>
                <strong>dY` Keputusan Raja Saat Vote Seri</strong>
                <p>Jika vote warga seri, keputusan akhir ada di tangan Raja <b></b>.</p>
            </div>
        ;
    }
    function checkOrphanTransform(deadIndex) {
        players.forEach(p => {
            if (p.role === "Orphan" && p.orphanFather === deadIndex) {
                p.role = "Werewolf";
                p.transformedFrom = "Orphan";
                p.hp = 1;
                p.alive = true;
                openModal("👶➡️🐺 Transformasi!", `${p.name} kehilangan bapak angkatnya, bangkit dari kematian, dan berubah menjadi <b>WEREWOLF!</b>`);
            }
        });
    }

    function doctorRevive(index) {
        const p = players[index];
        if (doctorCharges <= 0 || p.alive) return;

        openModal(
            "🩺 Hidupkan dengan Doctor?",
            `${p.name} akan dihidupkan menggunakan 1-satunya kesempatan Doctor.`,
            {
                confirmText: "Hidupkan",
                cancelText: "Batal",
                onConfirm: () => {
                    p.alive = true;
                    p.hp = p.role === "Strong Villager" ? 2 : 1;
                    doctorCharges--;
                    renderModeratorList();
                }
            }
        );
    }

    function toggleStatus(index) {
        const p = players[index];

        if (p.alive) {
            if (orphanFatherPending()) {
                warnOrphanFather();
                return;
            }
            const strongNote = p.role === "Strong Villager" && p.hp > 1
                ? ` ${p.name} masih punya ${p.hp} nyawa.`
                : "";
            openModal(
                "💀 Bunuh Pemain?",
                `<b>${p.name}</b> akan dibunuh.${strongNote}`,
                {
                    confirmText: "Bunuh",
                    cancelText: "Batal",
                    onConfirm: () => killPlayer(index)
                }
            );
        } else {
            if (!hasDoctor || doctorCharges <= 0) {
                openModal("🚫 Tidak Bisa Hidupkan", "Hanya <b>Doctor</b> yang bisa menghidupkan pemain mati, dan kesempatannya sudah habis atau tidak ada Doctor di permainan ini.");
                return;
            }
            openModal(
                "❤️ Hidupkan Pemain?",
                `<b>${p.name}</b> akan dibangkitkan kembali.`,
                {
                    confirmText: "Hidupkan",
                    cancelText: "Batal",
                    onConfirm: () => revivePlayer(index)
                }
            );
        }
    }

    function killPlayer(index) {
        const p = players[index];

        if (p.role === "Strong Villager" && p.hp > 1) {
            p.hp--;
            openModal("💪 Bangkit Lagi!", `Strong Villager punya 2 nyawa — <b>${p.name}</b> bangkit! Sisa ${p.hp} nyawa. Bunuh sekali lagi untuk eliminasi.`);
            renderModeratorList();
            return;
        }

        p.alive = false;
        checkOrphanTransform(index);
        renderModeratorList();
    }

    function revivePlayer(index) {
        if (!hasDoctor || doctorCharges <= 0) return;
        const p = players[index];
        if (p.alive) return;
        p.alive = true;
        p.hp = p.role === "Strong Villager" ? 2 : 1;
        doctorCharges--;
        renderModeratorList();
    }

    function resetGame() {
        openModal(
            "🔄 Mulai Ulang?",
            "Yakin ingin mereset permainan? Semua peran akan diacak ulang.",
            {
                confirmText: "Reset",
                cancelText: "Batal",
                onConfirm: doResetGame
            }
        );
    }

    function doResetGame() {
        document.getElementById('step-moderator').classList.add('hidden');
        document.getElementById('step-setup').classList.remove('hidden');
        document.getElementById('total-players').value = "";
    }
