import { useGameStore } from '../store/useGameStore';
import { ARENA_RANKS } from '../types/game';

export default function LeaderboardPanel() {
  const { getSortedLeaderboard, clearLeaderboard, setView } = useGameStore();
  const leaderboard = getSortedLeaderboard();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRankColor = (rankName: string) => {
    const rank = ARENA_RANKS.find((r) => r.rank === rankName);
    return rank?.color || '#cd7f32';
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  const handleClear = () => {
    if (window.confirm('确定要清空排行榜吗？此操作不可撤销。')) {
      clearLeaderboard();
    }
  };

  const handleBack = () => {
    setView('arena');
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
              🏆 竞技场排行榜
            </h1>
            <p className="text-slate-400">最强海盗猎手的荣耀殿堂</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all border border-slate-600 hover:border-neon-cyan"
            >
              ⚔️ 竞技场
            </button>
            <button
              onClick={handleClear}
              className="px-5 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 font-semibold rounded-lg transition-all border border-red-800/50 hover:border-red-500"
            >
              🗑️ 清空
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mb-6">
          {ARENA_RANKS.map((rank) => (
            <div
              key={rank.rank}
              className="panel p-3 text-center border border-slate-700/60"
            >
              <div className="text-2xl mb-1">🎖️</div>
              <div
                className="text-xs font-bold mb-1 truncate"
                style={{ color: rank.color }}
              >
                {rank.rank}
              </div>
              <div className="text-xs text-slate-400">
                {rank.minWaves}-{rank.maxWaves === 999 ? '∞' : rank.maxWaves}波
              </div>
              <div className="text-xs text-neon-green mt-1">×{rank.rewardMultiplier}</div>
            </div>
          ))}
        </div>

        <div className="panel border border-slate-700/60 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-space-800/50 border-b border-slate-700/60 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1 text-center">排名</div>
            <div className="col-span-2">玩家</div>
            <div className="col-span-2 text-center">存活波次</div>
            <div className="col-span-2 text-center">获得信用点</div>
            <div className="col-span-3 text-center">头衔</div>
            <div className="col-span-2 text-center">日期</div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-6xl mb-4 opacity-50">🏆</div>
              <div className="text-slate-400 text-lg mb-2">暂无记录</div>
              <div className="text-slate-500 text-sm">完成一次竞技场挑战即可上榜</div>
              <button
                onClick={handleBack}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg transition-all shadow-lg hover:scale-105"
              >
                🚀 开始挑战
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/40 max-h-[500px] overflow-y-auto">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-4 items-center transition-colors ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-900/10 to-transparent' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="col-span-1 text-center">
                    <span className={`text-xl ${index < 3 ? '' : 'text-slate-400'}`}>
                      {getMedalEmoji(index)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="font-semibold text-white">{entry.playerName}</div>
                    <div className="text-xs text-slate-500">
                      舰船等级: Lv.{entry.shipLevel}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="text-2xl font-black text-neon-cyan">
                      {entry.wavesSurvived}
                    </div>
                    <div className="text-xs text-slate-500">波</div>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="text-lg font-bold text-neon-yellow font-mono">
                      ₵{entry.creditsEarned.toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-3 text-center">
                    <span
                      className="font-bold text-sm"
                      style={{ color: getRankColor(entry.rank) }}
                    >
                      {entry.rank}
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-xs text-slate-400">
                    {formatDate(entry.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-500">
            共 {leaderboard.length} 条记录 · 仅显示前 100 名
          </div>
        )}
      </div>
    </div>
  );
}
