// Shared scope systems data for backend functions.
// Condensed version of src/lib/scopeSystems.js — contains system codes, names,
// aliases, specifications, materials, and pricing ranges so backend functions
// (autoTakeoff, autoProposals) can identify and price the correct system type
// from project descriptions and specs.

export const SCOPE_SYSTEMS_DATA: Record<string, any> = {
  "Epoxy Flooring": {
    systems: [
      {
        code: "EF-SOLID", name: "Solid Color Epoxy System",
        aliases: ["solid epoxy", "solid color epoxy", "epoxy coating", "epoxy paint", "two-part epoxy", "2-coat epoxy", "epoxy floor coating", "industrial epoxy"],
        specs: "Primer 7-10 mils + 1 coat pigmented base 10-14 mils + 1 coat topcoat 8-10 mils = 16-24 mils DFT. CSP-2/3 prep.",
        materials: ["Epoxy Primer 250-300 SF/GAL", "Epoxy Base Coat 160-200 SF/GAL", "Epoxy/Urethane Topcoat 250-300 SF/GAL"],
        unit: "SF", price_low: 4.00, price_high: 7.00,
      },
      {
        code: "EF-FLAKE", name: "Flake Epoxy Floor System",
        aliases: ["flake epoxy", "chip epoxy", "decorative flake", "vinyl flake", "color chip", "flake floor", "broadcast flake", "epoxy flake", "flake system"],
        specs: "Primer 8-10 mils + base 12-16 mils + full broadcast vinyl flakes + 2 coats clear topcoat 8-10 mils each = 20-30 mils DFT. CSP-2/3 prep.",
        materials: ["Epoxy Primer 250-300 SF/GAL", "Epoxy Base Coat 125-160 SF/GAL", "Vinyl Flakes 1 LB per 8-10 SF", "Clear Topcoat 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 5.50, price_high: 9.00,
      },
      {
        code: "EF-METALLIC", name: "Metallic Epoxy System",
        aliases: ["metallic epoxy", "metallic floor", "pearlescent epoxy", "3d epoxy", "metallic pigment", "metallic coating"],
        specs: "Primer 8-10 mils + 1-2 coats metallic epoxy 15-20 mils per coat + 1-2 coats clear topcoat 8-10 mils each = 25-40 mils DFT. CSP-2/3 prep, very smooth surface.",
        materials: ["Epoxy Primer 250-300 SF/GAL", "Metallic Epoxy Body 100-160 SF/GAL", "Metallic Pigment 1 per 2-3 GAL", "Clear Topcoat 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 8.00, price_high: 15.00,
      },
      {
        code: "EF-QUARTZ", name: "Quartz Epoxy System",
        aliases: ["quartz epoxy", "quartz floor", "epoxy quartz", "colored quartz", "quartz broadcast", "quartz system"],
        specs: "Primer 8-10 mils + base 12-16 mils + full broadcast colored quartz + 1-2 coats clear sealer 8-10 mils each = 30-40 mils DFT. CSP-2/3 prep.",
        materials: ["Epoxy Primer 250-300 SF/GAL", "Epoxy Base Coat 125-160 SF/GAL", "Colored Quartz 1 LB per 4-6 SF", "Clear Sealer 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 6.00, price_high: 11.00,
      },
      {
        code: "EF-MORTAR", name: "Epoxy Mortar System",
        aliases: ["epoxy mortar", "mortar system", "epoxy slurry", "heavy duty epoxy", "troweled epoxy", "epoxy mortar floor"],
        specs: "Primer 8-10 mils + troweled epoxy mortar 1/8-1/4 inch + grout coat + 1-2 coats topcoat 8-10 mils each = 125-250 mils. CSP-3/4 prep.",
        materials: ["Epoxy Primer 250-300 SF/GAL", "Epoxy Mortar Resin 40-50 SF/GAL at 1/4\"", "Silica Sand", "Epoxy Grout 100-160 SF/GAL", "Topcoat 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 9.00, price_high: 16.00,
      },
      {
        code: "EF-ESD", name: "Anti-Static / ESD Epoxy System",
        aliases: ["anti-static epoxy", "esd epoxy", "conductive epoxy", "static control epoxy", "static dissipative", "esd flooring"],
        specs: "Conductive primer 8-10 mils + copper grounding strips at 20 ft O.C. + 1-2 coats static-dissipative topcoat 8-10 mils each = 16-24 mils DFT. Resistance 10^6-10^9 ohms.",
        materials: ["Conductive Epoxy Primer 200-250 SF/GAL", "Copper Grounding Strip 1 LF per 20 SF", "Static-Dissipative Topcoat 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 7.00, price_high: 12.00,
      },
      {
        code: "EF-CLEAR", name: "Clear Epoxy Sealer System",
        aliases: ["clear epoxy", "epoxy sealer", "clear coat epoxy", "epoxy topcoat", "clear sealer"],
        specs: "1-2 coats clear epoxy 8-10 mils each = 8-20 mils DFT. CSP-2 prep.",
        materials: ["Clear Epoxy Sealer 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 2.50, price_high: 5.00,
      },
      {
        code: "EF-POLY", name: "Polyaspartic Flake System",
        aliases: ["polyaspartic", "polyaspartic flake", "polyaspartic coating", "one day epoxy", "fast cure flake", "polyaspartic floor"],
        specs: "Primer 8-10 mils + base 12-16 mils + full flake broadcast + 1-2 coats clear polyaspartic 8-10 mils each = 20-30 mils DFT. Same-day install, 24hr vehicular cure.",
        materials: ["Polyaspartic Primer 250-300 SF/GAL", "Polyaspartic Base 125-160 SF/GAL", "Vinyl Flakes 1 LB per 8-10 SF", "Clear Polyaspartic Topcoat 250-300 SF/GAL per coat"],
        unit: "SF", price_low: 6.50, price_high: 11.00,
      },
    ],
  },
  "Concrete Polishing": {
    systems: [
      {
        code: "CP-SATIN", name: "Satin Polished Concrete 400 Grit",
        aliases: ["satin polish", "400 grit", "satin concrete", "level 2 polish", "honed polish", "400 grit polish"],
        specs: "Metal bond 30/70/120 + resin bond 100/200/400 grit. Densifier after 200 grit. Level 2, 30-40 degree gloss.",
        materials: ["Densifier 200-300 SF/GAL", "Metal-Bond Diamonds 3000-5000 SF/set", "Resin-Bond Diamonds 2000-3000 SF/set"],
        unit: "SF", price_low: 3.50, price_high: 6.00,
      },
      {
        code: "CP-GLOSS", name: "High Gloss Polished Concrete 800 Grit",
        aliases: ["high gloss", "800 grit", "gloss polish", "level 3 polish", "semi-gloss concrete", "800 grit polish"],
        specs: "Metal bond 30/70/120/220 + resin bond 100/200/400/800 grit. Densifier after 200 and 400 grit. Level 3, 50-60 degree gloss.",
        materials: ["Densifier 200-300 SF/GAL", "Metal-Bond Diamonds 3000-5000 SF/set", "Resin-Bond Diamonds 1500-2500 SF/set"],
        unit: "SF", price_low: 4.50, price_high: 7.50,
      },
      {
        code: "CP-MIRROR", name: "Mirror Finish Polished Concrete 1500+ Grit",
        aliases: ["mirror finish", "1500 grit", "mirror polish", "level 4 polish", "ultra gloss", "1500 grit polish", "3000 grit"],
        specs: "Metal bond 30/70/120/220 + resin bond 100-3000 grit. Densifier after 200/400/800 grit. Burnish with stain guard. Level 4, 70+ degree gloss.",
        materials: ["Densifier 200-300 SF/GAL", "Metal-Bond Diamonds 3000-5000 SF/set", "Resin-Bond Diamonds 1000-2000 SF/set", "Burnishing Pads 2000-3000 SF/set", "Micro-Finish Sealer 500-1000 SF/GAL"],
        unit: "SF", price_low: 6.00, price_high: 10.00,
      },
      {
        code: "CP-STAINED", name: "Stained and Polished Concrete",
        aliases: ["stained polish", "stained concrete", "acid stain", "dye polish", "colored polish", "stained and polished", "integral color polish"],
        specs: "Grind to 200 grit + apply acid stain or dye + neutralize + densifier + polish 400/800 grit + sealer.",
        materials: ["Acid Stain/Dye 200-400 SF/GAL", "Densifier 200-300 SF/GAL", "Resin-Bond Diamonds 1500-2500 SF/set", "Stain Guard Sealer 500-1000 SF/GAL"],
        unit: "SF", price_low: 5.00, price_high: 9.00,
      },
      {
        code: "CP-BURNISH", name: "Burnished Concrete",
        aliases: ["burnished", "burnish", "trowel polish", "trowel finish polish", "power trowel polish", "helix polish"],
        specs: "Power trowel new concrete + densifier during troweling 2-3 applications + burnish with pan heads. No grinding.",
        materials: ["Densifier 200-300 SF/GAL", "Burnishing Pads 3000-5000 SF/set"],
        unit: "SF", price_low: 2.00, price_high: 4.00,
      },
    ],
  },
  "Concrete": {
    systems: [
      {
        code: "CC-SLAB", name: "Poured Concrete Slab",
        aliases: ["concrete slab", "poured concrete", "slab on grade", "concrete pour", "flatwork", "concrete floor", "slab"],
        specs: "Compact subgrade + vapor barrier + wire mesh/rebar + pour 4-6 inch + finish + cure 7 days + saw-cut joints.",
        materials: ["Concrete 3000-4000 PSI 81 SF/CY at 4\"", "Wire Mesh/Rebar", "Vapor Barrier", "Cure Compound 200-300 SF/GAL"],
        unit: "SF", price_low: 6.00, price_high: 12.00,
      },
      {
        code: "CC-STAMPED", name: "Stamped Concrete",
        aliases: ["stamped concrete", "imprinted concrete", "patterned concrete", "decorative concrete", "stamped patio", "stamped driveway"],
        specs: "Pour 4-6 inch + integral color + powder release + stamp mats + saw-cut joints + acrylic sealer after 28 days.",
        materials: ["Concrete 4000 PSI", "Integral Color 1 LB/CY", "Release Agent 1 LB/15-20 SF", "Stamp Mats", "Acrylic Sealer 200-300 SF/GAL"],
        unit: "SF", price_low: 12.00, price_high: 20.00,
      },
      {
        code: "CC-OVERLAY", name: "Concrete Overlay / Micro-Topping",
        aliases: ["concrete overlay", "micro-topping", "skim coat", "resurfacing", "concrete resurfacer", "overlay", "micro finish"],
        specs: "Mechanical prep + bonding primer + trowel/squeegee overlay 1/16-1/4 inch + stain/polish/seal.",
        materials: ["Bonding Primer 200-300 SF/GAL", "Overlay Mix 20-50 SF/40lb bag", "Sealer/Stain 200-300 SF/GAL"],
        unit: "SF", price_low: 4.00, price_high: 9.00,
      },
      {
        code: "CC-REPAIR", name: "Concrete Repair",
        aliases: ["concrete repair", "crack repair", "spall repair", "joint repair", "concrete patch", "concrete restoration"],
        specs: "Route/seal cracks with polyurea/epoxy; remove spalls + repair mortar; re-seal joints with backer rod + sealant.",
        materials: ["Epoxy Injection Resin", "Repair Mortar 0.5-1 CF/bag", "Joint Sealant Polyurea", "Backer Rod"],
        unit: "SF", price_low: 3.00, price_high: 15.00,
      },
    ],
  },
  "Painting": {
    systems: [
      {
        code: "PT-INT-WALL", name: "Interior Wall Paint System",
        aliases: ["interior paint", "wall paint", "latex paint", "interior latex", "wall coating", "drywall paint"],
        specs: "Patch/sand + 1 coat PVA primer + 2 coats interior latex. 3-4 mils DFT per coat.",
        materials: ["Interior Primer 300-400 SF/GAL", "Interior Latex Paint 350-400 SF/GAL per coat"],
        unit: "SF", price_low: 1.50, price_high: 3.50,
      },
      {
        code: "PT-EXT", name: "Exterior Paint System",
        aliases: ["exterior paint", "exterior latex", "exterior coating", "siding paint", "facade paint"],
        specs: "Power wash + scrape + caulk + 1 coat exterior primer + 2 coats exterior latex. 4-5 mils DFT per coat.",
        materials: ["Exterior Primer 300-400 SF/GAL", "Exterior Latex Paint 300-400 SF/GAL per coat", "Caulk"],
        unit: "SF", price_low: 2.00, price_high: 5.00,
      },
      {
        code: "PT-ELAST", name: "Elastomeric Coating System",
        aliases: ["elastomeric", "elastomeric coating", "elastomeric paint", "waterproof coating", "masonry coating"],
        specs: "Power wash + repair cracks + 1 coat masonry primer + 2 coats elastomeric at 10-15 mils WFT per coat = 15-20 mils DFT.",
        materials: ["Masonry Primer 250-350 SF/GAL", "Elastomeric Coating 60-100 SF/GAL per coat"],
        unit: "SF", price_low: 3.00, price_high: 6.00,
      },
      {
        code: "PT-INDUSTRIAL", name: "Industrial Epoxy Paint System",
        aliases: ["epoxy paint", "industrial paint", "epoxy coating", "tank coating", "structural steel paint", "industrial coating"],
        specs: "SSPC-SP6/SP10 blast + 1 coat zinc/epoxy primer 3-4 mils + 1 coat epoxy intermediate 4-6 mils + 1 coat urethane topcoat 2-3 mils = 10-15 mils DFT.",
        materials: ["Epoxy/Zinc Primer 200-300 SF/GAL", "Epoxy Intermediate 150-250 SF/GAL", "Polyurethane Topcoat 250-350 SF/GAL"],
        unit: "SF", price_low: 4.00, price_high: 10.00,
      },
      {
        code: "PT-INTUMESCENT", name: "Intumescent Fireproofing System",
        aliases: ["intumescent", "fireproofing", "fire rated paint", "intumescent paint", "fire protection coating"],
        specs: "SSPC-SP6 blast + 1 coat primer 2-3 mils + multiple coats intumescent 60-250 mils WFT + topcoat. 1-3 hour rating.",
        materials: ["Primer 250-350 SF/GAL", "Intumescent Coating 4-16 SF/GAL per coat", "Topcoat 200-300 SF/GAL"],
        unit: "SF", price_low: 5.00, price_high: 20.00,
      },
    ],
  },
  "Flooring": {
    systems: [
      {
        code: "FL-LVT", name: "Luxury Vinyl Tile LVT/LVP",
        aliases: ["lvt", "lvp", "luxury vinyl", "vinyl plank", "vinyl tile", "luxury vinyl tile", "luxury vinyl plank"],
        specs: "Flat subfloor 3/16\" in 10ft + underlayment/patch + glue-down or floating click-lock + transitions.",
        materials: ["LVT/LVP Flooring 1:1 + 5-10% waste", "Adhesive 150-200 SF/GAL", "Underlayment/Patch", "Transition Strips"],
        unit: "SF", price_low: 4.00, price_high: 9.00,
      },
      {
        code: "FL-CARPET-TILE", name: "Carpet Tile System",
        aliases: ["carpet tile", "carpet squares", "modular carpet", "tile carpet", "commercial carpet tile"],
        specs: "Clean/dry/flat subfloor + pressure-sensitive adhesive + quarter-turn/monolithic/ashlar pattern.",
        materials: ["Carpet Tile 18x18 or 24x24 1:1 + 5% waste", "Pressure-Sensitive Adhesive 150-200 SF/GAL"],
        unit: "SF", price_low: 3.50, price_high: 7.00,
      },
      {
        code: "FL-SHEET-VINYL", name: "Sheet Vinyl Flooring",
        aliases: ["sheet vinyl", "vinyl sheet", "linoleum", "sheet flooring", "vct", "vinyl composition tile"],
        specs: "Smooth subfloor + plywood underlayment if needed + full-spread adhesive + heat-welded seams + floor finish for VCT.",
        materials: ["Sheet Vinyl/VCT 1:1 + 5% waste", "Adhesive 150-200 SF/GAL", "Plywood Underlayment 32 SF/sheet", "Floor Finish 2000-3000 SF/GAL per coat"],
        unit: "SF", price_low: 3.00, price_high: 7.00,
      },
      {
        code: "FL-HARDWOOD", name: "Hardwood Flooring System",
        aliases: ["hardwood", "hardwood floor", "wood floor", "engineered wood", "solid hardwood", "wood flooring"],
        specs: "Flat subfloor 3/16\" in 10ft + moisture test + underlayment + nail-down/glue-down/floating + sand 36/60/80/100 + 3 coats polyurethane.",
        materials: ["Hardwood Flooring 1:1 + 5-10% waste", "Underlayment/Moisture Barrier", "Nails/Adhesive", "Polyurethane 500-600 SF/GAL per coat"],
        unit: "SF", price_low: 8.00, price_high: 18.00,
      },
    ],
  },
  "Tile": {
    systems: [
      {
        code: "TL-PORCELAIN", name: "Porcelain Floor Tile System",
        aliases: ["porcelain tile", "porcelain floor", "floor tile", "porcelain", "rectified tile", "large format tile"],
        specs: "Flat subfloor 1/8\" in 10ft + crack isolation membrane + LFT thinset + sanded/epoxy grout + sealer + expansion joints 24-36ft.",
        materials: ["Porcelain Tile 1:1 + 10-15% waste", "Thinset LFT 75-100 SF/50lb bag", "Grout 100-200 SF/25lb bag", "Crack Membrane", "Grout Sealer 500-1000 SF/GAL"],
        unit: "SF", price_low: 8.00, price_high: 18.00,
      },
      {
        code: "TL-CERAMIC-WALL", name: "Ceramic Wall Tile System",
        aliases: ["ceramic tile", "wall tile", "ceramic wall", "bathroom tile", "shower tile", "backsplash tile"],
        specs: "Clean/flat substrate + cement board/waterproof backer in wet areas + waterproofing membrane + thinset/mastic + unsanded grout + sealer.",
        materials: ["Ceramic Wall Tile 1:1 + 10% waste", "Cement Board 32 SF/4x8", "Waterproofing Membrane 100-150 SF/GAL", "Thinset/Mastic 75-100 SF/50lb bag", "Unsanded Grout 100-200 SF/25lb bag"],
        unit: "SF", price_low: 7.00, price_high: 15.00,
      },
      {
        code: "TL-STONE", name: "Natural Stone Tile System",
        aliases: ["stone tile", "marble tile", "granite tile", "travertine tile", "slate tile", "natural stone"],
        specs: "Very flat subfloor + white thinset + pre-seal stone + unsanded/epoxy grout + final sealer. Honed/polished/tumbled finish.",
        materials: ["Natural Stone Tile 1:1 + 15% waste", "White Thinset 75-100 SF/50lb bag", "Stone Sealer pre-grout 200-400 SF/GAL", "Grout 100-200 SF/25lb bag", "Final Sealer 200-400 SF/GAL"],
        unit: "SF", price_low: 12.00, price_high: 25.00,
      },
    ],
  },
  "Roofing": {
    systems: [
      {
        code: "RF-ARCH", name: "Architectural Shingle Roof",
        aliases: ["architectural shingles", "dimensional shingles", "laminated shingles", "asphalt shingles", "composition shingles"],
        specs: "Remove old roof + repair deck + drip edge + synthetic/30lb felt underlayment + ice & water shield + architectural shingles + step/valley flashing + ridge vent.",
        materials: ["Architectural Shingles 100 SF/square", "Synthetic Underlayment 100 SF/roll", "Ice & Water Shield 100 SF/roll", "Drip Edge 10 LF/piece", "Roofing Nails", "Ridge Vent"],
        unit: "SF", price_low: 4.00, price_high: 8.00,
      },
      {
        code: "RF-TPO", name: "TPO Roofing System",
        aliases: ["tpo", "thermoplastic polyolefin", "tpo membrane", "single ply tpo", "white membrane roof"],
        specs: "Cover board + polyiso insulation + 60/80-mil TPO membrane mech-attached/adhered + heat-welded seams 1.5\" overlap + TPO flashings. 15-30 yr warranty.",
        materials: ["TPO Membrane 60/80 mil 1:1 + 10% waste", "Polyiso Insulation 1:1", "Cover Board 1:1", "Fasteners & Plates 1 per 2-3 SF", "TPO Flashing Accessories"],
        unit: "SF", price_low: 5.00, price_high: 10.00,
      },
      {
        code: "RF-METAL", name: "Standing Seam Metal Roof",
        aliases: ["standing seam", "metal roof", "metal roofing", "standing seam metal", "steel roof", "metal panels"],
        specs: "Solid deck/skip sheathing + high-temp underlayment + 24ga standing seam panels with sliding clips + pre-formed metal flashing.",
        materials: ["Standing Seam Panels 24ga 1:1 + 5% waste", "High-Temp Underlayment 100 SF/roll", "Panel Clips 1 per 2-3 SF", "Metal Flashing Kit"],
        unit: "SF", price_low: 8.00, price_high: 16.00,
      },
    ],
  },
  "Drywall": {
    systems: [
      {
        code: "DW-STANDARD", name: "Standard Drywall System",
        aliases: ["drywall", "sheetrock", "gypsum board", "wallboard", "standard drywall", "1/2 drywall"],
        specs: "Metal/wood framing 16/24\" O.C. + 1/2\" or 5/8\" board + screws 12\" O.C. walls/8\" ceilings + 3 coats joint compound + Level 4 finish + corner bead.",
        materials: ["Drywall 1/2\" 4x8 32 SF/sheet", "Drywall 5/8\" 4x8 32 SF/sheet", "Metal Stud 2-1/2\" 25GA", "Joint Compound 5 GAL/400-500 SF", "Paper Tape 500 LF/roll", "Corner Bead", "Screws 1-1/4\""],
        unit: "SF", price_low: 2.50, price_high: 5.00,
      },
      {
        code: "DW-FIRE", name: "Fire-Rated Drywall System Type X",
        aliases: ["type x", "fire rated drywall", "firecode", "5/8 type x", "fire resistant drywall", "fire rated wall"],
        specs: "Per UL assembly + 5/8\" Type X for 1-hr / double 5/8\" Type X for 2-hr + fire-rated compound + stagger joints + 3 coats min.",
        materials: ["Type X Drywall 5/8\" 4x8 32 SF/sheet", "Fire-Rated Joint Compound 5 GAL/400 SF", "Paper Tape", "Screws 1-5/8\""],
        unit: "SF", price_low: 3.50, price_high: 7.00,
      },
      {
        code: "DW-MOISTURE", name: "Moisture-Resistant Drywall Green Board",
        aliases: ["green board", "moisture resistant drywall", "greenboard", "bathroom drywall", "wet area drywall"],
        specs: "Standard framing + 1/2\" or 5/8\" green board + cement board in tub/shower + corrosion-resistant screws + Level 4 + moisture-resistant paint.",
        materials: ["Green Board 1/2\" 4x8 32 SF/sheet", "Cement Board 1/2\" 3x5 15 SF/sheet", "Joint Compound 5 GAL/400-500 SF", "Paper Tape"],
        unit: "SF", price_low: 3.00, price_high: 6.00,
      },
    ],
  },
  "Insulation": {
    systems: [
      {
        code: "IN-BATT", name: "Fiberglass Batt Insulation",
        aliases: ["fiberglass batt", "batt insulation", "roll insulation", "fiberglass roll", "batt", "pink insulation", "faced batt"],
        specs: "Friction-fit between studs/joists + faced batts vapor barrier toward conditioned space + R-13/R-19/R-30/R-38+ + seal gaps with foam.",
        materials: ["Fiberglass Batt R-13/R-19/R-30", "Spray Foam gap sealing"],
        unit: "SF", price_low: 1.00, price_high: 2.50,
      },
      {
        code: "IN-SPRAY-OPEN", name: "Open-Cell Spray Foam",
        aliases: ["open cell spray foam", "open cell foam", "spray foam open", "half pound foam", "oc spray foam"],
        specs: "Spray into cavities, expands 100x, trim flush. R-3.6-4.0/inch. Air barrier at 3.5\". Vapor permeable.",
        materials: ["Open-Cell Spray Foam Kit 600-1200 BF"],
        unit: "SF", price_low: 2.00, price_high: 4.00,
      },
      {
        code: "IN-SPRAY-CLOSED", name: "Closed-Cell Spray Foam",
        aliases: ["closed cell spray foam", "closed cell foam", "spray foam closed", "two pound foam", "cc spray foam", "closed cell"],
        specs: "Spray into cavities, expands 30-50x, trim flush. R-6-7/inch. Vapor barrier at 2\". Air barrier at 1\". Adds structural strength.",
        materials: ["Closed-Cell Spray Foam Kit 200-600 BF"],
        unit: "SF", price_low: 3.50, price_high: 7.00,
      },
    ],
  },
  "Masonry": {
    systems: [
      {
        code: "MA-BRICK", name: "Brick Veneer System",
        aliases: ["brick veneer", "brick wall", "brick masonry", "brick facade", "brick siding", "brick"],
        specs: "Stud framing + sheathing + WRB + 1\" air space + Type N/S mortar + veneer ties 24\" O.C. + through-wall flashing + weep holes 24\" O.C. + steel lintels + expansion joints 25ft O.C.",
        materials: ["Modular Brick 6.75/SF", "Mortar Type N/S 35-40 SF/80lb bag", "Veneer Ties 1 per 2.67 SF", "Flashing & Weep Vents", "Steel Lintels"],
        unit: "SF", price_low: 15.00, price_high: 30.00,
      },
      {
        code: "MA-CMU", name: "CMU Block Wall System",
        aliases: ["cmu", "concrete block", "cinder block", "block wall", "concrete masonry unit", "block masonry"],
        specs: "Reinforced footing + 8x8x16 or 12x8x16 CMU + Type S mortar + vertical rebar 24-48\" O.C. + joint reinforcement 16\" O.C. + grout fill cells.",
        materials: ["CMU 8x8x16 1.125/SF", "Mortar Type S 35-40 SF/80lb bag", "Rebar #4/#5", "Grout Fill 0.0025 CY/SF per cell", "Joint Reinforcement 1 per 16\" vertical"],
        unit: "SF", price_low: 12.00, price_high: 25.00,
      },
      {
        code: "MA-STONE", name: "Stone Veneer System",
        aliases: ["stone veneer", "stone wall", "stone facade", "manufactured stone", "cultured stone", "stone siding"],
        specs: "Framed wall + 2 layers WRB + galvanized metal lath + Type S scratch coat + mortar-set stone veneer + point joints + through-wall flashing.",
        materials: ["Stone Veneer 1:1 + 10% waste", "Metal Lath 1:1", "Mortar Type S 30-35 SF/80lb bag", "WRB 2 layers 1:1 x 2"],
        unit: "SF", price_low: 15.00, price_high: 35.00,
      },
    ],
  },
  "Carpentry": {
    systems: [
      {
        code: "CR-ROUGH", name: "Rough Carpentry / Framing",
        aliases: ["rough carpentry", "framing", "wood framing", "rough framing", "stick framing", "carpentry framing"],
        specs: "Treated sill + double top plate + 2x4/2x6 studs 16/24\" O.C. + I-joists/dimensional joists + OSB sheathing 7/16\" + OSB subfloor 3/4\" + LVL headers + bracing.",
        materials: ["2x4/2x6 Lumber", "I-Joists/Dimensional Joists", "OSB Sheathing 7/16\" 32 SF/4x8", "OSB Subfloor 3/4\" 32 SF/4x8", "Framing Nails"],
        unit: "SF", price_low: 5.00, price_high: 12.00,
      },
      {
        code: "CR-FINISH", name: "Finish Carpentry / Trim",
        aliases: ["finish carpentry", "trim", "trim work", "baseboard", "casing", "crown molding", "finish work"],
        specs: "Baseboard + casing + crown molding. MDF/pine/poplar, pre-primed or stain-grade. Cope inside corners, nail with finish nails, fill holes, caulk gaps.",
        materials: ["Baseboard 1:1 + 10% waste", "Door/Window Casing 1:1 + 10% waste", "Crown Molding 1:1 + 15% waste", "Finish Nails", "Caulk"],
        unit: "LF", price_low: 2.50, price_high: 8.00,
      },
    ],
  },
  "Demolition": {
    systems: [
      {
        code: "DM-INTERIOR", name: "Interior Demolition",
        aliases: ["interior demolition", "interior demo", "gut demolition", "strip out", "interior gut", "demo"],
        specs: "Remove drywall/flooring/ceilings/cabinets/fixtures/non-structural partitions + protect adjacent areas + dust barriers + cap utilities + dumpster disposal.",
        materials: ["Dumpster Rental 30yd", "Dust Barrier/Zip Wall", "PPE"],
        unit: "SF", price_low: 2.00, price_high: 6.00,
      },
      {
        code: "DM-SELECTIVE", name: "Selective Demolition",
        aliases: ["selective demolition", "selective demo", "partial demolition", "targeted demolition"],
        specs: "Remove specific walls/openings/elements per plan + protect adjacent surfaces + verify load paths/shore if structural + locate/protect utilities + patch repairs.",
        materials: ["Dumpster Rental", "Dust Barriers", "Temporary Shoring if needed"],
        unit: "SF", price_low: 3.00, price_high: 8.00,
      },
    ],
  },
  "Windows & Doors": {
    systems: [
      {
        code: "WD-VINYL-WIN", name: "Vinyl Window System",
        aliases: ["vinyl window", "vinyl windows", "replacement window", "vinyl replacement", "double hung vinyl", "vinyl window installation"],
        specs: "Measure RO + level/plumb + shims + sill pan flashing + flashing tape perimeter AAMA 2400 + low-expansion foam + sealant + interior casing/exterior trim.",
        materials: ["Vinyl Window 1 per opening", "Flashing Tape perimeter+sill", "Low-Expansion Foam 1 can/2-3 windows", "Sealant", "Interior Casing"],
        unit: "EA", price_low: 350.00, price_high: 800.00,
      },
      {
        code: "WD-COMM-STOREFRONT", name: "Commercial Storefront System",
        aliases: ["storefront", "commercial storefront", "aluminum storefront", "curtain wall", "commercial glazing", "aluminum window wall"],
        specs: "Thermally broken aluminum framing + 1\" IGU tempered/laminated + anchor to slab/header + seal joints + weep holes + matching aluminum doors with closer/hardware.",
        materials: ["Aluminum Storefront Framing perimeter+mullions", "IGU 1\" 1:1", "Aluminum Entrance Door 1 per opening", "Door Hardware Set", "Sealant"],
        unit: "SF", price_low: 35.00, price_high: 75.00,
      },
      {
        code: "WD-HOLLOW-METAL", name: "Hollow Metal Door System",
        aliases: ["hollow metal door", "steel door", "commercial door", "metal door", "fire rated door", "hm door"],
        specs: "16/18 gauge hollow metal door + knock-down/welded frame + grout fill if required + hinges/lock/closer/panic hardware + anchor frame plumb/square. 20min-3hr fire rated.",
        materials: ["Hollow Metal Door 1 per opening", "Hollow Metal Frame 1 per opening", "Door Hardware Set", "Grout if required"],
        unit: "EA", price_low: 600.00, price_high: 1500.00,
      },
    ],
  },
  "Electrical": {
    systems: [
      {
        code: "EL-ROUGH", name: "Electrical Rough-In",
        aliases: ["electrical rough", "rough in", "wire rough", "electrical rough in", "rough-in electrical", "wiring"],
        specs: "Romex/MC cable or conduit + device boxes + dedicated circuits for kitchen/laundry/HVAC + GFCI/AFCI per code + load center with breakers + grounding.",
        materials: ["Romex 12/2 or 14/2 250ft roll", "Device Boxes 1 per device", "Breakers 15A/20A/GFCI/AFCI 1 per circuit", "Panel/Load Center 1 per system"],
        unit: "EA", price_low: 80.00, price_high: 200.00,
      },
      {
        code: "EL-DEVICES", name: "Device Installation",
        aliases: ["device installation", "outlets", "switches", "receptacles", "device trim", "finish electrical"],
        specs: "15A/20A receptacles TR + GFCI in wet areas + single-pole/3-way/4-way/dimmer switches + nylon/metal cover plates + lighting fixtures.",
        materials: ["Receptacle 15A/20A TR 1 per location", "Switch SP/3-way/dimmer 1 per location", "Cover Plates 1 per device", "Lighting Fixtures 1 per location"],
        unit: "EA", price_low: 25.00, price_high: 75.00,
      },
    ],
  },
  "Plumbing": {
    systems: [
      {
        code: "PL-DWV", name: "Drain-Waste-Vent DWV System",
        aliases: ["dwv", "drain waste vent", "drain lines", "waste lines", "vent lines", "sewer lines", "drainage"],
        specs: "PVC/ABS/cast iron pipe + 1-1/2\" min fixtures / 3-4\" main stack per IPC/UPC + slope 1/4\" per ft for 2\" and smaller / 1/8\" for 3\"+ + vent through roof + solvent weld/no-hub + water/air test.",
        materials: ["PVC DWV Pipe 1-1/2\" to 4\"", "PVC Fittings", "PVC Cement & Primer", "Cleanouts 1 per 100 LF"],
        unit: "LF", price_low: 8.00, price_high: 20.00,
      },
      {
        code: "PL-WATER", name: "Water Supply System",
        aliases: ["water supply", "water lines", "supply lines", "domestic water", "hot water lines", "cold water lines", "pex", "copper water"],
        specs: "PEX/copper Type L/CPVC + 3/4\" main / 1/2\" branches per IPC/UPC + test 1.5x working pressure + insulate hot lines + shut-off valves at each fixture.",
        materials: ["PEX Tubing 1/2\" and 3/4\" 100 LF/coil", "PEX Fittings", "Shut-off Valves 1 per fixture", "Pipe Insulation 1:1 on hot lines"],
        unit: "LF", price_low: 6.00, price_high: 15.00,
      },
      {
        code: "PL-FIXTURES", name: "Plumbing Fixture Installation",
        aliases: ["fixture installation", "toilet installation", "sink installation", "faucet", "plumbing fixtures", "fixture trim"],
        specs: "Set toilet on wax ring/bolt to flange/caulk base + mount sink/install faucet/drain/connect supply+waste + install shower valve/trim + test for leaks.",
        materials: ["Toilet 1 per bathroom", "Sink/Lavatory 1 per location", "Faucet 1 per sink", "Shower Valve & Trim 1 per shower", "Wax Ring & Supply Lines 1 per toilet"],
        unit: "EA", price_low: 150.00, price_high: 500.00,
      },
    ],
  },
};

// Flatten all systems for searching
export const ALL_SYSTEMS_DATA: any[] = Object.entries(SCOPE_SYSTEMS_DATA).flatMap(([scope, data]) =>
  (data as any).systems.map((sys: any) => ({ ...sys, scope }))
);

// Identify which system(s) match a given text
export function identifySystemsFromText(text: string): any[] {
  if (!text || typeof text !== "string") return [];
  const lowerText = text.toLowerCase();
  const results: any[] = [];

  for (const sys of ALL_SYSTEMS_DATA) {
    const matchedAliases = (sys.aliases || []).filter((alias: string) =>
      lowerText.includes(alias.toLowerCase())
    );
    if (matchedAliases.length > 0) {
      const confidence = Math.min(1, 0.5 + matchedAliases.length * 0.2);
      results.push({ system: sys, scope: sys.scope, confidence, matchedAliases });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

// Build a condensed reference string for LLM prompts
export function buildSystemsReferenceForPrompt(trade?: string): string {
  const scopes = trade ? Object.entries(SCOPE_SYSTEMS_DATA).filter(([scope]) => {
    const tradeLower = trade.toLowerCase();
    const scopeLower = scope.toLowerCase();
    return tradeLower.includes(scopeLower) || scopeLower.includes(tradeLower) ||
           tradeLower.includes("epoxy") && scope === "Epoxy Flooring" ||
           tradeLower.includes("polish") && scope === "Concrete Polishing" ||
           tradeLower.includes("concrete") && (scope === "Concrete" || scope === "Concrete Polishing");
  }) : Object.entries(SCOPE_SYSTEMS_DATA);

  return scopes.map(([scope, data]) => {
    const systems = (data as any).systems.map((s: any) =>
      `${s.code} ${s.name} [${s.aliases.join(", ")}] - ${s.specs} - $${s.price_low}-${s.price_high}/${s.unit}`
    ).join("\n  ");
    return `${scope}:\n  ${systems}`;
  }).join("\n");
}