import { describe, it, expect, beforeEach } from 'vitest';
import type { LeaderboardEntry } from '../types/game';
import { leaderboardActions, MAX_LEADERBOARD_ENTRIES } from '../hooks/useLeaderboard';

const createEntry = (
  waves: number,
  credits: number,
  rank: string = '青铜海盗猎手',
  shipLevel: number = 3
): Omit<LeaderboardEntry, 'id' | 'date'> => ({
  playerName: '舰长',
  wavesSurvived: waves,
  creditsEarned: credits,
  rank,
  shipLevel,
});

describe('useLeaderboard - leaderboardActions', () => {
  let emptyLeaderboard: LeaderboardEntry[];

  beforeEach(() => {
    emptyLeaderboard = [];
  });

  describe('addEntry', () => {
    it('should add a single entry to empty leaderboard', () => {
      const result = leaderboardActions.addEntry(
        emptyLeaderboard,
        createEntry(5, 1000, '白银海盗猎手')
      );

      expect(result).toHaveLength(1);
      expect(result[0].wavesSurvived).toBe(5);
      expect(result[0].creditsEarned).toBe(1000);
      expect(result[0].rank).toBe('白银海盗猎手');
      expect(result[0].id).toBeDefined();
      expect(result[0].date).toBeDefined();
    });

    it('should sort entries by wavesSurvived descending', () => {
      let lb = leaderboardActions.addEntry(emptyLeaderboard, createEntry(3, 500));
      lb = leaderboardActions.addEntry(lb, createEntry(10, 3000, '铂金海盗猎手'));
      lb = leaderboardActions.addEntry(lb, createEntry(5, 1000, '白银海盗猎手'));

      expect(lb).toHaveLength(3);
      expect(lb[0].wavesSurvived).toBe(10);
      expect(lb[1].wavesSurvived).toBe(5);
      expect(lb[2].wavesSurvived).toBe(3);
    });

    it('should sort by creditsEarned when wavesSurvived are equal', () => {
      let lb = leaderboardActions.addEntry(emptyLeaderboard, createEntry(5, 800));
      lb = leaderboardActions.addEntry(lb, createEntry(5, 1500));
      lb = leaderboardActions.addEntry(lb, createEntry(5, 1000));

      expect(lb[0].creditsEarned).toBe(1500);
      expect(lb[1].creditsEarned).toBe(1000);
      expect(lb[2].creditsEarned).toBe(800);
    });

    it('should generate unique ids for each entry', () => {
      let lb = emptyLeaderboard;
      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        lb = leaderboardActions.addEntry(lb, createEntry(i, i * 100));
        ids.add(lb[0].id);
      }

      expect(ids.size).toBe(10);
    });

    it('should generate dates in chronological order', () => {
      const lb1 = leaderboardActions.addEntry(emptyLeaderboard, createEntry(1, 100));
      const date1 = lb1[0].date;

      const lb2 = leaderboardActions.addEntry(lb1, createEntry(2, 200));
      const newestEntry = lb2.find((e) => e.wavesSurvived === 2)!;
      expect(newestEntry.date).toBeGreaterThanOrEqual(date1);
    });

    it(`should cap entries at ${MAX_LEADERBOARD_ENTRIES}`, () => {
      let lb = emptyLeaderboard;
      for (let i = 0; i < 150; i++) {
        lb = leaderboardActions.addEntry(lb, createEntry(i, i * 100));
      }

      expect(lb.length).toBe(MAX_LEADERBOARD_ENTRIES);
      expect(lb[0].wavesSurvived).toBe(149);
      expect(lb[lb.length - 1].wavesSurvived).toBe(50);
    });

    it('should keep top performing entries when cap is exceeded', () => {
      let lb = emptyLeaderboard;
      for (let i = 0; i < 110; i++) {
        lb = leaderboardActions.addEntry(lb, createEntry(i, i * 100));
      }

      const allAboveThreshold = lb.every((e) => e.wavesSurvived >= 10);
      expect(allAboveThreshold).toBe(true);
      expect(lb.some((e) => e.wavesSurvived < 10)).toBe(false);
    });
  });

  describe('getSortedLeaderboard', () => {
    it('should return empty array for empty input', () => {
      expect(leaderboardActions.getSortedLeaderboard([])).toEqual([]);
    });

    it('should sort by wavesSurvived descending', () => {
      const unsorted: LeaderboardEntry[] = [
        { ...createEntry(3, 500), id: '1', date: 1000 },
        { ...createEntry(15, 5000, '钻石海盗猎手'), id: '2', date: 2000 },
        { ...createEntry(7, 1500, '黄金海盗猎手'), id: '3', date: 1500 },
      ];

      const sorted = leaderboardActions.getSortedLeaderboard(unsorted);
      expect(sorted[0].wavesSurvived).toBe(15);
      expect(sorted[1].wavesSurvived).toBe(7);
      expect(sorted[2].wavesSurvived).toBe(3);
    });

    it('should sort by credits for equal waves', () => {
      const unsorted: LeaderboardEntry[] = [
        { ...createEntry(5, 800), id: '1', date: 1000 },
        { ...createEntry(5, 2000), id: '2', date: 2000 },
        { ...createEntry(5, 1200), id: '3', date: 1500 },
      ];

      const sorted = leaderboardActions.getSortedLeaderboard(unsorted);
      expect(sorted.map((e) => e.creditsEarned)).toEqual([2000, 1200, 800]);
    });

    it('should not mutate the original array', () => {
      const original: LeaderboardEntry[] = [
        { ...createEntry(3, 500), id: '1', date: 1000 },
        { ...createEntry(7, 1500), id: '3', date: 1500 },
      ];
      const originalCopy = [...original];

      leaderboardActions.getSortedLeaderboard(original);

      expect(original).toEqual(originalCopy);
    });
  });

  describe('clearLeaderboard', () => {
    it('should return empty array', () => {
      expect(leaderboardActions.clearLeaderboard()).toEqual([]);
    });

    it('should work with existing entries cleared', () => {
      let lb = leaderboardActions.addEntry(emptyLeaderboard, createEntry(5, 1000));
      expect(lb.length).toBe(1);

      lb = leaderboardActions.clearLeaderboard();
      expect(lb).toEqual([]);
      expect(lb.length).toBe(0);
    });
  });

  describe('Integration: Add and sort workflow', () => {
    it('should handle real game workflow correctly', () => {
      let lb = emptyLeaderboard;

      lb = leaderboardActions.addEntry(lb, createEntry(2, 350));
      lb = leaderboardActions.addEntry(lb, createEntry(5, 1100, '白银海盗猎手'));
      lb = leaderboardActions.addEntry(lb, createEntry(12, 5000, '铂金海盗猎手'));
      lb = leaderboardActions.addEntry(lb, createEntry(5, 900, '白银海盗猎手'));
      lb = leaderboardActions.addEntry(lb, createEntry(22, 30000, '传奇海盗克星', 15));

      const sorted = leaderboardActions.getSortedLeaderboard(lb);

      expect(sorted[0].rank).toBe('传奇海盗克星');
      expect(sorted[0].wavesSurvived).toBe(22);
      expect(sorted[0].shipLevel).toBe(15);

      expect(sorted[1].rank).toBe('铂金海盗猎手');

      expect(sorted[2].wavesSurvived).toBe(5);
      expect(sorted[2].creditsEarned).toBe(1100);

      expect(sorted[3].wavesSurvived).toBe(5);
      expect(sorted[3].creditsEarned).toBe(900);

      expect(sorted[4].wavesSurvived).toBe(2);
    });
  });
});
