import { describe, it, expect, beforeEach } from 'vitest';
import type { ArenaState, ShipState, BattleState } from '../types/game';
import { ARENA_RANKS } from '../types/game';
import { arenaActions } from '../hooks/useArena';

const mockShip: ShipState = {
  currentShield: 100,
  maxShield: 100,
  damage: 10,
  shieldLevel: 1,
  cargoLevel: 1,
  weaponLevel: 1,
  cargoCapacity: 100,
};

const createBattleState = (hp: number, origin: 'arena' | 'world' = 'arena'): BattleState => ({
  player: { x: 0, y: 0, vx: 0, vy: 0, hp, maxHp: 100, angle: 0 },
  pirates: [],
  bullets: [],
  particles: [],
  isPlayerTurn: true,
  result: 'win',
  countdown: 0,
  difficulty: 1,
  shakeTime: 0,
  origin,
});

describe('useArena - arenaActions', () => {
  let baseArena: ArenaState;

  beforeEach(() => {
    baseArena = arenaActions.startArena() as ArenaState;
  });

  describe('startArena', () => {
    it('should initialize with correct starting values', () => {
      const result = arenaActions.startArena() as ArenaState;
      expect(result.phase).toBe('countdown');
      expect(result.currentWave).toBe(1);
      expect(result.wavesSurvived).toBe(0);
      expect(result.countdownTimeRemaining).toBe(3);
      expect(result.restTimeRemaining).toBe(0);
      expect(result.totalCreditsEarned).toBe(0);
      expect(result.finalRank).toBeNull();
      expect(result.finalReward).toBe(0);
      expect(result.waveCompletedFor).toBeNull();
      expect(result.battleCreatedForWave).toBeNull();
    });
  });

  describe('updateArena', () => {
    it('should reduce countdown and transition to battle phase', () => {
      let arena = { ...baseArena };
      let result = arenaActions.updateArena(arena, 2);
      arena = result.arena;
      expect(arena.phase).toBe('countdown');
      expect(Math.abs(arena.countdownTimeRemaining - 1)).toBeLessThan(0.01);
      expect(result.shouldCreateBattle).toBe(false);

      result = arenaActions.updateArena(arena, 2);
      arena = result.arena;
      expect(arena.phase).toBe('battle');
      expect(arena.countdownTimeRemaining).toBe(0);
      expect(arena.waveCompletedFor).toBeNull();
      expect(result.shouldCreateBattle).toBe(true);
      expect(result.waveForBattle).toBe(1);
      expect(arena.battleCreatedForWave).toBe(1);
    });

    it('should reduce rest timer and transition to countdown phase with next wave', () => {
      let arena: ArenaState = {
        ...baseArena,
        phase: 'rest',
        currentWave: 3,
        restTimeRemaining: 10,
        battleCreatedForWave: 3,
      };
      let result = arenaActions.updateArena(arena, 5);
      arena = result.arena;
      expect(arena.phase).toBe('rest');
      expect(Math.abs(arena.restTimeRemaining - 5)).toBeLessThan(0.01);
      expect(result.shouldCreateBattle).toBe(false);

      result = arenaActions.updateArena(arena, 6);
      arena = result.arena;
      expect(arena.phase).toBe('countdown');
      expect(arena.currentWave).toBe(4);
      expect(arena.countdownTimeRemaining).toBe(3);
      expect(arena.restTimeRemaining).toBe(0);
      expect(arena.battleCreatedForWave).toBeNull();
      expect(result.shouldCreateBattle).toBe(false);
    });

    it('should not jump multiple phases with large dt', () => {
      let arena = { ...baseArena };
      const result = arenaActions.updateArena(arena, 0.05);
      arena = result.arena;
      expect(arena.phase).toBe('countdown');
      expect(Math.abs(arena.countdownTimeRemaining - 2.95)).toBeLessThan(0.01);
    });

    it('should signal battle creation only once per wave', () => {
      let arena = { ...baseArena };
      let result = arenaActions.updateArena(arena, 4);
      arena = result.arena;
      expect(result.shouldCreateBattle).toBe(true);
      expect(result.waveForBattle).toBe(1);

      result = arenaActions.updateArena(arena, 1);
      expect(result.shouldCreateBattle).toBe(false);
      expect(result.waveForBattle).toBeNull();
    });
  });

  describe('calculateWaveReward', () => {
    it('should calculate correct reward for wave 1', () => {
      expect(arenaActions.calculateWaveReward(1)).toBe(150);
    });

    it('should calculate correct reward for wave 5', () => {
      expect(arenaActions.calculateWaveReward(5)).toBe(350);
    });

    it('should calculate correct reward for wave 10', () => {
      expect(arenaActions.calculateWaveReward(10)).toBe(600);
    });
  });

  describe('completeArenaWave', () => {
    let battleArena: ArenaState;

    beforeEach(() => {
      battleArena = {
        ...baseArena,
        phase: 'battle',
        currentWave: 1,
      };
    });

    it('should reject completion when phase is not battle', () => {
      const restArena: ArenaState = { ...battleArena, phase: 'rest' };
      const result = arenaActions.completeArenaWave(
        restArena, true, createBattleState(50), mockShip, 500
      );
      expect(result.arena).toBe(restArena);
      expect(result.waveReward).toBe(0);
      expect(result.piratesDefeated).toBe(0);
    });

    it('should reject duplicate completion for same wave', () => {
      const battle = createBattleState(80);
      const result1 = arenaActions.completeArenaWave(
        battleArena, true, battle, mockShip, 500
      );
      expect(result1.waveReward).toBeGreaterThan(0);

      const result2 = arenaActions.completeArenaWave(
        result1.arena, true, battle, mockShip, 500
      );
      expect(result2.waveReward).toBe(0);
      expect(result2.piratesDefeated).toBe(0);
    });

    it('should handle wave win correctly', () => {
      const battle = createBattleState(80);
      const result = arenaActions.completeArenaWave(
        battleArena, true, battle, mockShip, 500
      );

      expect(result.arena.phase).toBe('rest');
      expect(result.arena.wavesSurvived).toBe(1);
      expect(result.arena.currentWave).toBe(1);
      expect(result.arena.restTimeRemaining).toBe(10);
      expect(result.arena.totalCreditsEarned).toBe(150);
      expect(result.arena.waveCompletedFor).toBe(1);

      expect(result.ship.currentShield).toBe(80);
      expect(result.credits).toBe(650);
      expect(result.battleState).toBeNull();
      expect(result.waveReward).toBe(150);
      expect(result.piratesDefeated).toBe(1);
    });

    it('should handle wave loss correctly', () => {
      const battle = createBattleState(0, 'arena');
      battle.result = 'lose';
      const result = arenaActions.completeArenaWave(
        battleArena, false, battle, mockShip, 500
      );

      expect(result.arena.phase).toBe('finished');
      expect(result.arena.wavesSurvived).toBe(0);
      expect(result.arena.finalRank).toBeDefined();
      expect(result.arena.finalRank?.rank).toBe('青铜海盗猎手');
      expect(result.arena.finalReward).toBe(0);
      expect(result.battleState).toBeNull();
      expect(result.leaderboardEntry).toBeDefined();
      expect(result.leaderboardEntry?.wavesSurvived).toBe(0);
    });

    it('should give correct rank for high waves on loss', () => {
      const wave10Arena: ArenaState = {
        ...baseArena,
        phase: 'battle',
        currentWave: 12,
        wavesSurvived: 11,
        totalCreditsEarned: 4950,
      };
      const battle = createBattleState(0, 'arena');
      battle.result = 'lose';
      const result = arenaActions.completeArenaWave(
        wave10Arena, false, battle, mockShip, 1000
      );

      expect(result.arena.wavesSurvived).toBe(11);
      expect(result.arena.finalRank?.rank).toBe('铂金海盗猎手');
      expect(result.arena.finalReward).toBe(4950 * 3);
      expect(result.credits).toBe(1000 + (4950 * 3 - 4950));
    });

    it('should cap player shield at maxShield after win', () => {
      const battle = createBattleState(150);
      const result = arenaActions.completeArenaWave(
        battleArena, true, battle, mockShip, 500
      );
      expect(result.ship.currentShield).toBe(mockShip.maxShield);
    });
  });

  describe('endArena', () => {
    it('should properly finalize with leaderboard entry', () => {
      const activeArena: ArenaState = {
        ...baseArena,
        phase: 'battle',
        currentWave: 5,
        wavesSurvived: 4,
        totalCreditsEarned: 1000,
      };
      const result = arenaActions.endArena(activeArena, mockShip, 2000);

      expect(result.arena.phase).toBe('finished');
      expect(result.arena.wavesSurvived).toBe(4);
      expect(result.arena.finalRank?.rank).toBe('白银海盗猎手');
      expect(result.arena.finalReward).toBe(1500);
      expect(result.battleState).toBeNull();
      expect(result.leaderboardEntry).toBeDefined();
      expect(result.leaderboardEntry?.wavesSurvived).toBe(4);
      expect(result.leaderboardEntry?.creditsEarned).toBe(1500);
      expect(result.leaderboardEntry?.rank).toBe('白银海盗猎手');
    });
  });

  describe('repairShieldDuringRest', () => {
    let restArena: ArenaState;
    let damagedShip: ShipState;

    beforeEach(() => {
      restArena = { ...baseArena, phase: 'rest', currentWave: 1 };
      damagedShip = { ...mockShip, currentShield: 50 };
    });

    it('should reject repair when phase is not rest', () => {
      const battleArenaPhase: ArenaState = { ...restArena, phase: 'battle' };
      const result = arenaActions.repairShieldDuringRest(
        battleArenaPhase, damagedShip, 500
      );
      expect(result).toBeNull();
    });

    it('should reject repair when shield is full', () => {
      const fullShip = { ...mockShip, currentShield: 100 };
      const result = arenaActions.repairShieldDuringRest(
        restArena, fullShip, 500
      );
      expect(result).toBeNull();
    });

    it('should reject repair when credits are insufficient', () => {
      const result = arenaActions.repairShieldDuringRest(
        restArena, damagedShip, 50
      );
      expect(result).toBeNull();
    });

    it('should repair shield fully when resources are sufficient', () => {
      const result = arenaActions.repairShieldDuringRest(
        restArena, damagedShip, 200
      );
      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.ship.currentShield).toBe(100);
      expect(result?.credits).toBe(200 - 100);
    });
  });

  describe('getArenaRank', () => {
    it('should return bronze for 0-3 waves', () => {
      expect(arenaActions.getArenaRank(0)?.rank).toBe('青铜海盗猎手');
      expect(arenaActions.getArenaRank(2)?.rank).toBe('青铜海盗猎手');
      expect(arenaActions.getArenaRank(3)?.rank).toBe('青铜海盗猎手');
    });

    it('should return silver for 4-6 waves', () => {
      expect(arenaActions.getArenaRank(4)?.rank).toBe('白银海盗猎手');
      expect(arenaActions.getArenaRank(5)?.rank).toBe('白银海盗猎手');
      expect(arenaActions.getArenaRank(6)?.rank).toBe('白银海盗猎手');
    });

    it('should return gold for 7-9 waves', () => {
      expect(arenaActions.getArenaRank(7)?.rank).toBe('黄金海盗猎手');
      expect(arenaActions.getArenaRank(9)?.rank).toBe('黄金海盗猎手');
    });

    it('should return platinum for 10-14 waves', () => {
      expect(arenaActions.getArenaRank(10)?.rank).toBe('铂金海盗猎手');
      expect(arenaActions.getArenaRank(14)?.rank).toBe('铂金海盗猎手');
    });

    it('should return diamond for 15-19 waves', () => {
      expect(arenaActions.getArenaRank(15)?.rank).toBe('钻石海盗猎手');
      expect(arenaActions.getArenaRank(19)?.rank).toBe('钻石海盗猎手');
    });

    it('should return legendary for 20+ waves', () => {
      expect(arenaActions.getArenaRank(20)?.rank).toBe('传奇海盗克星');
      expect(arenaActions.getArenaRank(100)?.rank).toBe('传奇海盗克星');
    });

    it('should return a rank with proper reward multipliers', () => {
      ARENA_RANKS.forEach((rank) => {
        const result = arenaActions.getArenaRank(rank.minWaves);
        expect(result?.rewardMultiplier).toBe(rank.rewardMultiplier);
        expect(result?.color).toBe(rank.color);
      });
    });
  });

  describe('Idempotency and race condition tests', () => {
    it('calling completeArenaWave twice with won=true is idempotent', () => {
      const arena: ArenaState = {
        ...baseArena,
        phase: 'battle',
        currentWave: 3,
      };
      const battle = createBattleState(70);
      const ship = { ...mockShip, maxShield: 200, currentShield: 70 };
      const initialCredits = 1000;

      const result1 = arenaActions.completeArenaWave(
        arena, true, battle, ship, initialCredits
      );
      const result2 = arenaActions.completeArenaWave(
        result1.arena, true, battle, result1.ship, result1.credits
      );

      expect(result2.arena.phase).toBe('rest');
      expect(result2.arena.totalCreditsEarned).toBe(result1.arena.totalCreditsEarned);
      expect(result2.credits).toBe(result1.credits);
      expect(result2.arena.wavesSurvived).toBe(result1.arena.wavesSurvived);
    });

    it('should handle correct phase transitions for 3 full waves', () => {
      let arena: ArenaState = baseArena;
      let ship = { ...mockShip };
      let credits = 500;
      let battle: BattleState | null = null;

      arena = arenaActions.updateArena(arena, 3).arena;
      expect(arena.phase).toBe('battle');

      battle = createBattleState(80, 'arena');
      const wave1 = arenaActions.completeArenaWave(arena, true, battle, ship, credits);
      arena = wave1.arena;
      ship = wave1.ship;
      credits = wave1.credits;
      battle = wave1.battleState;

      expect(arena.phase).toBe('rest');
      expect(arena.wavesSurvived).toBe(1);
      expect(credits).toBeGreaterThan(500);

      arena = arenaActions.updateArena(arena, 10).arena;
      expect(arena.phase).toBe('countdown');
      expect(arena.currentWave).toBe(2);

      arena = arenaActions.updateArena(arena, 3).arena;
      expect(arena.phase).toBe('battle');

      battle = createBattleState(60, 'arena');
      const wave2 = arenaActions.completeArenaWave(arena, true, battle, ship, credits);
      arena = wave2.arena;
      ship = wave2.ship;
      credits = wave2.credits;

      expect(arena.phase).toBe('rest');
      expect(arena.wavesSurvived).toBe(2);
      expect(ship.currentShield).toBe(60);

      const repairResult = arenaActions.repairShieldDuringRest(arena, ship, credits);
      expect(repairResult?.success).toBe(true);
      if (repairResult) {
        ship = repairResult.ship;
        credits = repairResult.credits;
      }
      expect(ship.currentShield).toBe(ship.maxShield);

      arena = arenaActions.updateArena(arena, 10).arena;
      arena = arenaActions.updateArena(arena, 3).arena;
      expect(arena.phase).toBe('battle');
      expect(arena.currentWave).toBe(3);

      battle = createBattleState(0, 'arena');
      battle.result = 'lose';
      const wave3 = arenaActions.completeArenaWave(arena, false, battle, ship, credits);
      arena = wave3.arena;

      expect(arena.phase).toBe('finished');
      expect(arena.wavesSurvived).toBe(2);
      expect(arena.finalRank?.rank).toBe('青铜海盗猎手');
      expect(wave3.leaderboardEntry).toBeDefined();
    });
  });
});
