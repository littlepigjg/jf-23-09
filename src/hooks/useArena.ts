import { useCallback, useEffect, useRef } from 'react';
import type { ArenaState, ArenaRank, LeaderboardEntry, ShipState, BattleState } from '../types/game';
import { ARENA_RANKS } from '../types/game';

export interface ArenaUpdateResult {
  arena: ArenaState;
  shouldCreateBattle: boolean;
  waveForBattle: number | null;
}

export interface ArenaActions {
  startArena: () => Partial<ArenaState>;
  updateArena: (state: ArenaState, dt: number) => ArenaUpdateResult;
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
    battleState: BattleState | null;
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
    waveCompletedFor: null,
    battleCreatedForWave: null,
  }),

  updateArena: (state, dt) => {
    const arena = { ...state };
    let shouldCreateBattle = false;
    let waveForBattle: number | null = null;

    if (arena.phase === 'countdown') {
      arena.countdownTimeRemaining -= dt;
      if (arena.countdownTimeRemaining <= 0) {
        arena.phase = 'battle';
        arena.countdownTimeRemaining = 0;
        arena.waveCompletedFor = null;

        if (arena.battleCreatedForWave !== arena.currentWave) {
          shouldCreateBattle = true;
          waveForBattle = arena.currentWave;
          arena.battleCreatedForWave = arena.currentWave;
        }
      }
    } else if (arena.phase === 'rest') {
      arena.restTimeRemaining -= dt;
      if (arena.restTimeRemaining <= 0) {
        arena.phase = 'countdown';
        arena.currentWave += 1;
        arena.countdownTimeRemaining = 3;
        arena.restTimeRemaining = 0;
        arena.battleCreatedForWave = null;
      }
    }

    return { arena, shouldCreateBattle, waveForBattle };
  },

  calculateWaveReward: (wave) => 100 + wave * 50,

  completeArenaWave: (arenaState, won, battleState, ship, credits) => {
    if (arenaState.phase !== 'battle') {
      return {
        arena: arenaState,
        ship,
        credits,
        battleState,
        waveReward: 0,
        piratesDefeated: 0,
      };
    }
    if (arenaState.waveCompletedFor === arenaState.currentWave) {
      return {
        arena: arenaState,
        ship,
        credits,
        battleState,
        waveReward: 0,
        piratesDefeated: 0,
      };
    }

    const arena = { ...arenaState };
    arena.waveCompletedFor = arena.currentWave;

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
    if (waves <= 0) {
      return ARENA_RANKS[0];
    }
    for (const rank of ARENA_RANKS) {
      if (waves >= rank.minWaves && waves <= rank.maxWaves) {
        return rank;
      }
    }
    return ARENA_RANKS[ARENA_RANKS.length - 1];
  },
};

export function useArena(
  arenaState: ArenaState | null,
  onUpdate: (arena: ArenaState, shouldCreateBattle: boolean, waveForBattle: number | null) => void
) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const arenaStateRef = useRef<ArenaState | null>(arenaState);

  useEffect(() => {
    arenaStateRef.current = arenaState;
  }, [arenaState]);

  useEffect(() => {
    if (!arenaState) {
      cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const current = arenaStateRef.current;
      if (!current) return;

      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (dt > 0) {
        const result = arenaActions.updateArena(current, dt);
        onUpdate(result.arena, result.shouldCreateBattle, result.waveForBattle);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arenaState !== null, onUpdate]);

  const startArena = useCallback(() => arenaActions.startArena(), []);
  const completeArenaWave = useCallback((
    s: ArenaState,
    won: boolean,
    bs: BattleState | null,
    sh: ShipState,
    cr: number
  ) => arenaActions.completeArenaWave(s, won, bs, sh, cr), []);
  const endArena = useCallback((s: ArenaState, sh: ShipState, cr: number) => arenaActions.endArena(s, sh, cr), []);
  const repairShieldDuringRest = useCallback((s: ArenaState, sh: ShipState, cr: number) => arenaActions.repairShieldDuringRest(s, sh, cr), []);
  const getArenaRank = useCallback((waves: number) => arenaActions.getArenaRank(waves), []);
  const calculateWaveReward = useCallback((wave: number) => arenaActions.calculateWaveReward(wave), []);

  return {
    startArena,
    completeArenaWave,
    endArena,
    repairShieldDuringRest,
    getArenaRank,
    calculateWaveReward,
  };
}
