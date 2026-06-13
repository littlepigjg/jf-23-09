import { useCallback } from 'react';
import type { LeaderboardEntry } from '../types/game';

export interface LeaderboardActions {
  addEntry: (
    leaderboard: LeaderboardEntry[],
    entry: Omit<LeaderboardEntry, 'id' | 'date'>
  ) => LeaderboardEntry[];
  getSortedLeaderboard: (leaderboard: LeaderboardEntry[]) => LeaderboardEntry[];
  clearLeaderboard: () => [];
}

export const MAX_LEADERBOARD_ENTRIES = 100;

export const leaderboardActions: LeaderboardActions = {
  addEntry: (leaderboard, entry) => {
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: `lb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: Date.now(),
    };
    return [...leaderboard, newEntry]
      .sort((a, b) => b.wavesSurvived - a.wavesSurvived || b.creditsEarned - a.creditsEarned)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
  },

  getSortedLeaderboard: (leaderboard) => {
    return [...leaderboard].sort(
      (a, b) => b.wavesSurvived - a.wavesSurvived || b.creditsEarned - a.creditsEarned
    );
  },

  clearLeaderboard: () => [],
};

export function useLeaderboard() {
  const addEntry = useCallback(
    (leaderboard: LeaderboardEntry[], entry: Omit<LeaderboardEntry, 'id' | 'date'>) =>
      leaderboardActions.addEntry(leaderboard, entry),
    []
  );

  const getSortedLeaderboard = useCallback(
    (leaderboard: LeaderboardEntry[]) => leaderboardActions.getSortedLeaderboard(leaderboard),
    []
  );

  const clearLeaderboard = useCallback(() => leaderboardActions.clearLeaderboard(), []);

  return {
    addEntry,
    getSortedLeaderboard,
    clearLeaderboard,
  };
}
