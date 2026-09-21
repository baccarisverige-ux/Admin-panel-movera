import type { ReactNode } from "react";

type PageHeadingProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function PageHeading({ title, subtitle, children }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
