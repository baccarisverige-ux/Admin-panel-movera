export function ComingPage({ title, order }: { title: string; order: string }) {
  return (
    <div className="page-heading">
      <div>
        <h2>{title}</h2>
        <p>Coming in {order}. This screen is not the old demo page.</p>
      </div>
    </div>
  );
}
