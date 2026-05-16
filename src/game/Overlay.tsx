import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../lib/supabase';
import type { GameMode } from './types';
import type { VoiceCharacter } from './useFunnySpeech';
import { Leaderboard } from './Leaderboard';
import { SUPPORTED_LANGS, type Lang, type Strings } from './i18n';

const LANG_FLAGS: Record<Lang, string> = {
  cs: '🇨🇿',
  en: '🇬🇧',
};

const LANG_LABELS: Record<Lang, string> = {
  cs: 'Čeština',
  en: 'English',
};

const JERSEY_PRESETS = [
  '#5b3aa3',
  '#ff7d8e',
  '#ffb25b',
  '#3ec5a3',
  '#5aa9ff',
  '#2a1713',
];

export function Overlay({
  bestScore,
  countdown,
  mode,
  paused,
  score,
  timeLeft,
  onStartRound,
  tagBurst,
  tagPhrase,
  isMuted,
  jerseyColor,
  onJerseyColorChange,
  onToggleMute,
  onTogglePause,
  onQuitToMenu,
  voiceId,
  onVoiceChange,
  voiceCharacters,
  lang,
  onLangChange,
  strings,
  leaderboardEntries,
  leaderboardLoading,
  leaderboardError,
  highlightedEntryId,
  onSubmitScore,
}: Readonly<{
  bestScore: number;
  countdown: number | null;
  mode: GameMode;
  paused: boolean;
  score: number;
  timeLeft: number;
  onStartRound: () => void;
  tagBurst: number;
  tagPhrase: string;
  isMuted: boolean;
  jerseyColor: string;
  onJerseyColorChange: (color: string) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onQuitToMenu: () => void;
  voiceId: string;
  onVoiceChange: (voiceId: string) => void;
  voiceCharacters: VoiceCharacter[];
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  strings: Strings;
  leaderboardEntries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  highlightedEntryId: string | null;
  onSubmitScore: (name: string) => Promise<void> | void;
}>) {
  const [pendingName, setPendingName] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [menuLeaderboardOpen, setMenuLeaderboardOpen] = useState(false);

  useEffect(() => {
    if (mode !== 'gameOver') {
      setSubmitState('idle');
    }
    if (mode !== 'menu') {
      setMenuLeaderboardOpen(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'gameOver' && submitState === 'idle' && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('pug-banger-fiesta-player-name') ?? '';
      setPendingName(stored);
    }
  }, [mode, submitState]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitState !== 'idle') return;
    setSubmitState('submitting');
    const trimmed = pendingName.trim();
    if (typeof window !== 'undefined' && trimmed) {
      window.localStorage.setItem('pug-banger-fiesta-player-name', trimmed);
    }
    await onSubmitScore(trimmed);
    setSubmitState('done');
  };

  const showHud = mode === 'playing';
  const lowTime = showHud && countdown === null && timeLeft <= 10;

  return (
    <>
      {showHud && (
        <header className="hud">
          <div className="hud-chip hud-score">
            <span className="hud-label">{strings.hud.score}</span>
            <strong>{score}</strong>
          </div>
          <div className={`hud-chip hud-time ${lowTime ? 'is-low' : ''}`}>
            <span className="hud-label">{strings.hud.time}</span>
            <strong>{Math.ceil(timeLeft)}</strong>
          </div>
          <div className="hud-chip hud-best">
            <span className="hud-label">{strings.hud.best}</span>
            <strong>{bestScore}</strong>
          </div>
        </header>
      )}

      <div className="control-cluster">
        <button
          className="utility-button"
          aria-label={isMuted ? strings.controls.enableSound : strings.controls.muteSound}
          onClick={onToggleMute}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        {mode === 'playing' && (
          <button
            className="utility-button"
            aria-label={paused ? strings.controls.resume : strings.controls.pause}
            onClick={onTogglePause}
          >
            {paused ? '▶' : '⏸'}
          </button>
        )}
      </div>

      {mode === 'playing' && countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-disc" key={countdown}>
            {countdown > 0 ? countdown : strings.countdownGo}
          </div>
        </div>
      )}

      {lowTime && <div className="rush-banner">{strings.finalRush}</div>}

      <div className={`tag-banner ${tagBurst > 0 ? 'is-visible' : ''}`}>
        {tagPhrase}
      </div>

      {mode === 'menu' && menuLeaderboardOpen && (
        <div className="modal-backdrop is-menu">
          <section className="modal-panel modal-menu">
            <p className="eyebrow">{strings.leaderboard.eyebrow}</p>
            <h2>{strings.leaderboard.title}</h2>
            <Leaderboard
              entries={leaderboardEntries}
              loading={leaderboardLoading}
              error={leaderboardError}
              strings={strings}
            />
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={() => setMenuLeaderboardOpen(false)}
              >
                {strings.leaderboard.back}
              </button>
            </div>
          </section>
        </div>
      )}

      {mode === 'menu' && !menuLeaderboardOpen && (
        <div className="modal-backdrop is-menu">
          <section className="modal-panel modal-menu">
            <img
              className="menu-logo"
              src="/assets/images/logo.png"
              alt="Pug Banger Fiesta"
            />
            <p className="eyebrow">{strings.menu.eyebrow}</p>
            <h2>{strings.menu.title}</h2>
            <p className="modal-lede">{strings.menu.lede}</p>
            <div className="modal-grid">
              <div>
                <span>{strings.menu.grid.desktopLabel}</span>
                <strong>{strings.menu.grid.desktopValue}</strong>
                <small>{strings.menu.grid.desktopHint}</small>
              </div>
              <div>
                <span>{strings.menu.grid.mobileLabel}</span>
                <strong>{strings.menu.grid.mobileValue}</strong>
                <small>{strings.menu.grid.mobileHint}</small>
              </div>
              <div>
                <span>{strings.menu.grid.roundLabel}</span>
                <strong>{strings.menu.grid.roundValue}</strong>
                <small>{strings.menu.grid.roundHint}</small>
              </div>
            </div>
            <div className="voice-picker">
              <span className="jersey-picker-label">{strings.menu.languageLabel}</span>
              <div className="voice-options">
                {SUPPORTED_LANGS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`voice-option ${lang === option ? 'is-active' : ''}`}
                    onClick={() => onLangChange(option)}
                  >
                    {LANG_FLAGS[option]} {LANG_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>
            <div className="jersey-picker">
              <span className="jersey-picker-label">Jersey color</span>
              <div className="jersey-swatches">
                {JERSEY_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color} jersey`}
                    className={`jersey-swatch ${jerseyColor.toLowerCase() === color.toLowerCase() ? 'is-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => onJerseyColorChange(color)}
                  />
                ))}
                <label
                  className="jersey-swatch jersey-swatch-custom"
                  style={{ background: jerseyColor }}
                  aria-label="Pick custom jersey color"
                >
                  <span aria-hidden="true">+</span>
                  <input
                    type="color"
                    value={jerseyColor}
                    onChange={(event) => onJerseyColorChange(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="voice-picker">
              <span className="jersey-picker-label">{strings.menu.voiceLabel}</span>
              <div className="voice-options">
                {voiceCharacters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    className={`voice-option ${voiceId === character.voiceId ? 'is-active' : ''}`}
                    onClick={() => onVoiceChange(character.voiceId)}
                  >
                    {character.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={onStartRound}>
                {strings.menu.start}
              </button>
              <button
                className="secondary-button"
                onClick={() => setMenuLeaderboardOpen(true)}
              >
                {strings.leaderboard.showButton}
              </button>
            </div>
          </section>
        </div>
      )}

      {paused && mode === 'playing' && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-pause">
            <p className="eyebrow">{strings.pause.eyebrow}</p>
            <h2>{strings.pause.title}</h2>
            <p className="modal-lede">{strings.pause.lede}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={onTogglePause}>
                {strings.pause.resume}
              </button>
              <button className="secondary-button" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
          </section>
        </div>
      )}

      {mode === 'gameOver' && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-results">
            <p className="eyebrow">{strings.results.eyebrow}</p>
            <h2>
              <span className="results-number">{score}</span>
              <span className="results-suffix">{strings.results.suffix}</span>
            </h2>
            <p className="modal-lede">
              {(() => {
                if (score >= bestScore && score > 0) return strings.results.newBest;
                return strings.results.tryAgain;
              })()}
            </p>
            <div className="results-grid">
              <div>
                <span>{strings.results.best}</span>
                <strong>{Math.max(score, bestScore)}</strong>
              </div>
              <div>
                <span>{strings.results.pace}</span>
                <strong>
                  {(score / 45).toFixed(2)}
                  {strings.results.paceUnit}
                </strong>
              </div>
            </div>

            {score > 0 && submitState !== 'done' && (
              <form className="submit-score-form" onSubmit={handleSubmit}>
                <label className="jersey-picker-label">
                  {strings.leaderboard.namePrompt}
                </label>
                <div className="submit-score-row">
                  <input
                    className="submit-score-input"
                    maxLength={24}
                    value={pendingName}
                    onChange={(event) => setPendingName(event.target.value)}
                    placeholder={strings.leaderboard.namePlaceholder}
                    disabled={submitState !== 'idle'}
                  />
                  <button
                    type="submit"
                    className="primary-button submit-score-button"
                    disabled={submitState !== 'idle'}
                  >
                    {submitState === 'submitting'
                      ? strings.leaderboard.submitting
                      : strings.leaderboard.submit}
                  </button>
                </div>
              </form>
            )}

            {submitState === 'done' && (
              <p className="submit-done">{strings.leaderboard.submitted}</p>
            )}

            <Leaderboard
              entries={leaderboardEntries}
              loading={leaderboardLoading}
              error={leaderboardError}
              highlightId={highlightedEntryId}
              strings={strings}
            />

            <div className="modal-actions">
              <button className="primary-button" onClick={onStartRound}>
                {strings.results.again}
              </button>
              <button className="secondary-button" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
