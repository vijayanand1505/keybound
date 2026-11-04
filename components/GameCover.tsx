import Image from "next/image";
import coast from "@/public/images/games/storm-coast.png";
import ascent from "@/public/images/games/white-ascent.png";
import orbit from "@/public/images/games/signal-siege.png";

const covers = { coast, ascent, orbit };
export default function GameCover({
  kind,
  eager = false,
  sizes = "(max-width: 600px) 90px, (max-width: 950px) 30vw, 360px",
}: {
  kind: keyof typeof covers;
  eager?: boolean;
  sizes?: string;
}) {
  return (
    <div className={`game-cover cover-${kind}`} aria-hidden="true">
      <Image
        src={covers[kind]}
        alt=""
        fill
        sizes={sizes}
        placeholder="blur"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className="game-cover-image"
      />
    </div>
  );
}
