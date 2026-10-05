import { useState } from "react";
import { ZONE_MAP_LABELS, ZONES_TABLE, catalogFor } from "../data/catalog";
import { DataTable } from "../ui/DataTable";
import { MapCanvas } from "../ui/MapCanvas";
import { Modal } from "../ui/Modal";
import { PageHeading } from "../ui/PageHeading";

export function ZonesPage() {
  const page = catalogFor("zones");
  const [modalOpen, setModalOpen] = useState(false);

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

      <article className="panel map-placeholder">
        <div className="panel-title-row">
          <h3>Zone Map</h3>
          <button className="secondary-btn" type="button">
            Reset View
          </button>
        </div>
        <MapCanvas labels={ZONE_MAP_LABELS} />
      </article>

      <Modal open={modalOpen} title="Create New Zone" onClose={closeModal}>
        <label>
          Zone Name
          <input />
        </label>
        <label>
          City
          <input />
        </label>
        <label>
          Country
          <input />
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
