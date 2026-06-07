# Core Molecular Masses used for Gas to Mass conversion mapping.
MOLAR_MASS = {
    "Sulfur Dioxide": 64.066,
    "Nitrogen Oxides": 46.0055, # Represented as NO2 equivalent standard
    "Carbon Monoxide": 28.01,
    "Ammonia": 17.031,
    "Volatile Organic Compounds": 12.011 # Measured as carbon equivalent baseline
}

def convert_unit(value: float, from_unit: str, to_unit: str, chemical: str) -> float | None:
    """
    Safely normalizes numbers across disparate metric spaces preventing false exceedance reporting.
    Specifically handles volume-to-mass conversions requiring chemical molecular weights.
    Assumes standard SATP (25 °C, 1 atm -> 24.45 L/mol).
    """
    from_u = from_unit.strip().lower()
    to_u = to_unit.strip().lower()
    
    synonyms = {
        "micrograms per cubic meter": "ug/m3",
        "parts per million": "ppm",
        "parts per billion": "ppb",
        "milligrams per liter": "mg/l",
        "micrograms per liter": "ug/l",
        "milligrams per kilogram": "mg/kg",
        "micrograms per kilogram": "ug/kg"
    }
    from_u = synonyms.get(from_u, from_u)
    to_u = synonyms.get(to_u, to_u)
    
    if from_u == to_u:
        return value
        
    # Direct Gas
    if from_u == "ppm" and to_u == "ppb":
        return value * 1000.0
    if from_u == "ppb" and to_u == "ppm":
        return value / 1000.0
        
    # ppm/ppb to mg/m3 conversions
    if from_u in ["ppm", "ppb"] and to_u in ["mg/m3", "ug/m3", "mg/nm3"]:
        mass = MOLAR_MASS.get(chemical)
        if not mass:
            return None # Rejects unsafe comparison
            
        base_ppm = value if from_u == "ppm" else value / 1000.0
        mg_m3 = base_ppm * (mass / 24.45)
        
        if to_u == "ug/m3":
            return mg_m3 * 1000.0
        return mg_m3
        
    # mg/m3 to ppm conversions
    elif from_u in ["mg/m3", "ug/m3", "mg/nm3"] and to_u in ["ppm", "ppb"]:
        mass = MOLAR_MASS.get(chemical)
        if not mass:
            return None
            
        base_mgm3 = value if from_u in ["mg/m3", "mg/nm3"] else value / 1000.0
        ppm = base_mgm3 * (24.45 / mass)
        
        if to_u == "ppb":
            return ppm * 1000.0
        return ppm
        
    # Equivalent Metric steps
    if from_u == "ug/m3" and to_u in ["mg/m3", "mg/nm3"]:
        return value / 1000.0
    if from_u in ["mg/m3", "mg/nm3"] and to_u == "ug/m3":
        return value * 1000.0
        
    # Water conversions
    if from_u == "ug/l" and to_u == "mg/l":
        return value / 1000.0
    if from_u == "mg/l" and to_u == "ug/l":
        return value * 1000.0
        
    # Soil conversions
    if from_u == "ug/kg" and to_u == "mg/kg":
        return value / 1000.0
    if from_u == "mg/kg" and to_u == "ug/kg":
        return value * 1000.0

    return None
