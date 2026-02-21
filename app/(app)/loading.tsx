import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8" />
        <div className="label-mono text-foreground/40">LOADING...</div>
      </div>
    </div>
  );
}
