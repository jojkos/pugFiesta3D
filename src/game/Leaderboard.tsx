import { useEffect, useRef } from 'react';
import type { ReactNode, Ref } from 'react';
import type { LeaderboardEntry } from '../lib/supabase';
import type { Lang, Strings } from './i18n';
import { MAX_NAME_LEN } from './leaderboardUtils';

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

/**
 * The player's still-unsaved run, rendered as an editable row inside the
 * leaderboard at the rank it would take. Submitting is optional — the row is
 * just an invitation sitting where the score would land.
 */
export type GhostRow = {
  rank: number;
  score: number;
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  state: 'idle' | 'submitting' | 'error';
};

function GhostRowForm({
  ghost,
  formRef,
  inputRef,
  strings,
}: Readonly<{
  ghost: GhostRow;
  formRef: Ref<HTMLFormElement>;
  inputRef?: Ref<HTMLInputElement>;
  strings: Strings;
}>) {
  const t = strings.leaderboard;
  const submitting = ghost.state === 'submitting';
  const buttonLabel = submitting
    ? t.submitting
    : ghost.state === 'error'
      ? t.retry
      : t.submit;
  return (
    <form
      ref={formRef}
      className="res-mini res-ghost"
      onSubmit={(event) => {
        event.preventDefault();
        ghost.onSubmit();
      }}
    >
      <span className="res-mini-rank">{MEDAL[ghost.rank] ?? ghost.rank}</span>
      <input
        ref={inputRef}
        className="res-ghost-input"
        maxLength={MAX_NAME_LEN}
        value={ghost.name}
        onChange={(event) => ghost.onNameChange(event.target.value)}
        placeholder={t.namePlaceholder}
        aria-label={t.namePlaceholder}
        disabled={submitting}
      />
      <span className="res-mini-score">{ghost.score}</span>
      {ghost.state === 'error' && (
        <small className="res-ghost-error" role="alert">
          {t.submitFailed}
        </small>
      )}
      <button
        type="submit"
        className="res-ghost-btn"
        disabled={submitting || ghost.name.trim() === ''}
      >
        {buttonLabel}
      </button>
    </form>
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
  ghost,
  ghostInputRef,
}: Readonly<{
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightId?: string | null;
  strings: Strings;
  lang: Lang;
  limit?: number;
  ghost?: GhostRow;
  ghostInputRef?: Ref<HTMLInputElement>;
}>) {
  const t = strings.leaderboard;
  const list = entries.slice(0, limit);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLFormElement | null>(null);
  const hasGhost = !!ghost;

  // Scroll the highlighted row into view whenever it appears (e.g. right after
  // the player submits and their row enters the list, possibly below the
  // fold). Triggered also on `entries` change so the effect re-runs after the
  // post-submit refresh populates the list.
  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightId, entries]);

  // Bring the ghost row into view once when it appears — its would-be rank
  // can sit below the fold. Deliberately NOT re-run per keystroke.
  useEffect(() => {
    if (!hasGhost || !ghostRef.current) return;
    ghostRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [hasGhost]);

  // A failed READ must not take the submit UI down with it — saving goes
  // through its own endpoint, so the ghost row stays available.
  if (error) {
    return (
      <>
        <p className="lb-message">
          {t.error}
          <br />
          <small style={{ opacity: 0.7 }}>{error}</small>
        </p>
        {ghost && (
          <div className="res-mini-list">
            <GhostRowForm
              ghost={ghost}
              formRef={ghostRef}
              inputRef={ghostInputRef}
              strings={strings}
            />
          </div>
        )}
      </>
    );
  }
  if (list.length === 0 && !ghost) {
    return <p className="lb-message">{loading ? t.loading : t.empty}</p>;
  }

  // The ghost occupies its would-be slot, so every entry at or below it shows
  // the rank it would hold AFTER the save — an honest projection.
  const ghostIndex = ghost ? Math.min(ghost.rank - 1, list.length) : -1;
  const rows: ReactNode[] = list.map((entry, idx) => {
    const rank = ghost && idx >= ghostIndex ? idx + 2 : idx + 1;
    const isYou = highlightId === entry.id;
    const badge = MEDAL[rank] ?? rank;
    return (
      <div
        key={entry.id}
        ref={isYou ? highlightRef : null}
        className={`res-mini ${isYou ? 'you' : ''}`}
      >
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
  });
  if (ghost) {
    rows.splice(
      ghostIndex,
      0,
      <GhostRowForm
        key="ghost"
        ghost={ghost}
        formRef={ghostRef}
        inputRef={ghostInputRef}
        strings={strings}
      />,
    );
  }

  return <div className="res-mini-list">{rows}</div>;
}
