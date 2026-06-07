# Data Analyzer Architecture - V2

## Overview
The Data Analyzer is the core engine of the EnviroConsult platform. It processes environmental lab data, evaluates it against legal limits across multiple jurisdictions, and outputs compliance status. The V2 update introduces a dynamic matrix math engine and a deterministic Local Knowledge Base (DKB).

## Core Systems

### 1. The React Frontend (UI)
The frontend operates on a robust interactive registry system mapping Global Jurisdictions (USA, UK, Canada, Australia, EU) to their specific Regional Agencies (e.g., California Waterboards, Texas TCEQ, UK Environment Agency).
*   Users select the **Country**, **Region**, and **Analysis Type** (Emissions, Water Quality, Soil).
*   The UI dynamically generates Toggleable Badges that inject the correct target domains (`[waterboards.ca.gov]`, `[epa.gov]`) into the backend search query.

### 2. The Universal Matrix Engine (Python)
The backend mathematical engine evaluates raw data against limits based on the Analysis Type.
*   **Water Quality:** Evaluates against Maximum Contaminant Levels (`MCL`) and handles volumetric unit conversions (e.g., `mg/L`, `ug/L`, `cfu/100ml`).
*   **Soil Sampling:** Evaluates against Regional Screening Levels (`RSL`) and handles mass-based unit conversions (`mg/kg`).
*   **Air Emissions / Asbestos:** Evaluates against Permissible Exposure Limits (`PEL` / `NAAQS`) and parses particulate metrics (`f/cc`, `ppm`, `ppb`).

### 3. Domain Knowledge Base (DKB)
The DKB is a hybrid caching layer (`local_knowledge_base.json`) designed to eliminate external search dependency and enforce deterministic results.
*   **Execution Flow:** When an analyte is queried, the `ExpertSystem` first scans the DKB. If a limit exists for that exact Jurisdiction and Analysis Type, it instantly loads the value and citation.
*   **Fallback:** If the data is missing, the system utilizes the `ScraperService` to search the target domains, extracts the legal limit using NLP scoring, and permanently saves the result to the DKB for future identical queries.
