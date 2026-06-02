import "../styles/game.css";

interface MoveHistoryProps {
  history: string[];
}

function buildRows(history: string[]) {
  const rows: { num: number; white: string; black: string | null }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] ?? null,
    });
  }
  return rows;
}

export function MoveHistory({ history }: MoveHistoryProps) {
  const rows = buildRows(history);
  const latestRow = rows.length > 0 ? rows.length - 1 : -1;

  return (
    <div className="game-history-col">
      <div className="panel-header">Move history</div>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="history-empty">No moves yet — white to play</p>
        ) : (
          <div className="history-table">
            {rows.map((row, i) => (
              <div
                key={row.num}
                className={`history-row ${i === latestRow ? "history-row--latest" : ""}`}
              >
                <span className="history-num">{row.num}.</span>
                <span className="history-san">{row.white}</span>
                <span
                  className={`history-san ${row.black ? "" : "history-san--empty"}`}
                >
                  {row.black ?? "·"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
