import { Skeleton } from "@/components/ui/skeleton";

export function CollectionLoading() {
  return (
    <div className="w-[calc(100%-16px)] flex flex-col p-8 justify-center items-center gap-3">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
}
