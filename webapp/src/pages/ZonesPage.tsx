import { useState } from "react";
import { useForm } from "react-hook-form";
import { ZONES_TABLE, catalogFor } from "../api/read";
import { DataTable } from "../ui/DataTable";
import { Modal } from "../ui/Modal";
import { PageHeading } from "../ui/PageHeading";
import { ZoneMap } from "./ZoneMap";

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
        <button className="primary-btn" type="button" onClick={() => setModalOpen(true)}>
          Create New Zone
        </button>
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
          <button className="secondary-btn" type="button">
            Draw Polygon
          </button>
          <button className="secondary-btn" type="button">
            Draw Rectangle
          </button>
          <button className="secondary-btn" type="button">
            Clear
          </button>
        </div>
        <div className="modal-actions">
          <button className="secondary-btn modal-close-action" type="button" onClick={closeModal}>
            Cancel
          </button>
          <button className="primary-btn" type="button" onClick={closeModal}>
            Create Zone
          </button>
        </div>
      </Modal>
    </>
  );
}
