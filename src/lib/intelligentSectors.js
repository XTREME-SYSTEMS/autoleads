import { base44 } from "@/api/base44Client";

export async function generateIntelligentSectors(trades, companyInfo) {
  const tradeStr = (trades || []).join(", ") || "general construction";
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction industry expert. A contractor specializes in: ${tradeStr}.
${companyInfo?.name ? `Company name: ${companyInfo.name}.` : ""}
${companyInfo?.website ? `Website: ${companyInfo.website}.` : ""}

Search the web to understand this trade/industry and the company's actual work. Then create a comprehensive image database structure for showcasing their projects.

Return a JSON object with "categories" - an array of category objects, each with:
- "category": the category name (e.g., "Polished Concrete", "Epoxy Flooring", "Exterior Surfaces")
- "sectors": an array of sector objects, each with:
  - "key": a unique identifier in snake_case (e.g., "stained_concrete")
  - "label": a human-readable label (e.g., "Stained Concrete")
  - "prompt": a detailed description for AI image generation (e.g., "stained concrete flooring with rich vibrant color and natural variation in a commercial space")

Create 3-5 categories with 2-5 sectors each, covering all the main types of work this trade does. Make the prompts detailed and specific enough to generate ultra-realistic professional photographs.

Return ONLY the JSON object.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                sectors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      label: { type: "string" },
                      prompt: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (res?.categories && res.categories.length > 0) return res.categories;
  } catch {}
  return null;
}

export async function scrapeCompanyIntelligence(companyInfo, trades) {
  const tradeStr = (trades || []).join(", ") || "general construction";
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Search the web for "${companyInfo?.name || "this construction company"}" which specializes in ${tradeStr}.
${companyInfo?.website ? `Their website is ${companyInfo.website}.` : ""}

Research their actual work, projects, style, and visual identity. Return a JSON object with:
- "company_style": a description of their visual style and brand aesthetic
- "project_types": the main types of projects they do
- "visual_features": key visual features of their work (materials, finishes, colors, settings)
- "image_prompt_enhancer": additional details to add to AI image generation prompts to make images match their actual work
- "recommended_colors": an array of 2 color hex codes that match their brand (primary and secondary)`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          company_style: { type: "string" },
          project_types: { type: "string" },
          visual_features: { type: "string" },
          image_prompt_enhancer: { type: "string" },
          recommended_colors: { type: "array", items: { type: "string" } },
        },
      },
    });
    return res;
  } catch {}
  return null;
}