import { useState } from "react";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { CommandButton } from "./CommandButton";

type SensitiveValueProps = {
  value: string;
  permission: "drivers.viewSensitive" | "riders.viewSensitive";
  command: "admin.driver.revealSensitive" | "admin.rider.revealSensitive";
  targetId: string;
  label?: string;
};

function masked(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "••••";
  return `•••• ${compact.slice(-4)}`;
}

export function SensitiveValue({ value, permission, command, targetId, label = "Sensitive" }: SensitiveValueProps) {
  const { agent } = useSession();
  const [revealed, setRevealed] = useState(false);
  const permitted = Boolean(agent && can(agent.role, permission));

  if (!permitted) return <span title="Your role cannot reveal this value.">{label}: restricted</span>;
  if (revealed) return <span>{label}: {value}</span>;

  return (
    <span>
      {label}: {masked(value)}{" "}
      <CommandButton
        command={command}
        className="link-action"
        type="button"
        targetId={targetId}
        before="masked"
        after="revealed"
        onDone={() => setRevealed(true)}
      >
        Reveal
      </CommandButton>
    </span>
  );
}
