import type { LeaderboardEntry } from '../lib/supabase';
import type { Strings } from './i18n';

const TROPHY_BY_RANK: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function Leaderboard({
  entries,
  loading,
  error,
  highlightId,
  strings,
}: Readonly<{
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightId?: string | null;
  strings: Strings;
}>) {
  const t = strings.leaderboard;

  return (
    <div className="leaderboard">
      <header className="leaderboard-header">
        <h3>{t.title}</h3>
      </header>

      {error && <p className="leaderboard-message">{t.error}</p>}
      {!error && loading && entries.length === 0 && (
        <p className="leaderboard-message">{t.loading}</p>
      )}
      {!error && !loading && entries.length === 0 && (
        <p className="leaderboard-message">{t.empty}</p>
      )}

      {entries.length > 0 && (
        <div className="leaderboard-table">
          <div className="leaderboard-row leaderboard-row-head">
            <span className="leaderboard-rank">{t.rankHeader}</span>
            <span className="leaderboard-name">{t.nameHeader}</span>
            <span className="leaderboard-score">{t.scoreHeader}</span>
          </div>
          <ol className="leaderboard-list">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const trophy = TROPHY_BY_RANK[rank];
              const isYou = highlightId === entry.id;
              return (
                <li
                  key={entry.id}
                  className={`leaderboard-row ${isYou ? 'is-you' : ''} ${
                    trophy ? `is-top-${rank}` : ''
                  }`}
                >
                  <span className="leaderboard-rank">
                    {trophy ?? rank}
                  </span>
                  <span className="leaderboard-name" title={entry.player_name}>
                    {entry.player_name}
                  </span>
                  <span className="leaderboard-score">{entry.score}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
