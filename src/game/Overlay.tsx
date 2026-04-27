import type { GameMode } from './types';
import type { VoiceCharacter } from './useFunnySpeech';
import { SUPPORTED_LANGS, type Lang, type Strings } from './i18n';

const LANG_FLAGS: Record<Lang, string> = {
  cs: '🇨🇿',
  en: '🇬🇧',
};

const LANG_LABELS: Record<Lang, string> = {
  cs: 'Čeština',
  en: 'English',
};

export function Overlay({
  bestScore,
  countdown,
  mode,
  maxStreak,
  paused,
  score,
  streak,
  timeLeft,
  onStartRound,
  tagBurst,
  tagPhrase,
  isMuted,
  onToggleMute,
  onTogglePause,
  voiceId,
  onVoiceChange,
  voiceCharacters,
  lang,
  onLangChange,
  strings,
}: Readonly<{
  bestScore: number;
  countdown: number | null;
  mode: GameMode;
  maxStreak: number;
  paused: boolean;
  score: number;
  streak: number;
  timeLeft: number;
  onStartRound: () => void;
  tagBurst: number;
  tagPhrase: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  voiceId: string;
  onVoiceChange: (voiceId: string) => void;
  voiceCharacters: VoiceCharacter[];
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  strings: Strings;
}>) {
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

      {mode === 'playing' && streak > 1 && (
        <div className="streak-badge" key={streak}>
          <span>{streak}×</span>
          <small>{strings.combo}</small>
        </div>
      )}

      {mode === 'playing' && countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-disc" key={countdown}>
            {countdown > 0 ? countdown : strings.countdownGo}
          </div>
        </div>
      )}

      {lowTime && <div className="rush-banner">{strings.finalRush}</div>}

      <div className={`tag-banner ${tagBurst > 0 ? 'is-visible' : ''}`}>
        {tagPhrase || strings.defaultTagBanner}
      </div>

      {mode === 'menu' && (
        <div className="modal-backdrop is-menu">
          <section className="modal-panel modal-menu">
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
              <div>
                <span>{strings.menu.grid.tagLabel}</span>
                <strong>{strings.menu.grid.tagValue}</strong>
                <small>{strings.menu.grid.tagHint}</small>
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
            <button className="primary-button" onClick={onStartRound}>
              {strings.menu.start}
            </button>
            <p className="modal-foot">{strings.menu.bestSoFar(bestScore)}</p>
          </section>
        </div>
      )}

      {paused && mode === 'playing' && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-pause">
            <p className="eyebrow">{strings.pause.eyebrow}</p>
            <h2>{strings.pause.title}</h2>
            <p className="modal-lede">{strings.pause.lede}</p>
            <button className="primary-button" onClick={onTogglePause}>
              {strings.pause.resume}
            </button>
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
              {score > bestScore - 1 && score > 0
                ? strings.results.newBest
                : strings.results.tryAgain}
            </p>
            <div className="results-grid">
              <div>
                <span>{strings.results.best}</span>
                <strong>{Math.max(score, bestScore)}</strong>
              </div>
              <div>
                <span>{strings.results.topCombo}</span>
                <strong>{maxStreak}×</strong>
              </div>
              <div>
                <span>{strings.results.pace}</span>
                <strong>
                  {(score / 45).toFixed(2)}
                  {strings.results.paceUnit}
                </strong>
              </div>
            </div>
            <button className="primary-button" onClick={onStartRound}>
              {strings.results.again}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
