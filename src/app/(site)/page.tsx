import { templateOf } from "@/lib/appearance";
import { loadHome } from "@/components/site/home/data";
import { LuxeHome } from "@/components/site/home/luxe";
import { BoutiqueHome } from "@/components/site/home/boutique";
import { GrandHome } from "@/components/site/home/grand";
import { SoftHome } from "@/components/site/home/soft";
import { GlassHome } from "@/components/site/home/glass";
import { OpusHome } from "@/components/site/home/opus";

export default async function HomePage() {
  const d = await loadHome();
  switch (templateOf(d.s)) {
    case "boutique":
      return <BoutiqueHome d={d} />;
    case "luxe":
      return <LuxeHome d={d} />;
    case "soft":
      return <SoftHome d={d} />;
    case "glass":
      return <GlassHome d={d} />;
    case "opus":
      return <OpusHome d={d} />;
    default:
      return <GrandHome d={d} />;
  }
}
