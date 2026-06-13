import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ARENA_RANKS } from '../types/game';

export default function ArenaPanel() {
  const {
    arenaState,
    ship,
    credits,
    startArena,
    updateArena,
    endArena,
    repairShieldDuringRest,
    setView,
    getArenaRank,
  } = useGameStore();

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const isActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isActiveRef.current = arenaState !== null;

    if (!arenaState) {
      cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!isActiveRef.current) return;

      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (dt > 0) {
        updateArena(dt);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arenaState !== null, updateArena]);

  const handleStart = () => {
    startArena();
  };

  const handleExit = () => {
    isActiveRef.current = false;
    endArena();
    setView('starmap');
  };

  const handleLeaveFinished = () => {
    isActiveRef.current = false;
    useGameStore.setState({ arenaState: null });
    setView('starmap');
  };

  const handleRepair = () => {
    repairShieldDuringRest();
  };

  const handleViewLeaderboard = () => {
    setView('leaderboard');
  };

  if (!arenaState) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-4">
              ⚔️ 海盗竞技场
            </h1>
            <p className="text-slate-400 text-lg">
              挑战无尽的海盗波次，证明你是最强的海盗猎手！
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="panel p-6 border border-slate-700/60">
              <h3 className="text-lg font-bold text-neon-cyan mb-3">📜 规则说明</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>第 N 波会出现 N 艘海盗船</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>每波之间有 10 秒休息时间</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>休息期间可以花费信用点修复护盾</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>每波胜利获得 100 + 波次 × 50 信用点</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>最终奖励根据排名有额外加成</span>
                </li>
              </ul>
            </div>

            <div className="panel p-6 border border-slate-700/60">
              <h3 className="text-lg font-bold text-neon-yellow mb-3">🏆 排名体系</h3>
              <div className="space-y-2">
                {ARENA_RANKS.map((rank) => (
                  <div key={rank.rank} className="flex items-center justify-between text-sm">
                    <span style={{ color: rank.color }} className="font-semibold">
                      {rank.rank}
                    </span>
                    <span className="text-slate-400">
                      {rank.minWaves}-{rank.maxWaves === 999 ? '∞' : rank.maxWaves} 波 · ×{rank.rewardMultiplier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-lg rounded-lg transition-all shadow-lg shadow-orange-900/50 hover:scale-105 hover:shadow-orange-500/30"
            >
              🚀 开始挑战
            </button>
            <button
              onClick={handleViewLeaderboard}
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all border border-slate-600 hover:border-neon-yellow"
            >
              🏆 排行榜
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentRank = getArenaRank(arenaState.wavesSurvived || arenaState.currentWave);
  const shieldPercent = (ship.currentShield / ship.maxShield) * 100;
  const repairCost = (ship.maxShield - ship.currentShield) * 2;
  const canRepair = ship.currentShield < ship.maxShield && credits >= repairCost;

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
            ⚔️ 海盗竞技场
          </h1>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="panel p-4 text-center border border-slate-700/60">
            <div className="text-xs text-slate-400 mb-1">当前波次</div>
            <div className="text-3xl font-black text-neon-cyan">{arenaState.currentWave}</div>
          </div>
          <div className="panel p-4 text-center border border-slate-700/60">
            <div className="text-xs text-slate-400 mb-1">已存活</div>
            <div className="text-3xl font-black text-neon-green">{arenaState.wavesSurvived}</div>
          </div>
          <div className="panel p-4 text-center border border-slate-700/60">
            <div className="text-xs text-slate-400 mb-1">当前排名</div>
            <div className="text-lg font-bold" style={{ color: currentRank?.color }}>
              {currentRank?.rank}
            </div>
          </div>
          <div className="panel p-4 text-center border border-slate-700/60">
            <div className="text-xs text-slate-400 mb-1">已获得</div>
            <div className="text-3xl font-black text-neon-yellow">₵{arenaState.totalCreditsEarned.toLocaleString()}</div>
          </div>
        </div>

        <div className="panel p-6 border border-slate-700/60 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <div className="text-sm text-slate-400">护盾状态</div>
                <div className="font-mono text-lg">
                  <span className="text-white">{ship.currentShield}</span>
                  <span className="text-slate-500"> / {ship.maxShield}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">持有信用点</div>
              <div className="font-mono text-lg text-neon-yellow">₵{credits.toLocaleString()}</div>
            </div>
          </div>
          <div className="h-4 bg-space-800 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-300 ${
                shieldPercent > 60 ? 'bg-neon-cyan' : shieldPercent > 30 ? 'bg-neon-yellow' : 'bg-neon-red'
              }`}
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
        </div>

        {arenaState.phase === 'countdown' && (
          <div className="panel p-8 border border-neon-cyan/50 text-center">
            <div className="text-6xl font-black text-neon-cyan mb-4 animate-pulse">
              {Math.ceil(arenaState.countdownTimeRemaining)}
            </div>
            <div className="text-xl text-slate-300">
              准备迎战第 <span className="text-neon-orange font-bold">{arenaState.currentWave}</span> 波！
            </div>
            <div className="text-slate-400 mt-2">
              敌人数量: <span className="text-red-400 font-bold">{arenaState.currentWave}</span> 艘海盗船
            </div>
          </div>
        )}

        {arenaState.phase === 'rest' && (
          <div className="panel p-8 border border-neon-green/50">
            <div className="text-center mb-6">
              <div className="text-4xl font-black text-neon-green mb-2">✅ 波次胜利！</div>
              <div className="text-slate-300">
                获得奖励: <span className="text-neon-yellow font-bold">₵{(100 + (arenaState.wavesSurvived) * 50).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-space-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400 mb-1">下一波倒计时</div>
                  <div className="text-3xl font-mono font-bold text-neon-orange">
                    {Math.ceil(arenaState.restTimeRemaining)}s
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400 mb-1">第 {arenaState.currentWave + 1} 波</div>
                  <div className="text-lg text-red-400 font-bold">
                    {arenaState.currentWave + 1} 艘海盗船
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleRepair}
                disabled={!canRepair}
                className={`px-6 py-3 font-bold rounded-lg transition-all ${
                  canRepair
                    ? 'bg-neon-cyan hover:bg-cyan-400 text-slate-900 hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                🔧 修复护盾 (₵{repairCost})
              </button>
              <button
                onClick={handleExit}
                className="px-6 py-3 bg-slate-700 hover:bg-red-600 text-white font-bold rounded-lg transition-all border border-slate-600 hover:border-red-500"
              >
                🏃 放弃挑战
              </button>
            </div>
          </div>
        )}

        {arenaState.phase === 'finished' && (
          <div className="panel p-8 border border-neon-yellow/50 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <div className="text-3xl font-black text-neon-yellow mb-2">挑战结束！</div>
            <div className="text-xl text-slate-300 mb-6">
              你成功存活了 <span className="text-neon-cyan font-bold">{arenaState.wavesSurvived}</span> 波
            </div>

            <div className="bg-space-800/50 rounded-lg p-6 mb-6">
              <div className="text-lg mb-4" style={{ color: arenaState.finalRank?.color }}>
                <span className="text-2xl">🎖️</span>{' '}
                <span className="font-black text-xl">{arenaState.finalRank?.rank}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">基础奖励</div>
                  <div className="font-mono text-lg text-white">₵{arenaState.totalCreditsEarned.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400">排名加成</div>
                  <div className="font-mono text-lg text-neon-green">×{arenaState.finalRank?.rewardMultiplier || 1}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-slate-400 text-sm">最终奖励</div>
                <div className="font-mono text-3xl font-black text-neon-yellow">
                  ₵{arenaState.finalReward.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg transition-all shadow-lg hover:scale-105"
              >
                🔄 再次挑战
              </button>
              <button
                onClick={handleViewLeaderboard}
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all border border-slate-600 hover:border-neon-yellow"
              >
                🏆 查看排行榜
              </button>
              <button
                onClick={handleLeaveFinished}
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all border border-slate-600"
              >
                ⬅️ 返回
              </button>
            </div>
          </div>
        )}

        {arenaState.phase === 'battle' && (
          <div className="panel p-8 border border-neon-red/50 text-center">
            <div className="text-4xl mb-4 animate-pulse">⚔️</div>
            <div className="text-2xl font-black text-neon-red mb-2">战斗进行中...</div>
            <div className="text-slate-400">
              正在对抗第 {arenaState.currentWave} 波海盗
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
