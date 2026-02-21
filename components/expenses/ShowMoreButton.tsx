"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface ShowMoreButtonProps {
  currentPage: number;
  hasMore: boolean;
}

export function ShowMoreButton({ currentPage, hasMore }: ShowMoreButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!hasMore) return null;

  const handleShowMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={handleShowMore}>
        Show More
      </Button>
    </div>
  );
}
