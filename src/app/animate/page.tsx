import { Room } from "../room";
import { Nav } from "@/components/ui/nav";

export default function AnimatePage() {
  return (
    <Room user={null}>
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="pt-20 flex items-center justify-center">
          <div className="text-muted-foreground">Animation playground coming soon.</div>
        </main>
      </div>
    </Room>
  );
}
