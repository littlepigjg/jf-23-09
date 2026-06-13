import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import HUD from '../components/HUD';
import EventModal from '../components/EventModal';
import BattleScene from '../components/BattleScene';
import StarMap from '../components/StarMap';
import TradePanel from '../components/TradePanel';
import UpgradePanel from '../components/UpgradePanel';
import QuestPanel from '../components/QuestPanel';
import ArenaPanel from '../components/ArenaPanel';
import LeaderboardPanel from '../components/LeaderboardPanel';
import { rollTravelEvent } from '../utils/travelEngine';
import { createInitialBattleState, createArenaWaveBattleState } from '../utils/battleEngine';
import type { GameState } from '../types/game';
import { NAV_ITEMS } from '../data/navigation';

export default function GamePage() {
  const navigate = useNavigate();

  const {
    currentView,
    setView,
    travelState,
    updateTravel,
    battleState,
    setBattleState,
    completeBattle,
    eventState,
    triggerEvent,
    saveGame,
    ship,
    currentPlanetId,
    arenaState,
    completeArenaWave,
  } = useGameStore();

  const lastTimeRef = useRef<number>(performance.now());
  const rafRef = useRef<number>(0);
  const wasTravelingRef = useRef<boolean>(false);
  const travelEventFiredRef = useRef<boolean>(false);
  const lastTravelRef = useRef<{ from: string; to: string } | null>(null);
  const lastArenaPhaseRef = useRef<string | null>(null);

  if (!currentPlanetId) {
    navigate('/');
    return null;
  }

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      updateTravel(dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [updateTravel]);

  useEffect(() => {
    const isTraveling = !!travelState?.isTraveling;

    if (isTraveling && travelState) {
      wasTravelingRef.current = true;
      travelEventFiredRef.current = false;
      lastTravelRef.current = { from: travelState.fromPlanet, to: travelState.toPlanet };
    }

    if (wasTravelingRef.current && !isTraveling && !travelEventFiredRef.current && lastTravelRef.current) {
      travelEventFiredRef.current = true;
      wasTravelingRef.current = false;

      const { from, to } = lastTravelRef.current;
      const result = rollTravelEvent(from, to);

      if (result.eventType === 'pirates' && result.pirateDifficulty !== undefined) {
        const battle = createInitialBattleState(ship.maxShield, ship.damage, result.pirateDifficulty);
        setBattleState(battle);
      } else if (result.eventType === 'event') {
        triggerEvent();
      }

      lastTravelRef.current = null;
    }
  }, [travelState, ship.maxShield, ship.damage, setBattleState, triggerEvent]);

  useEffect(() => {
    if (!arenaState) {
      lastArenaPhaseRef.current = null;
      return;
    }

    const currentPhase = arenaState.phase;
    const lastPhase = lastArenaPhaseRef.current;

    if (currentPhase === 'battle' && !battleState) {
      const battle = createArenaWaveBattleState(
        ship.maxShield,
        ship.damage,
        arenaState.currentWave,
        ship.currentShield
      );
      setBattleState(battle);
    }

    lastArenaPhaseRef.current = currentPhase;
  }, [arenaState?.phase, arenaState?.currentWave, ship.maxShield, ship.damage, ship.currentShield, battleState, setBattleState, arenaState]);

  const handleArenaBattleFinish = (won: boolean) => {
    completeArenaWave(won);
  };

  const handleBackToMenu = () => {
    saveGame();
    navigate('/');
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'starmap':
        return <StarMap />;
      case 'trade':
        return <TradePanel />;
      case 'upgrade':
        return <UpgradePanel />;
      case 'quests':
        return <QuestPanel />;
      case 'arena':
        return <ArenaPanel />;
      case 'leaderboard':
        return <LeaderboardPanel />;
      default:
        return <StarMap />;
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-b from-space-950 via-space-900 to-space-950">
      <div className="z-10 shrink-0 border-b border-slate-800/60 bg-space-950/80 backdrop-blur-sm">
        <HUD />
      </div>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-44 shrink-0 flex-col gap-3 border-r border-slate-800/60 bg-space-950/60 p-4 backdrop-blur-sm">
          <div className="mb-2 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = currentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-lg border px-4 py-3 font-orbitron text-sm font-semibold tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'border-neon-cyan bg-space-800/80 text-neon-cyan shadow-neon-cyan'
                      : 'border-slate-700/60 bg-space-800/40 text-slate-300 hover:border-neon-cyan/50 hover:text-neon-cyan/80 hover:bg-space-800/70'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-800/60">
            <button
              onClick={handleBackToMenu}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/60 bg-space-800/40 px-4 py-3 font-orbitron text-xs font-semibold tracking-wider text-slate-400 transition-all duration-200 hover:border-neon-orange/50 hover:text-neon-orange hover:bg-space-800/70"
            >
              <span>⬅</span>
              <span>返回主菜单</span>
            </button>
          </div>
        </nav>

        <main className="flex-1 min-w-0 p-4 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>

      {eventState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <EventModal />
        </div>
      )}

      {battleState && (
        <div className="fixed inset-0 z-50">
          {arenaState?.phase === 'battle' && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-orange-500/50 z-50 pointer-events-none"
            >
              <div className="text-center">
                <div className="text-xs text-slate-400">竞技场</div>
                <div className="text-lg font-bold text-orange-400">
                  第 {arenaState.currentWave} 波 · {arenaState.currentWave} 艘
                </div>
              </div>
            </div>
          )}
          <BattleScene
            difficulty={battleState.difficulty}
            onFinish={arenaState?.phase === 'battle' ? handleArenaBattleFinish : completeBattle}
          />
        </div>
      )}
    </div>
  );
}
