import json
import logging
import re
import os
from pathlib import Path
from datetime import datetime, timezone

from app.services.synonyms import resolve_analyte
from app.services.unit_converter import convert_unit

logger = logging.getLogger("envirohubpro")

DATA_DIR = Path(__file__).parent.parent / "data"

class ExpertSystem:
    def __init__(self) -> None:
        self.dkb_path = DATA_DIR / "local_knowledge_base.json"
        
    def load_dkb(self) -> dict:
        if self.dkb_path.exists():
            with open(self.dkb_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
        
    def save_dkb(self, data: dict) -> None:
        with open(self.dkb_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def extract_limit_from_text(self, text: str, analyte: str, analysis_type: str = "general") -> dict | None:
        text_lower = text.lower()
        
        # 1. Reject Context Failures 
        reject_words = ["measured", "observed concentration", "sample was", "baseline value"]
        if any(rw in text_lower for rw in reject_words):
            return None

        # 2. Extract Values with support for commas (e.g. 5,000) and verbose units
        pattern = r"((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(ppm|ppb|mg/L|ug/L|mg/kg|ug/kg|ug/m3|mg/Nm3|f/cc|ug/dL|mg/cm2|pCi/L|cfu/100ml|parts per million|micrograms per cubic meter)"
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        
        if not matches:
            return None
            
        # Target keywords based on analysis type for distance scoring
        generic_keywords = ["limit", "standard", "maximum", "permissible"]
        specific_keywords = []
        if analysis_type == "water":
            specific_keywords = ["mcl", "smcl", "effluent", "water", "drinking"]
        elif analysis_type == "soil":
            specific_keywords = ["rsl", "ssl", "screening", "soil", "sediment"]
        elif analysis_type == "emissions":
            specific_keywords = ["pel", "twa", "stel", "emission", "stack", "exhaust", "source"]
        elif analysis_type == "air":
            specific_keywords = ["naaqs", "ambient", "indoor", "air", "pel", "twa"]
        elif analysis_type == "asbestos":
            specific_keywords = ["pel", "clearance", "abatement", "lead", "f/cc", "ug/dl", "mg/cm2"]
            
        keyword_positions = []
        for kw in specific_keywords:
            for m in re.finditer(r'\b' + re.escape(kw) + r'\b', text_lower):
                keyword_positions.append(m.start())
                
        if not keyword_positions:
            for kw in generic_keywords:
                for m in re.finditer(r'\b' + re.escape(kw) + r'\b', text_lower):
                    keyword_positions.append(m.start())
                
        best_match = matches[0]
        if keyword_positions:
            best_dist = float('inf')
            for match in matches:
                match_pos = match.start()
                min_dist = min(abs(match_pos - kp) for kp in keyword_positions)
                if min_dist < best_dist:
                    best_dist = min_dist
                    best_match = match
        
        limit_type = "Standard Limit"
        if "twa" in text_lower or "8-hour" in text_lower: limit_type = "TWA"
        elif "pel" in text_lower: limit_type = "PEL"
        elif "mcl" in text_lower: limit_type = "MCL"
        elif "rsl" in text_lower: limit_type = "RSL"
        elif "naaqs" in text_lower: limit_type = "NAAQS"
        
        val_str = best_match.group(1).replace(',', '')
        return {
            "limit": float(val_str),
            "unit": best_match.group(2).lower(),
            "type": limit_type
        }

    def generate_recommendations(self, insights_list: list[dict], analysis_type: str = "emissions") -> list[dict]:
        recommendations = []
        
        severe_incidents = {} # map analyte -> list of sample_ids
        missing_analytes = set()
        unit_mismatches = set()
        
        for ins in insights_list:
            if ins.get("status") in ["severe", "critical"]:
                analyte = ins.get("analyte")
                sample_id = ins.get("sample_id", "Unknown")
                if analyte not in severe_incidents:
                    severe_incidents[analyte] = []
                severe_incidents[analyte].append(sample_id)
                
            if ins.get("status") == "warning" and "Unable to find" in ins.get("insight", ""):
                missing_analytes.add(ins.get("analyte"))
            if ins.get("dq_note"):
                unit_mismatches.add(ins.get("dq_note"))
                
        if severe_incidents:
            for analyte, samples in severe_incidents.items():
                samples_str = ", ".join(samples)
                
                # Deterministic rule-based contextual actions
                if analysis_type == "water":
                    action_text = f"Immediate Action Required ({samples_str}): The {analyte} levels significantly exceed permitted regulatory operations. Immediately halt effluent discharge. Isolate the outfall and inspect wastewater treatment systems."
                elif analysis_type == "soil":
                    action_text = f"Immediate Action Required ({samples_str}): The {analyte} levels significantly exceed permitted regulatory operations. Restrict access to the contaminated zone. Implement runoff control and prepare for immediate soil remediation assessment."
                else:
                    action_text = f"Immediate Shutdown/Maintenance ({samples_str}): The {analyte} levels significantly exceed permitted regulatory operations. Conduct an immediate lockout/tagout (LOTO) of the affected zones. Inspect filtration/scrubber integrity and combustion efficiency before restarting."
                    
                recommendations.append({
                    "type": "Critical Risk",
                    "text": action_text
                })
            
            # Add general reporting recommendation if there are severe incidents
            recommendations.append({
                "type": "Mandatory Reporting",
                "text": "Internal: Notify the Facility Manager and EHS Officer of the above incidents. External: Evaluate if these exceedances trigger local agency reporting requirements (e.g., Title V permit deviation clauses)."
            })
            
        for note in unit_mismatches:
            recommendations.append({
                "type": "Data Protocol",
                "text": note
            })
            
        if missing_analytes:
            recommendations.append({
                "type": "Corrective Data Protocol",
                "text": f"The following samples may be miscategorized or outside the scope of the target domain regulations: {', '.join(missing_analytes)}. Verify EPA/OSHA domain spelling."
            })
            
        if not recommendations:
            recommendations.append({
                "type": "Safe",
                "text": "All analyzed parameters are within regulatory compliance based on extracted regulatory documents."
            })
            
        return recommendations

    def analyze_dataset_stream(self, data_records: list[dict], scraped_citations: list[dict], analysis_type: str = "emissions", custom_domains: list[str] | None = None, custom_documents: dict[str, str] | None = None):
        from app.services.scraper_service import scraper_service
        total_records = len(data_records)
        parameters = set()
        
        for r in data_records:
            analyte_key = next((k for k in r.keys() if 'analyte' in k.lower()), None)
            if analyte_key and str(r[analyte_key]).strip():
                parameters.add(str(r[analyte_key]).strip())
                
        yield json.dumps({
            "packet_type": "summary",
            "total_records": total_records,
            "parameters": list(parameters),
            "data_quality_notes": []
        })
        
        insights_list = []
        dkb = self.load_dkb()
        
        if custom_domains and data_records:
            citation_cache = {}

            for row in data_records:
                sample_id_key = next((k for k in row.keys() if 'sample' in k.lower() or 'id' in k.lower()), None)
                sample_id = str(row[sample_id_key]).strip() if sample_id_key else "UNKNOWN"
                
                analyte_syns = ['analyte', 'parameter', 'chemical', 'pollutant', 'constituent', 'substance', 'indicator']
                analyte_key = next((k for k in row.keys() if any(syn in k.lower() for syn in analyte_syns)), None)
                if not analyte_key: continue
                analyte_raw = str(row[analyte_key]).strip()
                if not analyte_raw: continue
                
                analyte = resolve_analyte(analyte_raw)
                
                value_syns = ['result', 'value', 'concentration', 'level', 'amount', 'reading']
                value_key = next((k for k in row.keys() if any(syn in k.lower() for syn in value_syns) and 'unit' not in k.lower()), None)
                try: csv_value = float(row[value_key]) if value_key else 0.0
                except (ValueError, TypeError): csv_value = 0.0
                
                unit_syns = ['unit', 'uom', 'measure']
                unit_key = next((k for k in row.keys() if any(syn in k.lower() for syn in unit_syns)), None)
                csv_unit = str(row[unit_key]).strip().lower() if unit_key else ""
                
                sorted_domains = '-'.join(sorted([d.strip().lower() for d in custom_domains]))
                dkb_key = f"{analyte}_{analysis_type}_{sorted_domains}"
                
                parsed_limit = None
                exact_context = ""
                url = ""
                
                # 1. CHECK LOCAL KNOWLEDGE BASE FIRST (100% Deterministic)
                if dkb_key in dkb:
                    cached = dkb[dkb_key]
                    # Check expiration (90 days)
                    timestamp_str = cached.get('timestamp')
                    expired = False
                    if timestamp_str:
                        try:
                            saved_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                            if (datetime.now(timezone.utc) - saved_time).days > 90:
                                expired = True
                        except Exception:
                            expired = True
                    else:
                        expired = True
                        
                    if not expired:
                        parsed_limit = cached
                        exact_context = parsed_limit.get('excerpt', '')
                        url = parsed_limit.get('url', 'DKB Anchored Limit')
                
                # 2. IF NOT IN DKB, DO LIVE SEARCH
                if not parsed_limit:
                    if analyte not in citation_cache:
                        domain_filters = " OR ".join([f"site:{d.strip()}" for d in custom_domains])
                        
                        type_keywords = {
                            "emissions": '"limit" OR "standard" OR "ppm" OR "mg/m3" OR "pel" OR "twa" OR "naaqs"',
                            "water": '"limit" OR "mcl" OR "smcl" OR "mg/l" OR "ug/l" OR "maximum contaminant"',
                            "soil": '"limit" OR "rsl" OR "ssl" OR "mg/kg" OR "screening level"',
                            "air": '"limit" OR "naaqs" OR "ug/m3" OR "ppm" OR "standard"',
                            "asbestos": '"limit" OR "pel" OR "f/cc" OR "ug/dl" OR "mg/cm2"',
                            "general": '"limit" OR "standard" OR "regulatory"'
                        }
                        keyword_str = type_keywords.get(analysis_type, type_keywords["general"])
                        search_query = f'"{analyte}" ({keyword_str}) ({domain_filters})'
                        
                        hits = scraper_service._native_search(search_query, max_results=3)
                        
                        urls_to_fetch = [h['href'] for h in hits if h.get('href')]
                        docs = scraper_service.fetch_custom_documents(urls_to_fetch)
                        citation_cache[analyte] = docs
                    
                    docs = citation_cache[analyte]
                    
                    for live_url, markdown in docs.items():
                        paragraphs = markdown.split('\n\n')
                        scored_paras = []
                        search_keywords = f"{analyte} {analyte_raw}"
                        
                        for p in paragraphs:
                            clean_para = scraper_service._clean_text(p)
                            if len(clean_para) < 20: continue
                            score = scraper_service._score_paragraph(clean_para, search_keywords, analysis_type)
                            if score > 0:
                                scored_paras.append((score, p))
                                
                        if scored_paras:
                            scored_paras.sort(key=lambda x: x[0], reverse=True)
                            top_paras = [p[1] for p in scored_paras]
                            exact_context = "\n\n... ".join(top_paras)
                            
                            parsed_limit = self.extract_limit_from_text(exact_context, analyte, analysis_type)
                            if parsed_limit:
                                url = live_url
                                parsed_limit['excerpt'] = exact_context
                                parsed_limit['url'] = url
                                parsed_limit['timestamp'] = datetime.now(timezone.utc).isoformat()
                                dkb[dkb_key] = parsed_limit
                                self.save_dkb(dkb)
                                break # Stop searching URLs because we found the limit!
                found_match = False
                best_insight = None
                
                if parsed_limit:
                    limit_val = parsed_limit['limit']
                    limit_unit = parsed_limit['unit']
                    limit_type = parsed_limit['type']
                    
                    status = "info"
                    insight_msg = "Extracted exact requirements."
                    dq_note = ""
                    is_converted = False
                    
                    compare_value = csv_value
                    if csv_unit and limit_unit and csv_unit != limit_unit:
                        converted = convert_unit(csv_value, csv_unit, limit_unit, analyte)
                        if converted is not None:
                            compare_value = converted
                            is_converted = True
                            dq_note = f"Unit Mismatch: {analyte} concentrations were reported in {csv_unit}; converted to {limit_unit} for comparison."
                        else:
                            # Deterministic rejection of disparate units
                            status = "warning"
                            insight_msg = f"Unit Mismatch: Cannot deterministically convert {csv_unit} to {limit_unit}."
                            dq_note = "Mathematical comparison aborted to prevent false compliance status."
                            limit_val = 0 # Prevent severityRatio
                    elif not csv_unit and limit_unit:
                        status = "warning"
                        insight_msg = f"Missing Unit: Your dataset does not specify a unit for {analyte_raw}."
                        dq_note = f"Cannot compare against regulatory limit of {limit_val} {limit_unit} without assuming units."
                        limit_val = 0
                            
                    if status != "warning": # Only do math if conversion didn't fail
                        if compare_value > limit_val:
                            status = "severe"
                            insight_msg = f"Exceedance (Regulatory Basis: {limit_val} {limit_unit})"
                        else:
                            status = "safe"
                            insight_msg = f"Compliant (Regulatory Basis: {limit_val} {limit_unit})"

                    best_insight = {
                        "packet_type": "row",
                        "sample_id": sample_id,
                        "analyte": analyte_raw,
                        "csv_value": csv_value,
                        "csv_unit": csv_unit,
                        "limit_val": limit_val,
                        "limit_unit": limit_unit,
                        "limit_type": limit_type,
                        "is_converted": is_converted,
                        "status": status,
                        "insight": insight_msg,
                        "source": url.split("//")[-1].split("/")[0] if "//" in url else "Web",
                        "full_url": url,
                        "excerpt": exact_context,
                        "dq_note": dq_note
                    }
                    found_match = True
                elif citation_cache.get(analyte):
                    # We searched but failed to find a numeric limit
                    best_insight = {
                        "packet_type": "row",
                        "sample_id": sample_id,
                        "analyte": analyte_raw,
                        "csv_value": csv_value,
                        "csv_unit": csv_unit,
                        "limit_val": 0,
                        "limit_unit": "",
                        "limit_type": "",
                        "is_converted": False,
                        "status": "info",
                        "insight": "General information found, but no numeric limit could be systematically parsed.",
                        "source": "Web",
                        "full_url": "",
                        "excerpt": exact_context,
                        "dq_note": ""
                    }
                    found_match = True
                    
                if not found_match:
                    best_insight = {
                        "packet_type": "row",
                        "sample_id": sample_id,
                        "analyte": analyte_raw,
                        "csv_value": csv_value,
                        "csv_unit": csv_unit,
                        "limit_val": 0,
                        "limit_unit": "",
                        "limit_type": "",
                        "is_converted": False,
                        "status": "info",
                        "insight": f"Unable to locate numeric regulatory limits for this chemical on the target domains.",
                        "source": "Web",
                        "full_url": "",
                        "excerpt": "",
                        "dq_note": ""
                    }
                
                insights_list.append(best_insight)
                yield json.dumps(best_insight)

        else:
            # Fallback if no custom domains
            for row in data_records:
                analyte_syns = ['analyte', 'parameter', 'chemical', 'pollutant', 'constituent', 'substance', 'indicator']
                analyte_key = next((k for k in row.keys() if any(syn in k.lower() for syn in analyte_syns)), None)
                analyte_raw = str(row[analyte_key]).strip() if analyte_key else "Unknown"
                
                value_syns = ['result', 'value', 'concentration', 'level', 'amount', 'reading']
                value_key = next((k for k in row.keys() if any(syn in k.lower() for syn in value_syns) and 'unit' not in k.lower()), None)
                try: csv_value = float(row[value_key]) if value_key else 0.0
                except: csv_value = 0.0
                
                insight = {
                    "packet_type": "row",
                    "sample_id": "N/A",
                    "analyte": analyte_raw,
                    "csv_value": csv_value,
                    "csv_unit": "",
                    "limit_val": 0,
                    "limit_unit": "",
                    "status": "info",
                    "insight": "No domain provided for search.",
                    "source": "Web",
                    "excerpt": "",
                    "dq_note": ""
                }
                insights_list.append(insight)
                yield json.dumps(insight)
        recommendations = self.generate_recommendations(insights_list, analysis_type=analysis_type)
        yield json.dumps({
            "packet_type": "recommendations",
            "recommendations": recommendations
        })

    def analyze_dataset(self, data_records: list[dict], scraped_citations: list[dict], analysis_type: str = "emissions", custom_domains: list[str] | None = None, custom_documents: dict[str, str] | None = None) -> list[dict]:
        results = []
        for packet in self.analyze_dataset_stream(data_records, scraped_citations, analysis_type, custom_domains, custom_documents):
            results.append(json.loads(packet))
        return results

expert_system = ExpertSystem()
