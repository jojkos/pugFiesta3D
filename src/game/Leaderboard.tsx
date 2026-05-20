import type { LeaderboardEntry } from '../lib/supabase';
import type { Lang, Strings } from './i18n';

const MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
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

  return (
    <div className="lb-body">
      <div className="lb-list">
        <div className="lb-list-head">
          <span>{t.rankHeader}</span>
          <span>{t.nameHeader}</span>
          <span>{t.scoreHeader}</span>
        </div>
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const isYou = highlightId === entry.id;
          const medal = MEDAL[rank];
          return (
            <div
              key={entry.id}
              className={`lb-row ${isYou ? 'you' : ''} ${medal ? 'is-podium' : ''}`}
            >
              <span className={`lb-rank ${medal ? 'lb-rank-medal' : ''}`}>
                {medal ?? rank}
              </span>
              <span className="lb-name-wrap">
                <span className="lb-name" title={entry.player_name}>
                  {entry.player_name}
                  {isYou && <span className="lb-name-you-tag">· {t.you}</span>}
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
