BASE_SYNONYMS = {
    "SO2": "Sulfur Dioxide",
    "Sulfur Dioxide (SO2)": "Sulfur Dioxide",
    "NOx": "Nitrogen Oxides",
    "Nitrogen Oxides (NOx)": "Nitrogen Oxides",
    "CO": "Carbon Monoxide",
    "Carbon Monoxide (CO)": "Carbon Monoxide",
    "Pb": "Lead",
    "Lead (Pb)": "Lead",
    "NH3": "Ammonia",
    "Ammonia (NH3)": "Ammonia",
    "PM10": "Particulate Matter 10",
    "Particulate Matter (PM10)": "Particulate Matter 10",
    "VOC": "Volatile Organic Compounds",
    "Volatile Organic Compounds (VOC)": "Volatile Organic Compounds"
}

# Auto-calculate normalized version to map incoming junk directly
SYNONYMS = {k.upper(): v for k, v in BASE_SYNONYMS.items()}

def resolve_analyte(raw_name: str) -> str:
    """Normalizes analyte strings against the baseline dictionary with 100% case indifference."""
    cleaned = raw_name.strip().upper()
    return SYNONYMS.get(cleaned, raw_name.strip())
