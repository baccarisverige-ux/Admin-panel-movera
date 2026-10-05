const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  quoted: "Quoted",
  requested: "Requested",
  searching: "Searching",
  offered: "Offered",
  accepted: "Accepted",
  driver_to_pickup: "Driver to pickup",
  arrived: "Arrived",
  rider_onboard: "Rider onboard",
  in_trip: "On a trip",
  approaching_dropoff: "Approaching drop-off",
  completed: "Completed",
  cancelled_by_rider: "Cancelled by rider",
  cancelled_by_driver: "Cancelled by driver",
  cancelled_by_admin: "Cancelled by admin",
  no_show: "No show",
  expired: "Expired",
  failed: "Failed",
  pending: "Pending",
  active: "Active",
  on_hold: "On hold",
  suspended: "Suspended",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  needed: "Needed",
  expiring: "Expiring",
};

export function statusLabel(code: string): string {
  return STATUS_LABELS[code] ?? code.replaceAll("_", " ");
}

export const ACTION_REASONS = [
  "Safety review",
  "Wrong document",
  "Name does not match",
  "Blurry",
  "Expired",
  "Cut off",
  "Other",
] as const;
