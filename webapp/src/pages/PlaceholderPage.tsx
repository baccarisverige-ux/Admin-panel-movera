import type { AdminPage } from "../nav";

export function PlaceholderPage({ page }: { page: AdminPage }) {
  return (
    <article className="panel">
      <h2>{page.label}</h2>
      <p>
        A3 will port this screen from the static design spec. Typed mocks land
        in A4. Commands are not wired yet.
      </p>
    </article>
  );
}
