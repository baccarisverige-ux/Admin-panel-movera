import { useState } from "react";
import { averageStars, BONUSES, hideReview, type Review } from "../growth/book";
import { redeemReferral, type Referral } from "../growth/referral";

const SEED: Review[] = [
  { id: "V1", stars: 5, text: "Smooth ride", hidden: false, hideReason: null },
  { id: "V2", stars: 1, text: "Driver was late", hidden: false, hideReason: null },
];

export function GrowthPage() {
  const [reviews, setReviews] = useState(SEED);
  const [notice, setNotice] = useState(`Bonuses: ${BONUSES.map((bonus) => bonus.id).join(", ")}.`);
  const [code, setCode] = useState<Referral>({ code: "SARA20", ownerId: "R9", uses: 0, cap: 2 });
  const [rider, setRider] = useState("R1");

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Growth</h2>
          <p>Average of visible reviews: {averageStars(reviews).toFixed(1)}</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <h3>Referral {code.code}</h3>
        <p>
          Owner {code.ownerId}. Uses {code.uses} of {code.cap}.
        </p>
        <label>
          Rider
          <input value={rider} onChange={(event) => setRider(event.target.value)} />
        </label>
        <button
          className="secondary-btn"
          type="button"
          onClick={() => {
            const result = redeemReferral(code, rider);
            if (result.error) setNotice(result.error);
            else {
              setCode(result.referral);
              setNotice(`${rider} used ${code.code}.`);
            }
          }}
        >
          Redeem
        </button>
      </article>
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
