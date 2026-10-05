import { useNavigate } from "react-router";
import { catalogFor } from "../api/read";
import { useSession } from "../auth/SessionContext";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import { coreZones, zoneTypeLabel, type ZoneBook, type ZoneShape } from "../zones/releases";
import { DataTable } from "../ui/DataTable";
import { PageHeading } from "../ui/PageHeading";
import { ZoneMap } from "./ZoneMap";
import { CommandButton } from "../ui/CommandButton";

function zoneStatus(zone: ZoneShape, book: ZoneBook): string {
  if (zone.archived) return "Archived";
  if (book.status === "in_review") return "In review";
  const published = book.published.find((item) => item.id === zone.id);
  if (!published) return "Draft";
  const sameShape = JSON.stringify(published.points) === JSON.stringify(zone.points) && JSON.stringify(published.holes) === JSON.stringify(zone.holes);
  return sameShape && published.zoneFeeOre === zone.zoneFeeOre ? "Published" : "Draft";
}

export function ZonesPage() {
  const page = catalogFor("zones");
  const navigate = useNavigate();
  const { agent } = useSession();
  const ui = useZoneUi();
  const rows = coreZones(ui.book.draft);

  return (
    <>
      <PageHeading title={page.title} subtitle="Greater Stockholm, nine operating zones, Arlanda and Bromma. Draw on the map, then a second agent publishes.">
        <CommandButton command="admin.zone.create" className="primary-btn" type="button" onDone={() => { if (agent) zoneStore.create(agent.id); }}>
          Create New Zone
        </CommandButton>
      </PageHeading>

      <article className="panel">
        <div className="panel-title-row">
          <h3>Existing zones</h3>
        </div>
        <DataTable
          head={["Code", "Name", "Type", "Status", "Version", "Archive"]}
          rows={rows.map((zone) => [
            zone.code,
            zone.name,
            zoneTypeLabel(zone.kind),
            zoneStatus(zone, ui.book),
            `v${ui.book.versions.length}`,
            <span key={zone.id} onClick={(event) => event.stopPropagation()}>
              <CommandButton
                command="admin.zone.archive"
                className="link-action"
                type="button"
                disabled={zone.archived}
                onDone={() => { if (agent) zoneStore.archive(zone.id, agent.id); }}
              >
                Archive
              </CommandButton>
            </span>,
          ])}
          onRow={(index) => {
            const id = rows[index]?.id;
            if (id) navigate(`/zones/${id}`);
          }}
        />
      </article>

      <ZoneMap />
    </>
  );
}
