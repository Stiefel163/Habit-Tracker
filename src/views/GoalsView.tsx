import { useStore } from "../data/StoreProvider";
import { goalStates } from "../domain/progress";

export function GoalsView() {
  const { data } = useStore();
  const goals = goalStates(data);
  const reached = goals.filter((g) => g.reached).length;

  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>Goals</h1>
          <p className="muted">
            {reached} of {goals.length} reached. Each one brings an animal to your forest.
          </p>
        </div>
      </header>

      <ul className="goals">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.count / g.target) * 100));
          return (
            <li key={g.id} className={`goal${g.reached ? " reached" : ""}`}>
              <span className="goal-animal" aria-hidden="true">
                {g.animal}
              </span>
              <div className="goal-main">
                <div className="goal-top">
                  <span className="goal-name">
                    {g.target} × {g.label}
                  </span>
                  <span className="goal-num">
                    {g.count}/{g.target}
                  </span>
                </div>
                <div
                  className="bar"
                  role="progressbar"
                  aria-label={`${g.label}: ${g.count} of ${g.target} ${g.unit}`}
                  aria-valuemin={0}
                  aria-valuemax={g.target}
                  aria-valuenow={Math.min(g.count, g.target)}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
                <span className="muted small">
                  {g.reached ? `Done! The ${g.animalName.toLowerCase()} lives in your forest now.` : `${g.target - g.count} ${g.unit} to go · unlocks the ${g.animalName.toLowerCase()}`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
