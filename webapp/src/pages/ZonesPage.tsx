import { useState } from "react";
import { useForm } from "react-hook-form";
import { ZONES_TABLE, catalogFor } from "../api/read";
import { DataTable } from "../ui/DataTable";
import { Modal } from "../ui/Modal";
import { PageHeading } from "../ui/PageHeading";
import { ZoneMap } from "./ZoneMap";
import { CommandButton } from "../ui/CommandButton";

export function ZonesPage() {
  const page = catalogFor("zones");
  const [modalOpen, setModalOpen] = useState(false);
  const form = useForm({ defaultValues: { name: "", city: "Stockholm", country: "Sweden" } });

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <>
      <PageHeading title={page.title} subtitle={page.subtitle}>
        <CommandButton command="admin.zone.create" className="primary-btn" type="button" onDone={() => setModalOpen(true)}>
          Create New Zone
        </CommandButton>
      </PageHeading>

      <article className="panel">
        <div className="panel-title-row">
          <h3>Existing Zones</h3>
        </div>
        <DataTable head={ZONES_TABLE.head} rows={ZONES_TABLE.rows} />
      </article>

      <ZoneMap />

      <Modal open={modalOpen} title="Create New Zone" onClose={closeModal}>
        <label>
          Zone Name
          <input {...form.register("name")} />
        </label>
        <label>
          City
          <input {...form.register("city")} />
        </label>
        <label>
          Country
          <input {...form.register("country")} />
        </label>
        <label>Define Zone Boundaries</label>
        <div className="button-row">
          <CommandButton command="admin.zone.drawPolygon" className="secondary-btn" type="button">
            Draw Polygon
          </CommandButton>
          <CommandButton command="admin.zone.drawRectangle" className="secondary-btn" type="button">
            Draw Rectangle
          </CommandButton>
          <CommandButton command="admin.zone.clear" className="secondary-btn" type="button">
            Clear
          </CommandButton>
        </div>
        <div className="modal-actions">
          <CommandButton command="admin.zone.cancel" className="secondary-btn modal-close-action" type="button" onDone={closeModal}>
            Cancel
          </CommandButton>
          <CommandButton command="admin.zone.save" className="primary-btn" type="button" onDone={closeModal}>
            Create Zone
          </CommandButton>
        </div>
      </Modal>
    </>
  );
}
