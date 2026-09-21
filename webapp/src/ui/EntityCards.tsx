import type { CardTuple } from "../data/catalog";

type EntityCardsProps = {
  title?: string;
  cards: readonly CardTuple[];
};

export function EntityCards({ title = "Overview", cards }: EntityCardsProps) {
  return (
    <article className="panel">
      <div className="panel-title-row">
        <h3>{title}</h3>
      </div>
      <div className="cards-list">
        {cards.map(([heading, detail, actions]) => (
          <div className="entity-card" key={heading}>
            <h4>{heading}</h4>
            <p>{detail}</p>
            {actions ? (
              <div className="card-actions">
                {actions.split("|").map((action) => (
                  <button key={action} className="small-btn" type="button">
                    {action}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}
