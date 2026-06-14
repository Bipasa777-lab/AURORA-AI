import { Router } from "express";
import { CheckDrugSafetyQueryParams, SearchClinicalTrialsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

// Endpoint for FDA drug warnings, side effects, and recalls
router.get("/research/drug-safety", requireAuth, async (req, res): Promise<void> => {
  const params = CheckDrugSafetyQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { drug } = params.data;
  console.log(`Checking drug safety for: ${drug}`);

  try {
    // 1. Fetch drug label info
    const labelUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drug)}"+OR+openfda.generic_name:"${encodeURIComponent(drug)}"&limit=1`;
    let labelData: any = null;
    try {
      const labelRes = await fetch(labelUrl);
      if (labelRes.ok) {
        labelData = await labelRes.json();
      }
    } catch (err) {
      console.error("Failed to fetch label from openFDA:", err);
    }

    // 2. Fetch drug recall enforcement records
    const recallUrl = `https://api.fda.gov/drug/enforcement.json?search=product_description:"${encodeURIComponent(drug)}"+OR+product_description:"${encodeURIComponent(drug.toLowerCase())}"&limit=3`;
    let recallData: any = null;
    try {
      const recallRes = await fetch(recallUrl);
      if (recallRes.ok) {
        recallData = await recallRes.json();
      }
    } catch (err) {
      console.error("Failed to fetch recalls from openFDA:", err);
    }

    const labelResult = labelData?.results?.[0];
    const brandName = labelResult?.openfda?.brand_name?.[0] || drug;
    const genericName = labelResult?.openfda?.generic_name?.[0] || drug;
    const manufacturer = labelResult?.openfda?.manufacturer_name?.[0] || "Unknown Manufacturer";
    
    // Safely extract warnings, side effects, and indications
    const warnings = labelResult?.warnings?.join("\n") || 
                     labelResult?.warnings_and_cautions?.join("\n") || 
                     "No standard warnings found in database.";
                     
    const sideEffects = labelResult?.adverse_reactions?.join("\n") || 
                        "No adverse reactions documentation found.";
                        
    const indications = labelResult?.indications_and_usage?.join("\n") || 
                        "No indications documentation found.";

    const recalls = (recallData?.results || []).map((r: any) => ({
      recallNumber: r.recall_number || "Unknown",
      reasonForRecall: r.reason_for_recall || "No reason specified",
      status: r.status || "Unknown",
      reportDate: r.report_date ? `${r.report_date.substring(0, 4)}-${r.report_date.substring(4, 6)}-${r.report_date.substring(6, 8)}` : "Unknown",
    }));

    res.json({
      brandName,
      genericName,
      manufacturer,
      warnings,
      sideEffects,
      indications,
      recalls,
    });
  } catch (error: any) {
    console.error("Error in drug safety lookup:", error);
    res.status(500).json({ error: "Internal drug research failure" });
  }
});

// Endpoint for ClinicalTrials.gov search
router.get("/research/clinical-trials", requireAuth, async (req, res): Promise<void> => {
  const params = SearchClinicalTrialsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { condition } = params.data;
  console.log(`Searching clinical trials for: ${condition}`);

  try {
    const trialsUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=5`;
    const response = await fetch(trialsUrl);
    
    if (!response.ok) {
      res.json([]);
      return;
    }

    const data = (await response.json()) as any;
    const trials = (data?.studies || []).map((s: any) => {
      const proto = s.protocolSection;
      return {
        nctId: proto?.identificationModule?.nctId || "Unknown NCT ID",
        title: proto?.identificationModule?.officialTitle || proto?.identificationModule?.briefTitle || "Untitled Study",
        status: proto?.statusModule?.overallStatus || "Unknown Status",
        conditions: proto?.conditionsModule?.conditions || [],
        sponsor: proto?.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown Sponsor",
        phases: proto?.designModule?.phases || ["N/A"],
      };
    });

    res.json(trials);
  } catch (error: any) {
    console.error("Error in clinical trials search:", error);
    res.status(500).json({ error: "Internal clinical trials search failure" });
  }
});

export default router;
