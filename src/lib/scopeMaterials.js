// Universal scope → materials mapping.
// Reference data shared across all orgs/trades — used to suggest typical
// materials for a chosen scope and to seed the material database.

export const SCOPE_MATERIALS = {
  "Concrete Polishing": [
    { material: "Densifier (Sodium Silicate)", unit: "GAL", category: "Treatment" },
    { material: "Grinding Cup Wheel 30 Grit", unit: "EA", category: "Tooling" },
    { material: "Polishing Pad 800 Grit", unit: "EA", category: "Tooling" },
    { material: "Burnishing Pad", unit: "EA", category: "Tooling" },
    { material: "Guardian Sealer/Wax", unit: "GAL", category: "Finishing" },
  ],
  "Epoxy Flooring": [
    { material: "Epoxy Primer", unit: "GAL", category: "Resin" },
    { material: "Epoxy Base Coat", unit: "GAL", category: "Resin" },
    { material: "Epoxy Topcoat", unit: "GAL", category: "Resin" },
    { material: "Metallic Pigment", unit: "EA", category: "Additive" },
    { material: "Clear Coat", unit: "GAL", category: "Finishing" },
    { material: "Anti-Slip Additive", unit: "EA", category: "Additive" },
  ],
  Drywall: [
    { material: 'Drywall Sheet 1/2" 4x8', unit: "EA", category: "Board" },
    { material: 'Drywall Sheet 5/8" 4x8', unit: "EA", category: "Board" },
    { material: 'Metal Stud 2-1/2" 25GA', unit: "EA", category: "Framing" },
    { material: "Metal Track", unit: "EA", category: "Framing" },
    { material: "Joint Compound 5gal", unit: "EA", category: "Finishing" },
    { material: "Paper Tape", unit: "EA", category: "Finishing" },
    { material: "Corner Bead", unit: "LF", category: "Finishing" },
    { material: 'Drywall Screws 1-1/4"', unit: "LB", category: "Fasteners" },
  ],
  Carpentry: [
    { material: '2x4 Lumber 8\'', unit: "EA", category: "Lumber" },
    { material: '2x6 Lumber 8\'', unit: "EA", category: "Lumber" },
    { material: 'Plywood 1/2" 4x8', unit: "EA", category: "Sheet Goods" },
    { material: 'OSB 7/16" 4x8', unit: "EA", category: "Sheet Goods" },
    { material: "Deck Screws 3\"", unit: "LB", category: "Fasteners" },
    { material: "Construction Adhesive", unit: "EA", category: "Adhesives" },
    { material: "Wood Filler", unit: "EA", category: "Finishing" },
  ],
  Concrete: [
    { material: "Concrete Mix 80lb", unit: "EA", category: "Mix" },
    { material: "Rebar #4 20ft", unit: "EA", category: "Reinforcement" },
    { material: "Wire Mesh 6x6", unit: "EA", category: "Reinforcement" },
    { material: "Concrete Sealer", unit: "GAL", category: "Finishing" },
    { material: "Expansion Joint", unit: "LF", category: "Accessories" },
  ],
  Flooring: [
    { material: "Luxury Vinyl Tile", unit: "SF", category: "Flooring" },
    { material: "Carpet Tile", unit: "SF", category: "Flooring" },
    { material: "Flooring Adhesive", unit: "GAL", category: "Adhesives" },
    { material: "Transition Strip", unit: "LF", category: "Accessories" },
    { material: "Underlayment", unit: "SF", category: "Underlayment" },
  ],
  Painting: [
    { material: "Interior Latex Paint 5gal", unit: "EA", category: "Paint" },
    { material: "Exterior Latex Paint 5gal", unit: "EA", category: "Paint" },
    { material: "Primer 5gal", unit: "EA", category: "Paint" },
    { material: "Roller Covers 3/4\"", unit: "EA", category: "Supplies" },
    { material: "Painter Tape", unit: "EA", category: "Supplies" },
    { material: "Drop Cloth", unit: "EA", category: "Supplies" },
  ],
  Roofing: [
    { material: "Architectural Shingles", unit: "EA", category: "Shingles" },
    { material: "Underlayment 30lb", unit: "EA", category: "Underlayment" },
    { material: "Roofing Nails", unit: "LB", category: "Fasteners" },
    { material: "Flashing", unit: "LF", category: "Flashing" },
    { material: "Roof Sealant", unit: "EA", category: "Sealants" },
  ],
  Insulation: [
    { material: 'Fiberglass Batts R-13', unit: "EA", category: "Batt" },
    { material: 'Fiberglass Batts R-19', unit: "EA", category: "Batt" },
    { material: "Spray Foam Kit", unit: "EA", category: "Spray Foam" },
    { material: "Vapor Barrier", unit: "SF", category: "Barrier" },
  ],
  Tile: [
    { material: "Porcelain Tile 12x12", unit: "SF", category: "Tile" },
    { material: "Ceramic Tile 12x12", unit: "SF", category: "Tile" },
    { material: "Thinset Mortar 50lb", unit: "EA", category: "Setting" },
    { material: "Grout 25lb", unit: "EA", category: "Grout" },
    { material: "Tile Spacers", unit: "EA", category: "Accessories" },
  ],
  Masonry: [
    { material: "Concrete Block 8x8x16", unit: "EA", category: "Block" },
    { material: "Brick Modular", unit: "EA", category: "Brick" },
    { material: "Mortar Mix 80lb", unit: "EA", category: "Mortar" },
    { material: "Rebar #4", unit: "EA", category: "Reinforcement" },
  ],
  Electrical: [
    { material: "Romex 12/2 250ft", unit: "EA", category: "Wire" },
    { material: "Outlet Box", unit: "EA", category: "Boxes" },
    { material: "Switch Box", unit: "EA", category: "Boxes" },
    { material: "Receptacle 15A", unit: "EA", category: "Devices" },
    { material: "Light Switch", unit: "EA", category: "Devices" },
  ],
  Plumbing: [
    { material: 'PVC Pipe 1/2" 10ft', unit: "EA", category: "Pipe" },
    { material: 'CPVC Pipe 3/4" 10ft', unit: "EA", category: "Pipe" },
    { material: "PVC Cement", unit: "EA", category: "Adhesives" },
    { material: "Shower Valve", unit: "EA", category: "Fixtures" },
    { material: "Toilet", unit: "EA", category: "Fixtures" },
  ],
  "Demolition": [
    { material: "Dumpster Rental 30yd", unit: "EA", category: "Disposal" },
    { material: "Dust Barrier", unit: "EA", category: "Containment" },
    { material: "Pry Bar", unit: "EA", category: "Tools" },
  ],
  "Windows & Doors": [
    { material: "Window 3x4 Vinyl", unit: "EA", category: "Windows" },
    { material: "Interior Door 30x80", unit: "EA", category: "Doors" },
    { material: "Exterior Door 36x80", unit: "EA", category: "Doors" },
    { material: "Door Trim", unit: "LF", category: "Trim" },
  ],
};

export const SCOPE_NAMES = Object.keys(SCOPE_MATERIALS).sort();

export function materialsForScope(scope) {
  return SCOPE_MATERIALS[scope] || [];
}