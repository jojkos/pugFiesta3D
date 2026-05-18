import type { LeaderboardEntry } from '../lib/supabase';
import type { Lang, Strings } from './i18n';

const MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const POD_CLASS: Record<number, string> = {
  1: 'gold',
  2: 'silver',
  3: 'bronze',
};

const BROWSER_LANG: Record<Lang, string> = {
  cs: 'cs-CZ',
  en: 'en-US',
};

function formatEntryDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(BROWSER_LANG[lang], {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function Leaderboard({
  entries,
  loading,
  error,
  highlightId,
  strings,
  lang,
}: Readonly<{
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightId?: string | null;
  strings: Strings;
  lang: Lang;
}>) {
  const t = strings.leaderboard;
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  if (error) {
    return (
      <p className="lb-message">
        {t.error}
        <br />
        <small style={{ opacity: 0.7 }}>{error}</small>
      </p>
    );
  }
  if (loading && entries.length === 0) return <p className="lb-message">{t.loading}</p>;
  if (!loading && entries.length === 0) return <p className="lb-message">{t.empty}</p>;

  // Podium slot order on screen: silver (left), gold (center), bronze (right).
  const slotOrder = [podium[1], podium[0], podium[2]];
  const slotRank = [2, 1, 3];

  return (
    <div className="lb-body">
      <div className="lb-podium">
        {slotOrder.map((entry, idx) => {
          const rank = slotRank[idx];
          if (!entry) {
            return (
              <div key={`empty-${rank}`} className={`lb-pod ${POD_CLASS[rank]} is-empty`}>
                <span className="lb-pod-medal">{MEDAL[rank]}</span>
                <div className="lb-pod-name">—</div>
                <div className="lb-pod-score">·</div>
                <div className="lb-pod-suffix">{t.scoreHeader}</div>
              </div>
            );
          }
          const isYou = highlightId === entry.id;
          return (
            <div
              key={entry.id}
              className={`lb-pod ${POD_CLASS[rank]} ${isYou ? 'is-you' : ''}`}
            >
              <span className="lb-pod-medal">{MEDAL[rank]}</span>
              <div className="lb-pod-name" title={entry.player_name}>
                {entry.player_name}
              </div>
              <div className="lb-pod-score">{entry.score}</div>
              <div className="lb-pod-suffix">{t.scoreHeader}</div>
              <div className="lb-pod-date">{formatEntryDate(entry.created_at, lang)}</div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="lb-list">
          <div className="lb-list-head">
            <span>{t.rankHeader}</span>
            <span>{t.nameHeader}</span>
            <span>{t.scoreHeader}</span>
          </div>
          {rest.map((entry, idx) => {
            const rank = idx + 4;
            const isYou = highlightId === entry.id;
            return (
              <div key={entry.id} className={`lb-row ${isYou ? 'you' : ''}`}>
                <span className="lb-rank">{rank}</span>
                <span className="lb-name-wrap">
                  <span className="lb-name" title={entry.player_name}>
                    {entry.player_name}
                    {isYou && (
                      <span className="lb-name-you-tag">· {t.you}</span>
                    )}
                  </span>
                  <small className="lb-date">
                    {formatEntryDate(entry.created_at, lang)}
                  </small>
                </span>
                <span className="lb-score">{entry.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MiniLeaderboard({
  entries,
  loading,
  error,
  highlightId,
  strings,
  lang,
  limit = 5,
}: Readonly<{
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightId?: string | null;
  strings: Strings;
  lang: Lang;
  limit?: number;
}>) {
  const t = strings.leaderboard;
  const list = entries.slice(0, limit);

  if (error) {
    return (
      <p className="lb-message">
        {t.error}
        <br />
        <small style={{ opacity: 0.7 }}>{error}</small>
      </p>
    );
  }
  if (loading && list.length === 0) return <p className="lb-message">{t.loading}</p>;
  if (!loading && list.length === 0) return <p className="lb-message">{t.empty}</p>;

  return (
    <div className="res-mini-list">
      {list.map((entry, idx) => {
        const rank = idx + 1;
        const isYou = highlightId === entry.id;
        const badge = MEDAL[rank] ?? rank;
        return (
          <div key={entry.id} className={`res-mini ${isYou ? 'you' : ''}`}>
            <span className="res-mini-rank">{badge}</span>
            <span className="res-mini-name-wrap">
              <span className="res-mini-name" title={entry.player_name}>
                {entry.player_name}
              </span>
              <small className="res-mini-date">
                {formatEntryDate(entry.created_at, lang)}
              </small>
            </span>
            <span className="res-mini-score">{entry.score}</span>
          </div>
        );
      })}
    </div>
  );
}
