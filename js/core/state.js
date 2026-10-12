import { roleDetails } from '../data/roles.js';
export const state = { roleDetails, allRoles: Object.keys(roleDetails), activeRoles: ['Seer','Guardian','Doctor'], MIN_ACTIVE_ROLES: 2, availableRoles: [], players: [], totalPlayers: 0, currentPlayerIdx: 0, currentRole: '', pendingName: '', werewolfSpotted: false, hasDoctor: false, doctorCharges: 0, modalCallback: null };
