import "../styles/game.css";

interface MoveHistoryProps {
  history: string[];
}

export function MoveHistory({ history }: MoveHistoryProps) {
  return (
    <div className="game-history-col">
      <div className="panel-header">Move history</div>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="history-empty">No moves yet</p>
        ) : (
          history.map((san, i) => (
            <div key={`${i}-${san}`} className="history-move">
              {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
              {san}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
