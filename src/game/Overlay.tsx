import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { LeaderboardEntry } from '../lib/supabase';
import type { GameMode } from './types';
import type { VoiceCharacter } from './useFunnySpeech';
import { Leaderboard, MiniLeaderboard } from './Leaderboard';
import { SUPPORTED_LANGS, type Lang, type Strings } from './i18n';
import { ROUND_DURATION } from './config';

const LANG_FLAGS: Record<Lang, string> = {
  cs: '🇨🇿',
  en: '🇬🇧',
};

const LANG_LABELS: Record<Lang, string> = {
  cs: 'Čeština',
  en: 'English',
};

const CHIP_LABELS: Record<Lang, { lang: string; team: string; voice: string }> = {
  cs: { lang: 'jazyk', team: 'tým', voice: 'hlas' },
  en: { lang: 'lang', team: 'team', voice: 'voice' },
};

type Team = {
  id: string;
  label: string;
  primary: string;
  accent?: string;
};

// Each team has a primary jersey color and an optional accent (stripe).
// When accent is missing, the jersey is solid (Jersey2 mirrors Jersey).
const TEAMS: readonly Team[] = [
  { id: 'psidevky',   label: 'Psí děvky',    primary: '#ffffff', accent: '#033e8f' },
  { id: 'epix',       label: 'Epix',         primary: '#9e2ac2', accent: '#f3c526' },
  { id: 'odpad',      label: 'Odpad',        primary: '#ff002b' },
  { id: 'centimetry', label: 'Centimetry',   primary: '#ff8a3d' },
  { id: 'ketutus',    label: 'Ketutus',      primary: '#1a1a1a', accent: '#f3c526' },
  { id: 'diy',        label: 'DIY',          primary: '#791927' },
  { id: 'tamara',     label: 'Tamara',       primary: '#f838a8' },
  { id: 'jzm',        label: 'JZM',          primary: '#034c2b' },
  { id: 'tichu',      label: 'Díra v tichu', primary: '#63b8f9' },
  { id: 'hrana',      label: 'Hrana',        primary: '#f5c842', accent: '#cdbfa2' },
];

function eqHex(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function isLightColor(hex: string): boolean {
  const value = hex.replace('#', '');
  if (value.length !== 6) return true;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Standard luminance approximation.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

function findTeam(primary: string, accent: string): Team | undefined {
  return TEAMS.find((t) => {
    const teamAccent = t.accent ?? t.primary;
    return eqHex(t.primary, primary) && eqHex(teamAccent, accent);
  });
}

function teamBadgeBackground(team: Team): string {
  if (!team.accent) return team.primary;
  return `linear-gradient(110deg, ${team.primary} 0%, ${team.primary} 50%, ${team.accent} 50%, ${team.accent} 100%)`;
}

const IOS_NUDGE_DISMISSED_KEY = 'pug-banger-fiesta-ios-nudge-dismissed';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
}

function isIosWebContext(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== 'undefined' && !!document.fullscreenElement,
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const supported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';

  const toggle = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement
        .requestFullscreen?.({ navigationUI: 'hide' })
        .catch(() => {});
    }
  }, []);

  return { isFullscreen, toggle, supported };
}

// Captured once at module init, before any Fullscreen API call can flip
// display-mode to 'fullscreen' transiently. Tells us whether the page
// was launched as an installed PWA (Android Chrome 'fullscreen' from the
// manifest, desktop/Android 'standalone', or iOS Safari home-screen
// standalone).
const LAUNCHED_AS_PWA: boolean = (() => {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const fullscreen = window.matchMedia?.('(display-mode: fullscreen)').matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || fullscreen || iosStandalone;
})();

function FullscreenButton({ label }: Readonly<{ label: string }>) {
  const { isFullscreen, toggle, supported } = useFullscreen();
  if (!supported || LAUNCHED_AS_PWA) return null;
  return (
    <button
      type="button"
      className={`menu-tool-btn ${isFullscreen ? 'is-active' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={isFullscreen}
      onClick={toggle}
    >
      {isFullscreen ? '⤡' : '⤢'}
    </button>
  );
}

function ChipPopover({
  label,
  value,
  leading,
  wide,
  children,
}: Readonly<{
  label: string;
  value: string;
  leading?: ReactNode;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div className="menu-chip-wrap">
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
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="menu-pop-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={close}
          >
            <div
              className={`menu-pop ${wide ? 'wide' : ''}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="menu-pop-close"
                aria-label={label}
                onClick={close}
              >
                ✕
              </button>
              <p className="menu-pop-title">{label}</p>
              <div className="menu-pop-options">{children(close)}</div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Overlay({
  bestScore,
  bestBeforeRound,
  countdown,
  mode,
  paused,
  score,
  onStartRound,
  isMuted,
  jerseyColor,
  jerseyAccentColor,
  onJerseyColorChange,
  onJerseyAccentColorChange,
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
  bestBeforeRound: number;
  countdown: number | null;
  mode: GameMode;
  paused: boolean;
  score: number;
  onStartRound: () => void;
  isMuted: boolean;
  jerseyColor: string;
  jerseyAccentColor: string;
  onJerseyColorChange: (color: string) => void;
  onJerseyAccentColorChange: (color: string) => void;
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
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isAppInstalled());
  const [installInstructionsOpen, setInstallInstructionsOpen] = useState(false);
  const [iosNudgeOpen, setIosNudgeOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (!isIosWebContext()) return false;
    return window.localStorage.getItem(IOS_NUDGE_DISMISSED_KEY) !== '1';
  });

  const dismissIosNudge = useCallback(() => {
    setIosNudgeOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(IOS_NUDGE_DISMISSED_KEY, '1');
    }
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setInstallInstructionsOpen(false);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        console.log('Install choice', choice);
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
      } finally {
        setInstallPrompt(null);
      }
      return;
    }
    setInstallInstructionsOpen(true);
  }, [installPrompt]);

  const canShowInstall = !isInstalled;

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
      const stored = window.sessionStorage.getItem('pug-banger-fiesta-player-name') ?? '';
      setPendingName(stored);
    }
  }, [mode, submitState]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitState !== 'idle') return;
    const trimmed = pendingName.trim();
    if (!trimmed) return;
    setSubmitState('submitting');
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('pug-banger-fiesta-player-name', trimmed);
    }
    await onSubmitScore(trimmed);
    setSubmitState('done');
  };

  const langLabel = LANG_LABELS[lang];
  const langFlag = LANG_FLAGS[lang];
  const currentTeam = findTeam(jerseyColor, jerseyAccentColor);
  const isSolid = eqHex(jerseyColor, jerseyAccentColor);
  const teamLabel = currentTeam?.label ?? strings.menu.teamCustom;
  const voiceLabel =
    voiceCharacters.find((character) => character.voiceId === voiceId)?.label ??
    voiceCharacters[0]?.label ??
    '';

  const isNewBest = mode === 'gameOver' && score > 0 && score > bestBeforeRound;

  return (
    <>
      {(mode === 'menu' || mode === 'gameOver') && (
        <a
          className="bmc-link"
          href="https://buymeacoffee.com/jojkos"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee"
          title="Buy me a coffee"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy me a coffee"
            width={150}
            height={42}
            loading="lazy"
          />
        </a>
      )}

      {mode !== 'menu' && (
        <div className="control-cluster">
          <button
            type="button"
            className="utility-button"
            aria-label={isMuted ? strings.controls.enableSound : strings.controls.muteSound}
            onClick={onToggleMute}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          {mode === 'playing' && countdown === null && (
            <button
              type="button"
              className="utility-button"
              aria-label={paused ? strings.controls.resume : strings.controls.pause}
              onClick={onTogglePause}
            >
              {paused ? '▶' : '⏸'}
            </button>
          )}
        </div>
      )}

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
                type="button"
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
              <button type="button" className="lb-btn-prim" onClick={onStartRound}>
                ▶ {strings.menu.start}
              </button>
              <button
                type="button"
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
            <div className="menu-toolbar">
              <button
                type="button"
                className={`menu-tool-btn ${isMuted ? 'is-active' : ''}`}
                aria-label={isMuted ? strings.controls.enableSound : strings.controls.muteSound}
                aria-pressed={isMuted}
                title={isMuted ? strings.controls.enableSound : strings.controls.muteSound}
                onClick={onToggleMute}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <FullscreenButton label={strings.controls.fullscreen} />
              <button
                type="button"
                className="menu-tool-btn"
                aria-label={strings.help.button}
                title={strings.help.button}
                onClick={() => setHelpOpen(true)}
              >
                ?
              </button>
            </div>
            <div className="menu-hero">
              <img
                className="menu-logo"
                src="/assets/images/logo.png"
                alt=""
                aria-hidden="true"
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
                label={CHIP_LABELS[lang].team}
                value={teamLabel}
                leading={
                  <span
                    className="mini-jersey-split"
                    style={{
                      background: jerseyAccentColor && !eqHex(jerseyColor, jerseyAccentColor)
                        ? `linear-gradient(90deg, ${jerseyColor} 50%, ${jerseyAccentColor} 50%)`
                        : jerseyColor,
                    }}
                  />
                }
                wide
              >
                {() => (
                  <div className="team-pop">
                    <div className="team-grid">
                      {TEAMS.map((team) => {
                        const active = currentTeam?.id === team.id;
                        return (
                          <button
                            key={team.id}
                            type="button"
                            className={`team-badge ${active ? 'on' : ''}`}
                            style={{ background: teamBadgeBackground(team) }}
                            title={team.label}
                            aria-label={strings.menu.teamBadgeLabel(team.label)}
                            onClick={() => {
                              onJerseyColorChange(team.primary);
                              onJerseyAccentColorChange(team.accent ?? team.primary);
                            }}
                          >
                            {team.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="team-custom">
                      <p className="menu-pop-title">
                        {currentTeam ? strings.menu.teamTuning : strings.menu.teamCustom}
                      </p>
                      <div
                        className="team-mode"
                        role="tablist"
                        aria-label={strings.menu.teamCustom}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isSolid}
                          className={`team-mode-btn ${isSolid ? 'on' : ''}`}
                          onClick={() => {
                            if (!isSolid) {
                              onJerseyAccentColorChange(jerseyColor);
                            }
                          }}
                        >
                          {strings.menu.teamModeSolid}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={!isSolid}
                          className={`team-mode-btn ${!isSolid ? 'on' : ''}`}
                          onClick={() => {
                            if (isSolid) {
                              // Pick a contrasting default so the stripe is
                              // visible — black on light primaries, white on
                              // dark ones.
                              onJerseyAccentColorChange(
                                isLightColor(jerseyColor) ? '#1a1a1a' : '#ffffff',
                              );
                            }
                          }}
                        >
                          {strings.menu.teamModeStripe}
                        </button>
                      </div>
                      <div className="team-custom-row">
                        <label className="team-color-pick">
                          <span
                            className="team-color-swatch"
                            style={{ background: jerseyColor }}
                          >
                            <input
                              type="color"
                              value={jerseyColor}
                              onChange={(event) => {
                                const next = event.target.value;
                                // In Solid mode, keep accent locked to the
                                // primary so the jersey stays one color.
                                if (isSolid) onJerseyAccentColorChange(next);
                                onJerseyColorChange(next);
                              }}
                            />
                          </span>
                          <span className="team-color-label">
                            <small>{strings.menu.teamPrimaryLabel}</small>
                            <strong>{jerseyColor.toUpperCase()}</strong>
                          </span>
                        </label>
                        {!isSolid && (
                          <label className="team-color-pick">
                            <span
                              className="team-color-swatch"
                              style={{ background: jerseyAccentColor }}
                            >
                              <input
                                type="color"
                                value={jerseyAccentColor}
                                onChange={(event) =>
                                  onJerseyAccentColorChange(event.target.value)
                                }
                              />
                            </span>
                            <span className="team-color-label">
                              <small>{strings.menu.teamAccentLabel}</small>
                              <strong>{jerseyAccentColor.toUpperCase()}</strong>
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
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
              <button type="button" className="menu-start" onClick={onStartRound}>
                ▶ {strings.menu.start}
              </button>
              <button
                type="button"
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
                  {canShowInstall && (
                    <div className="help-section help-section-install">
                      <div className="help-install-text">
                        <h4>📲 {strings.install.title}</h4>
                        <p>{strings.install.intro}</p>
                      </div>
                      <button
                        type="button"
                        className="help-install-btn"
                        onClick={handleInstall}
                      >
                        {strings.menu.install}
                      </button>
                    </div>
                  )}
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

          {iosNudgeOpen && !installInstructionsOpen && (
            <div
              className="ios-nudge-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label={strings.iosNudge.title}
              onClick={dismissIosNudge}
            >
              <section
                className="ios-nudge"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="ios-nudge-icon" aria-hidden="true">📲</div>
                <h3 className="ios-nudge-title">{strings.iosNudge.title}</h3>
                <p className="ios-nudge-body">{strings.iosNudge.body}</p>
                <div className="ios-nudge-actions">
                  <button
                    type="button"
                    className="ios-nudge-cta"
                    onClick={() => {
                      dismissIosNudge();
                      setInstallInstructionsOpen(true);
                    }}
                  >
                    📲 {strings.iosNudge.cta}
                  </button>
                  <button
                    type="button"
                    className="ios-nudge-dismiss"
                    onClick={dismissIosNudge}
                  >
                    {strings.iosNudge.dismiss}
                  </button>
                </div>
              </section>
            </div>
          )}

          {installInstructionsOpen && (
            <div
              className="help-overlay"
              role="dialog"
              aria-modal="true"
              aria-label={strings.install.title}
              onClick={() => setInstallInstructionsOpen(false)}
            >
              <section
                className="help-panel"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="help-panel-head">
                  <h3 className="help-panel-title">📲 {strings.install.title}</h3>
                  <button
                    type="button"
                    className="help-panel-close"
                    aria-label={strings.install.close}
                    onClick={() => setInstallInstructionsOpen(false)}
                  >
                    ✕
                  </button>
                </header>
                <div className="help-panel-body">
                  <div className="help-section">
                    <p>{strings.install.intro}</p>
                  </div>
                  <div className="help-section">
                    <h4>{strings.install.iosHeading}</h4>
                    <p>{strings.install.iosBody}</p>
                  </div>
                  <div className="help-section">
                    <h4>{strings.install.androidHeading}</h4>
                    <p>{strings.install.androidBody}</p>
                  </div>
                  <div className="help-section">
                    <h4>{strings.install.desktopHeading}</h4>
                    <p>{strings.install.desktopBody}</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {paused && mode === 'playing' && (
        <div className="modal-backdrop">
          <section className="pa">
            <div className="menu-toolbar">
              <FullscreenButton label={strings.controls.fullscreen} />
            </div>
            <div className="pa-icon">⏸</div>
            <p className="pa-eye">{strings.pause.eyebrow}</p>
            <h2 className="pa-title">{strings.pause.title}</h2>
            <p className="pa-lede">{strings.pause.lede}</p>
            <div className="pa-actions">
              <button type="button" className="pa-btn-prim" onClick={onTogglePause}>
                ▶ {strings.pause.resume}
              </button>
              <button type="button" className="pa-btn-sec" onClick={onQuitToMenu}>
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
        <div className="modal-backdrop is-gameover">
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
                  {(score / ROUND_DURATION).toFixed(2)}
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
                  disabled={submitState !== 'idle' || pendingName.trim() === ''}
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
              <button type="button" className="res-btn-prim" onClick={onStartRound}>
                ▶ {strings.results.again}
              </button>
              <button type="button" className="res-btn-sec" onClick={onQuitToMenu}>
                {strings.mainMenu}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
