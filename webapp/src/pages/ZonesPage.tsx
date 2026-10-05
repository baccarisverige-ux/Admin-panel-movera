import { Link, useNavigate } from "react-router";
import { catalogFor } from "../api/read";
import { useSession } from "../auth/SessionContext";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import { coreZones, zoneStatus, zoneTypeLabel } from "../zones/releases";
import { DataTable } from "../ui/DataTable";
import { PageHeading } from "../ui/PageHeading";
import { ZoneMap } from "./ZoneMap";
import { CommandButton } from "../ui/CommandButton";

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

      <ZoneMap />

      <article className="panel">
        <div className="panel-title-row">
          <h3>Existing zones</h3>
        </div>
        <DataTable
          head={["Code", "Name", "Type", "Status", "Version", "Archive"]}
          rows={rows.map((zone) => [
            zone.code,
            <Link key={zone.id} to={`/zones/${zone.id}`}>{zone.name}</Link>,
            zoneTypeLabel(zone.kind),
            zoneStatus(zone, ui.book),
            `v${ui.book.versions.length}`,
            <span key={`${zone.id}-archive`} onClick={(event) => event.stopPropagation()}>
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
    </>
  );
}