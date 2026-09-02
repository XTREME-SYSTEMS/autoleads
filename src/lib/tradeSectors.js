export const TRADE_SECTORS = {
  "Concrete Polishing": [
    {
      category: "Polished Concrete",
      sectors: [
        { key: "stained", label: "Stained Concrete", prompt: "stained concrete flooring with rich vibrant color and natural variation" },
        { key: "satin_400", label: "Satin Polished (400 Grit)", prompt: "satin polished concrete flooring with 400 grit finish, soft sheen, smooth surface" },
        { key: "high_gloss_800", label: "High Gloss (800 Grit)", prompt: "high gloss polished concrete flooring with 800 grit finish, reflective shine" },
        { key: "mirror_1500", label: "Mirror Finish (1500 Grit)", prompt: "mirror finish polished concrete flooring with 1500 grit finish, ultra-reflective glass-like surface" },
      ],
    },
    {
      category: "Epoxy Flooring",
      sectors: [
        { key: "quartz_epoxy", label: "Quartz Epoxy", prompt: "quartz epoxy flooring with textured speckled surface and durable quartz aggregate" },
        { key: "solid_epoxy", label: "Solid Color Epoxy", prompt: "solid color epoxy flooring with smooth uniform seamless finish" },
        { key: "flake_epoxy", label: "Flake Epoxy", prompt: "flake epoxy flooring with decorative vinyl flakes in colorful speckled pattern" },
        { key: "metallic_epoxy", label: "Metallic Epoxy", prompt: "metallic epoxy flooring with shimmering 3D metallic effect and pearlescent swirls" },
      ],
    },
    {
      category: "Sealed Concrete",
      sectors: [
        { key: "sealed", label: "Sealed Concrete", prompt: "sealed concrete flooring with protective sealer and natural concrete appearance with subtle sheen" },
      ],
    },
    {
      category: "Exterior Flooring",
      sectors: [
        { key: "driveways", label: "Driveways", prompt: "concrete driveway with smooth finish and clean lines in residential exterior" },
        { key: "patios", label: "Patios", prompt: "concrete patio with decorative finish in outdoor living space" },
        { key: "walkways", label: "Walkways", prompt: "concrete walkway with clean finish integrated into landscape" },
        { key: "pool_decks", label: "Pool Decks", prompt: "concrete pool deck with non-slip finish surrounding swimming pool" },
      ],
    },
  ],
  "General Construction": [
    {
      category: "Commercial",
      sectors: [
        { key: "office", label: "Office Space", prompt: "modern office space interior with professional flooring" },
        { key: "warehouse", label: "Warehouse", prompt: "warehouse interior with durable industrial flooring" },
        { key: "retail", label: "Retail Space", prompt: "retail store interior with attractive commercial flooring" },
        { key: "showroom", label: "Showroom", prompt: "luxury showroom interior with premium flooring" },
      ],
    },
    {
      category: "Residential",
      sectors: [
        { key: "residential_interior", label: "Residential Interior", prompt: "residential interior with quality flooring in home living space" },
        { key: "residential_exterior", label: "Residential Exterior", prompt: "residential exterior with quality construction and home exterior" },
      ],
    },
    {
      category: "Industrial",
      sectors: [
        { key: "industrial_facility", label: "Industrial Facility", prompt: "industrial facility interior with heavy-duty flooring" },
        { key: "distribution_center", label: "Distribution Center", prompt: "distribution center interior with polished concrete flooring" },
      ],
    },
  ],
};

export const SPACE_TYPES = [
  "Office", "Commercial Space", "Warehouse", "Retail", "Showroom",
  "Industrial Facility", "Distribution Center", "Residential Interior",
  "Residential Exterior", "Driveway", "Patio", "Walkway", "Pool Deck",
  "Parking Garage", "Auto Dealership", "Restaurant", "Healthcare Facility",
  "Educational Facility", "Government Building",
];

export const getTradeSectors = (trades) => {
  if (!trades || trades.length === 0) return TRADE_SECTORS["General Construction"];
  const tradeStr = trades.join(" ").toLowerCase();
  if (tradeStr.includes("concrete") || tradeStr.includes("polish") || tradeStr.includes("epoxy")) {
    return TRADE_SECTORS["Concrete Polishing"];
  }
  if (tradeStr.includes("general") || tradeStr.includes("construction") || tradeStr.includes("contractor")) {
    return TRADE_SECTORS["General Construction"];
  }
  return TRADE_SECTORS["General Construction"];
};

export const getSectorLabel = (sectors, sectorKey) => {
  for (const cat of sectors) {
    const s = cat.sectors.find(s => s.key === sectorKey);
    if (s) return s.label;
  }
  return sectorKey;
};