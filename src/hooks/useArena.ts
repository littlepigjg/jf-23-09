import { useCallback } from 'react';
import type { ArenaState, ArenaRank, LeaderboardEntry, ShipState, BattleState } from '../types/game';
import { ARENA_RANKS } from '../types/game';

export interface ArenaActions {
  startArena: () => Partial<ArenaState>;
  updateArena: (state: ArenaState, dt: number) => ArenaState;
  completeArenaWave: (
    arenaState: ArenaState,
    won: boolean,
    battleState: BattleState | null,
    ship: ShipState,
    credits: number
  ) => {
    arena: ArenaState;
    ship: ShipState;
    credits: number;
    battleState: null;
    waveReward: number;
    leaderboardEntry?: Omit<LeaderboardEntry, 'id' | 'date'>;
    piratesDefeated: number;
  };
  endArena: (arenaState: ArenaState, ship: ShipState, credits: number) => {
    arena: ArenaState;
    battleState: null;
    leaderboardEntry: Omit<LeaderboardEntry, 'id' | 'date'>;
  };
  repairShieldDuringRest: (arenaState: ArenaState, ship: ShipState, credits: number) => {
    success: boolean;
    ship: ShipState;
    credits: number;
  } | null;
  getArenaRank: (waves: number) => ArenaRank | null;
  calculateWaveReward: (wave: number) => number;
}

export const arenaActions: ArenaActions = {
  startArena: () => ({
    phase: 'countdown',
    currentWave: 1,
    wavesSurvived: 0,
    restTimeRemaining: 0,
    countdownTimeRemaining: 3,
    totalCreditsEarned: 0,
    finalRank: null,
    finalReward: 0,
  }),

  updateArena: (state, dt) => {
    const arena = { ...state };

    if (arena.phase === 'countdown') {
      arena.countdownTimeRemaining -= dt;
      if (arena.countdownTimeRemaining <= 0) {
        arena.phase = 'battle';
        arena.countdownTimeRemaining = 0;
      }
    } else if (arena.phase === 'rest') {
      arena.restTimeRemaining -= dt;
      if (arena.restTimeRemaining <= 0) {
        arena.phase = 'countdown';
        arena.currentWave += 1;
        arena.countdownTimeRemaining = 3;
        arena.restTimeRemaining = 0;
      }
    }

    return arena;
  },

  calculateWaveReward: (wave) => 100 + wave * 50,

  completeArenaWave: (arenaState, won, battleState, ship, credits) => {
    const arena = { ...arenaState };
    let newShip = { ...ship };
    let newCredits = credits;
    let piratesDefeated = 0;

    if (won) {
      const waveReward = arenaActions.calculateWaveReward(arena.currentWave);
      arena.wavesSurvived = arena.currentWave;
      arena.totalCreditsEarned += waveReward;
      newCredits += waveReward;
      piratesDefeated = 1;

      if (battleState?.player.hp !== undefined) {
        newShip.currentShield = Math.max(0, Math.min(ship.maxShield, battleState.player.hp));
      }

      arena.phase = 'rest';
      arena.restTimeRemaining = 10;

      return {
        arena,
        ship: newShip,
        credits: newCredits,
        battleState: null,
        waveReward,
        piratesDefeated,
      };
    } else {
      arena.wavesSurvived = Math.max(0, arena.currentWave - 1);
      arena.phase = 'finished';

      const rank = arenaActions.getArenaRank(arena.wavesSurvived);
      arena.finalRank = rank;
      const baseReward = arena.totalCreditsEarned;
      const finalReward = Math.floor(baseReward * (rank?.rewardMultiplier ?? 1));
      arena.finalReward = finalReward;

      const bonusCredits = finalReward - arena.totalCreditsEarned;
      if (bonusCredits > 0) {
        newCredits += bonusCredits;
      }

      const leaderboardEntry: Omit<LeaderboardEntry, 'id' | 'date'> = {
        playerName: '舰长',
        wavesSurvived: arena.wavesSurvived,
        creditsEarned: finalReward,
        rank: rank?.rank ?? '青铜海盗猎手',
        shipLevel: ship.shieldLevel + ship.cargoLevel + ship.weaponLevel,
      };

      return {
        arena,
        ship: newShip,
        credits: newCredits,
        battleState: null,
        waveReward: 0,
        leaderboardEntry,
        piratesDefeated: arena.wavesSurvived,
      };
    }
  },

  endArena: (arenaState, ship) => {
    const arena = { ...arenaState };
    arena.phase = 'finished';
    arena.wavesSurvived = Math.max(0, arena.currentWave - 1);

    const rank = arenaActions.getArenaRank(arena.wavesSurvived);
    arena.finalRank = rank;
    const finalReward = Math.floor(arena.totalCreditsEarned * (rank?.rewardMultiplier ?? 1));
    arena.finalReward = finalReward;

    const leaderboardEntry: Omit<LeaderboardEntry, 'id' | 'date'> = {
      playerName: '舰长',
      wavesSurvived: arena.wavesSurvived,
      creditsEarned: finalReward,
      rank: rank?.rank ?? '青铜海盗猎手',
      shipLevel: ship.shieldLevel + ship.cargoLevel + ship.weaponLevel,
    };

    return {
      arena,
      battleState: null,
      leaderboardEntry,
    };
  },

  repairShieldDuringRest: (arenaState, ship, credits) => {
    if (arenaState.phase !== 'rest') return null;

    const missing = ship.maxShield - ship.currentShield;
    if (missing <= 0) return null;

    const cost = missing * 2;
    if (credits < cost) return null;

    return {
      success: true,
      ship: { ...ship, currentShield: ship.maxShield },
      credits: credits - cost,
    };
  },

  getArenaRank: (waves) => {
    for (const rank of ARENA_RANKS) {
      if (waves >= rank.minWaves && waves <= rank.maxWaves) {
        return rank;
      }
    }
    return ARENA_RANKS[ARENA_RANKS.length - 1];
  },
};

export function useArena() {
  const startArena = useCallback(() => arenaActions.startArena(), []);
  const updateArena = useCallback((state: ArenaState, dt: number) => arenaActions.updateArena(state, dt), []);
  const completeArenaWave = useCallback((
    arenaState: ArenaState,
    won: boolean,
    battleState: BattleState | null,
    ship: ShipState,
    credits: number
  ) => arenaActions.completeArenaWave(arenaState, won, battleState, ship, credits), []);
  const endArena = useCallback((arenaState: ArenaState, ship: ShipState, credits: number) => arenaActions.endArena(arenaState, ship, credits), []);
  const repairShieldDuringRest = useCallback((arenaState: ArenaState, ship: ShipState, credits: number) => arenaActions.repairShieldDuringRest(arenaState, ship, credits), []);
  const getArenaRank = useCallback((waves: number) => arenaActions.getArenaRank(waves), []);
  const calculateWaveReward = useCallback((wave: number) => arenaActions.calculateWaveReward(wave), []);

  return {
    startArena,
    updateArena,
    completeArenaWave,
    endArena,
    repairShieldDuringRest,
    getArenaRank,
    calculateWaveReward,
  };
}
