import type { GameMode } from './types';

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
}>) {
  const showHud = mode === 'playing';
  const lowTime = showHud && countdown === null && timeLeft <= 10;

  return (
    <>
      {showHud && (
        <header className="hud">
          <div className="hud-chip hud-score">
            <span className="hud-label">score</span>
            <strong>{score}</strong>
          </div>
          <div className={`hud-chip hud-time ${lowTime ? 'is-low' : ''}`}>
            <span className="hud-label">time</span>
            <strong>{Math.ceil(timeLeft)}</strong>
          </div>
          <div className="hud-chip hud-best">
            <span className="hud-label">best</span>
            <strong>{bestScore}</strong>
          </div>
        </header>
      )}

      <div className="control-cluster">
        <button
          className="utility-button"
          aria-label={isMuted ? 'Enable sound' : 'Mute sound'}
          onClick={onToggleMute}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        {mode === 'playing' && (
          <button
            className="utility-button"
            aria-label={paused ? 'Resume round' : 'Pause round'}
            onClick={onTogglePause}
          >
            {paused ? '▶' : '⏸'}
          </button>
        )}
      </div>

      {mode === 'playing' && streak > 1 && (
        <div className="streak-badge" key={streak}>
          <span>{streak}×</span>
          <small>combo</small>
        </div>
      )}

      {mode === 'playing' && countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-disc" key={countdown}>
            {countdown > 0 ? countdown : 'GO'}
          </div>
        </div>
      )}

      {lowTime && <div className="rush-banner">final rush</div>}

      <div className={`tag-banner ${tagBurst > 0 ? 'is-visible' : ''}`}>
        {tagPhrase || 'Nice latch'}
      </div>

      {mode === 'menu' && (
        <div className="modal-backdrop is-menu">
          <section className="modal-panel modal-menu">
            <p className="eyebrow">arcade chase</p>
            <h2>Pug Fiesta</h2>
            <p className="modal-lede">
              Cut the angle. Time the pounce. Stack tags before the clock dies.
            </p>
            <div className="modal-grid">
              <div>
                <span>Desktop</span>
                <strong>WASD / Arrows</strong>
                <small>Space to dash</small>
              </div>
              <div>
                <span>Mobile</span>
                <strong>Stick + Dash</strong>
                <small>Touch friendly</small>
              </div>
              <div>
                <span>Round</span>
                <strong>45 seconds</strong>
                <small>Beat your best</small>
              </div>
              <div>
                <span>Tag</span>
                <strong>Latch on impact</strong>
                <small>Hold the combo</small>
              </div>
            </div>
            <button className="primary-button" onClick={onStartRound}>
              Start round
            </button>
            <p className="modal-foot">Best so far · {bestScore} tags</p>
          </section>
        </div>
      )}

      {paused && mode === 'playing' && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-pause">
            <p className="eyebrow">paused</p>
            <h2>Take a breath</h2>
            <p className="modal-lede">Resume when you are ready to chase again.</p>
            <button className="primary-button" onClick={onTogglePause}>
              Resume
            </button>
          </section>
        </div>
      )}

      {mode === 'gameOver' && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-results">
            <p className="eyebrow">round complete</p>
            <h2>
              <span className="results-number">{score}</span>
              <span className="results-suffix">tags</span>
            </h2>
            <p className="modal-lede">
              {score > bestScore - 1 && score > 0
                ? 'New personal best — push it further next round.'
                : 'Tighten the timing and beat the line.'}
            </p>
            <div className="results-grid">
              <div>
                <span>Best</span>
                <strong>{Math.max(score, bestScore)}</strong>
              </div>
              <div>
                <span>Top combo</span>
                <strong>{maxStreak}×</strong>
              </div>
              <div>
                <span>Pace</span>
                <strong>{(score / 45).toFixed(2)}/s</strong>
              </div>
            </div>
            <button className="primary-button" onClick={onStartRound}>
              Play again
            </button>
          </section>
        </div>
      )}
    </>
  );
}
