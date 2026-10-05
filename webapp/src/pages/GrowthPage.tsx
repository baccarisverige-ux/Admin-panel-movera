import { useState } from "react";
import { averageStars, BONUSES, hideReview, type Review } from "../growth/book";

const SEED: Review[] = [
  { id: "V1", stars: 5, text: "Smooth ride", hidden: false, hideReason: null },
  { id: "V2", stars: 1, text: "Driver was late", hidden: false, hideReason: null },
];

export function GrowthPage() {
  const [reviews, setReviews] = useState(SEED);
  const [notice, setNotice] = useState(`Bonuses: ${BONUSES.map((bonus) => bonus.id).join(", ")}.`);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Growth</h2>
          <p>Average of visible reviews: {averageStars(reviews).toFixed(1)}</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      {reviews.map((review) => (
        <article className="panel" key={review.id}>
          <p>
            {review.stars} · {review.text} {review.hidden ? `(hidden: ${review.hideReason})` : ""}
          </p>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              const result = hideReview(review, "Not about the trip");
              if (result.error) setNotice(result.error);
              else {
                setReviews(reviews.map((item) => (item.id === review.id ? result.review : item)));
                setNotice("Hidden. The original text is kept and the average is recomputed.");
              }
            }}
          >
            Hide
          </button>
        </article>
      ))}
    </>
  );
}
