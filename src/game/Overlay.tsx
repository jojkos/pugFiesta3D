import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LeaderboardEntry } from '../lib/supabase';
import type { GameMode } from './types';
import type { VoiceCharacter } from './useFunnySpeech';
import { Leaderboard, MiniLeaderboard } from './Leaderboard';
import { SUPPORTED_LANGS, type Lang, type Strings } from './i18n';

const LANG_FLAGS: Record<Lang, string> = {
  cs: '🇨🇿',
  en: '🇬🇧',
};

const LANG_LABELS: Record<Lang, string> = {
  cs: 'Čeština',
  en: 'English',
};

const CHIP_LABELS: Record<Lang, { lang: string; jersey: string; voice: string }> = {
  cs: { lang: 'jazyk', jersey: 'dres', voice: 'hlas' },
  en: { lang: 'lang', jersey: 'jersey', voice: 'voice' },
};

const JERSEY_PRESETS: Readonly<{ hex: string; label: string }[]> = [
  { hex: '#5b3aa3', label: 'Indigo' },
  { hex: '#ff7d8e', label: 'Pink' },
  { hex: '#ffb25b', label: 'Amber' },
  { hex: '#3ec5a3', label: 'Mint' },
  { hex: '#5aa9ff', label: 'Sky' },
  { hex: '#2a1713', label: 'Ink' },
];

function isIosWebContext(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

function useOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, onClose]);
}

function ChipPopover({
  label,
  value,
  leading,
  children,
}: Readonly<{
  label: string;
  value: string;
  leading?: ReactNode;
  children: (close: () => void) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useOutside(wrap, () => setOpen(false));

  return (
    <div ref={wrap} className="menu-chip-wrap">
      <button
        type="button"
        className={`menu-chip ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        {leading}
        <small>{label}</small>
        <span className="menu-chip-value">{value}</span>
        <span className="caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="menu-pop">
          <p className="menu-pop-title">{label}</p>
          <div className="menu-pop-options">{children(() => setOpen(false))}</div>
        </div>
      )}
    </div>
  );
}

export function Overlay({
  bestScore,
  countdown,
  mode,
  paused,
  score,
  timeLeft,
  onStartRound,
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
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (mode !== 'gameOver') {
      setSubmitState('idle');
    }
    if (mode !== 'menu') {
      setMenuLeaderboardOpen(false);
      setHelpOpen(false);
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

  const langLabel = LANG_LABELS[lang];
  const langFlag = LANG_FLAGS[lang];
  const jerseyLabel =
    JERSEY_PRESETS.find((preset) => preset.hex.toLowerCase() === jerseyColor.toLowerCase())
      ?.label ?? 'Custom';
  const voiceLabel =
    voiceCharacters.find((character) => character.voiceId === voiceId)?.label ??
    voiceCharacters[0]?.label ??
    '';

  const isNewBest = mode === 'gameOver' && score > 0 && score >= bestScore;

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

      {mode === 'menu' && menuLeaderboardOpen && (
        <div className="modal-backdrop is-menu">
          <section className="lb">
            <div className="lb-head">
              <div>
                <p className="lb-eye">{strings.leaderboard.eyebrow}</p>
                <h2 className="lb-title">{strings.leaderboard.title}</h2>
              </div>
              <button
                className="lb-close"
                aria-label={strings.leaderboard.back}
                onClick={() => setMenuLeaderboardOpen(false)}
              >
                ✕
              </button>
            </div>

            <Leaderboard
              entries={leaderboardEntries}
              loading={leaderboardLoading}
              error={leaderboardError}
              highlightId={highlightedEntryId}
              strings={strings}
              lang={lang}
            />

            <div className="lb-actions">
              <button className="lb-btn-prim" onClick={onStartRound}>
                ▶ {strings.menu.start}
              </button>
              <button
                className="lb-btn-sec"
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
          <section className="menu">
            <button
              type="button"
              className="menu-help-btn"
              aria-label={strings.help.button}
              title={strings.help.button}
              onClick={() => setHelpOpen(true)}
              onMouseEnter={() => setHelpOpen(true)}
            >
              ?
            </button>
            <div className="menu-hero">
              <img
                className="menu-logo"
                src="/assets/images/logo.png"
                alt="Pug Banger Fiesta"
              />
              <div className="menu-info">
                <p className="menu-eye">{strings.menu.eyebrow}</p>
                <h2 className="menu-title">
                  Pug Banger<br />
                  <em>Fiesta</em>
                </h2>
                <p className="menu-lede">{strings.menu.lede}</p>
              </div>
            </div>

            <div className="menu-cust">
              <ChipPopover
                label={CHIP_LABELS[lang].lang}
                value={langLabel}
                leading={<span className="flag">{langFlag}</span>}
              >
                {(close) => (
                  <>
                    {SUPPORTED_LANGS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`menu-pop-opt ${lang === option ? 'on' : ''}`}
                        onClick={() => {
                          onLangChange(option);
                          close();
                        }}
                      >
                        {LANG_FLAGS[option]} {LANG_LABELS[option]}
                      </button>
                    ))}
                  </>
                )}
              </ChipPopover>

              <ChipPopover
                label={CHIP_LABELS[lang].jersey}
                value={jerseyLabel}
                leading={<span className="dot" style={{ background: jerseyColor }} />}
              >
                {(close) => (
                  <>
                    {JERSEY_PRESETS.map((preset) => {
                      const active =
                        preset.hex.toLowerCase() === jerseyColor.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          className={`menu-pop-swatch ${active ? 'on' : ''}`}
                          style={{ background: preset.hex }}
                          title={preset.label}
                          aria-label={strings.menu.jerseySwatchLabel(preset.label)}
                          onClick={() => {
                            onJerseyColorChange(preset.hex);
                            close();
                          }}
                        />
                      );
                    })}
                    <label
                      className="menu-pop-swatch menu-pop-swatch-custom"
                      style={{ background: jerseyColor }}
                      title={strings.menu.jerseyCustom}
                      aria-label={strings.menu.jerseyCustom}
                    >
                      <span aria-hidden="true">+</span>
                      <input
                        type="color"
                        value={jerseyColor}
                        onChange={(event) => onJerseyColorChange(event.target.value)}
                      />
                    </label>
                  </>
                )}
              </ChipPopover>

              <ChipPopover label={CHIP_LABELS[lang].voice} value={voiceLabel}>
                {(close) => (
                  <>
                    {voiceCharacters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        className={`menu-pop-opt ${voiceId === character.voiceId ? 'on' : ''}`}
                        onClick={() => {
                          onVoiceChange(character.voiceId);
                          close();
                        }}
                      >
                        {character.label}
                      </button>
                    ))}
                  </>
                )}
              </ChipPopover>
            </div>

            <div className="menu-actions">
              <button className="menu-start" onClick={onStartRound}>
                ▶ {strings.menu.start}
              </button>
              <button
                className="menu-hall"
                onClick={() => setMenuLeaderboardOpen(true)}
              >
                🏆 {strings.leaderboard.showButton}
              </button>
            </div>

            <div className="menu-foot">
              <span className="menu-foot-controls menu-foot-controls-desktop">
                <kbd>WASD</kbd> / <kbd>↑↓←→</kbd> · <kbd>Space</kbd>
              </span>
              <span className="menu-foot-controls menu-foot-controls-mobile">
                {strings.menu.controlsMobileHint}
              </span>
              <span>
                {strings.menu.bestSoFar(
                  Math.max(leaderboardEntries[0]?.score ?? 0, bestScore),
                )}
              </span>
            </div>
          </section>

          {helpOpen && (
            <div
              className="help-overlay"
              role="dialog"
              aria-modal="true"
              aria-label={strings.help.title}
              onClick={() => setHelpOpen(false)}
            >
              <section
                className="help-panel"
                onClick={(event) => event.stopPropagation()}
                onMouseLeave={() => setHelpOpen(false)}
              >
                <header className="help-panel-head">
                  <h3 className="help-panel-title">{strings.help.title}</h3>
                  <button
                    type="button"
                    className="help-panel-close"
                    aria-label={strings.help.close}
                    onClick={() => setHelpOpen(false)}
                  >
                    ✕
                  </button>
                </header>
                <div className="help-panel-body">
                  <div className="help-section">
                    <h4>{strings.help.goalHeading}</h4>
                    <p>{strings.help.goalBody}</p>
                  </div>
                  <div className="help-section help-section-desktop">
                    <h4>{strings.help.desktopHeading}</h4>
                    <p>{strings.help.desktopBody}</p>
                  </div>
                  <div className="help-section help-section-mobile">
                    <h4>{strings.help.mobileHeading}</h4>
                    <p>{strings.help.mobileBody}</p>
                  </div>
                  {isIosWebContext() && (
                    <div className="help-section help-section-ios">
                      <h4>{strings.help.iosHeading}</h4>
                      <p>{strings.help.iosBody}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {paused && mode === 'playing' && (
        <div className="modal-backdrop">
          <section className="pa">
            <div className="pa-icon">⏸</div>
            <p className="pa-eye">{strings.pause.eyebrow}</p>
            <h2 className="pa-title">{strings.pause.title}</h2>
            <p className="pa-lede">{strings.pause.lede}</p>
            <div className="pa-actions">
              <button className="pa-btn-prim" onClick={onTogglePause}>
                ▶ {strings.pause.resume}
              </button>
              <button className="pa-btn-sec" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
            <div className="pa-keys">
              <kbd>Esc</kbd> {strings.pause.resume} · <kbd>Space</kbd> {strings.controls.dash}
            </div>
          </section>
        </div>
      )}

      {mode === 'gameOver' && (
        <div className="modal-backdrop">
          <section className="res">
            <div className="res-head">
              <p className="res-eye">{strings.results.eyebrow}</p>
              <div className="res-score">
                <span className="res-score-num">{score}</span>
                <span className="res-score-suf">{strings.results.suffix}</span>
              </div>
              {isNewBest ? (
                <div className="res-msg is-best">★ {strings.results.newBest}</div>
              ) : (
                <p className="res-msg">{strings.results.tryAgain}</p>
              )}
            </div>

            <div className="res-stats">
              <div className="res-stat">
                <span>{strings.results.best}</span>
                <strong>{Math.max(score, bestScore)}</strong>
              </div>
              <div className="res-stat">
                <span>{strings.results.pace}</span>
                <strong>
                  {(score / 45).toFixed(2)}
                  {strings.results.paceUnit}
                </strong>
              </div>
            </div>

            <aside className="res-side">
              <div className="res-side-head">
                <h3 className="res-side-title">{strings.leaderboard.title}</h3>
              </div>
              <MiniLeaderboard
                entries={leaderboardEntries}
                loading={leaderboardLoading}
                error={leaderboardError}
                highlightId={highlightedEntryId}
                strings={strings}
                lang={lang}
              />
            </aside>

            {score > 0 && submitState !== 'done' && (
              <form className="res-submit" onSubmit={handleSubmit}>
                <input
                  className="res-submit-input"
                  maxLength={24}
                  value={pendingName}
                  onChange={(event) => setPendingName(event.target.value)}
                  placeholder={strings.leaderboard.namePlaceholder}
                  disabled={submitState !== 'idle'}
                />
                <button
                  type="submit"
                  className="res-submit-btn"
                  disabled={submitState !== 'idle'}
                >
                  {submitState === 'submitting'
                    ? strings.leaderboard.submitting
                    : strings.leaderboard.submit}
                </button>
              </form>
            )}

            {submitState === 'done' && (
              <p className="res-submit-done">{strings.leaderboard.submitted}</p>
            )}

            <div className="res-actions">
              <button className="res-btn-prim" onClick={onStartRound}>
                ▶ {strings.results.again}
              </button>
              <button className="res-btn-sec" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
