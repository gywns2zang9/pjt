import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("w-full max-w-5xl px-5 mx-auto", className)}>
      {children}
    </div>
  );
}

