import json
from datetime import datetime, timedelta

def load_crops():
    with open('crops.json', 'r') as f:
        return json.load(f)

def calculate_profit(yield_per_acre, msp, cost_per_acre, land_acres):
    total_revenue = yield_per_acre * land_acres * msp
    total_cost = cost_per_acre * land_acres
    return total_revenue - total_cost

def generate_calendar(crop, sowing_date_str):
    """
    Generates an irrigation and fertilization calendar.
    sowing_date_str: 'YYYY-MM-DD'
    """
    events = []
    try:
        if sowing_date_str:
            sowing_date = datetime.strptime(sowing_date_str, '%Y-%m-%d')
        else:
            sowing_date = datetime.now()
    except (ValueError, TypeError):
        sowing_date = datetime.now()
        
    duration = crop.get('duration_days', 100)
    water_need = crop.get('water_need', 'medium')
    name = crop.get('name', 'Crop')
    
    # Simple rule based calendar
    # Irrigation
    irrigation_interval = 10 if water_need == 'high' else 15 if water_need == 'medium' else 25
    current_day = 5
    while current_day < duration:
        event_date = sowing_date + timedelta(days=current_day)
        events.append({
            'date': event_date.strftime('%Y-%m-%d'),
            'title': f'Irrigation for {name}',
            'type': 'irrigation',
            'crop': name
        })
        current_day += irrigation_interval
        
    # Fertilization
    fert_days = [15, 45] # Baseline
    if duration > 120:
        fert_days.append(75)
    for fd in fert_days:
        if fd < duration:
            event_date = sowing_date + timedelta(days=fd)
            events.append({
                'date': event_date.strftime('%Y-%m-%d'),
                'title': f'Fertilization for {name}',
                'type': 'fertilization',
                'crop': name
            })
            
    # Sort events
    events.sort(key=lambda x: x['date'])
    return events

def recommend(land_size, soil_type, water_avail, season, budget, preferred_crops=None, sowing_date=None, temperature=None):
    if preferred_crops is None:
        preferred_crops = []
    preferred_crops = [p.lower() for p in preferred_crops]

    crops = load_crops()
    scored_crops = []
    
    for crop in crops:
        score = 0
        
        # Initialize filtering tracker
        crop['selectable'] = True
        crop['unselectable_reasons'] = []
        
        # 1. Hard Constraint: Season Filtering
        is_365_day = all(s in [c.lower() for c in crop['season']] for s in ['kharif', 'rabi', 'zaid'])
        
        # If the user chose "365 days" in the dropdown, but this isn't a 365-day crop
        if season.lower() == '365 days' and not is_365_day:
            crop['selectable'] = False
            crop['unselectable_reasons'].append(f"Requires 365-day cycle (Only grows in {', '.join(crop['season'])})")
            score -= 100
        # Normal season check
        elif season.lower() != '365 days' and season.lower() not in [s.lower() for s in crop['season']] and not is_365_day:
            crop['selectable'] = False
            crop['unselectable_reasons'].append(f"Out of Season (Grows in {', '.join(crop['season'])})")
            score -= 100
        else:
            score += 20
            
        # 1.5 Hard Constraint: Sowing Month vs Selected Season Strict Match
        if sowing_date:
            try:
                s_date = datetime.strptime(sowing_date, '%Y-%m-%d')
                s_month = s_date.month
                
                season_months = {
                    'kharif': [7, 8, 9, 10],
                    'rabi': [10, 11, 12, 1, 2, 3],
                    'zaid': [3, 4, 5, 6],
                    '365 days': list(range(1, 13))
                }
                
                allowed_months = season_months.get(season.lower(), list(range(1, 13)))
                
                if s_month not in allowed_months:
                    crop['selectable'] = False
                    month_name = s_date.strftime('%B')
                    crop['unselectable_reasons'].append(f"Sowing Month ({month_name}) does not match {season.title()} season constraints")
                    score -= 100
                else:
                    score += 10
                    
                # 1.6 Hard Constraint: Crop Duration Exceeds Season Bounds
                if season.lower() != '365 days':
                    duration_days = crop.get('duration_days', 100)
                    harvest_date = s_date + timedelta(days=duration_days)
                    
                    # Define absolute end dates for the seasons for the current sowing year
                    # Kharif: Oct 31, Rabi: Mar 31 (next year if sowing is late), Zaid: Jun 30
                    sowing_year = s_date.year
                    
                    if season.lower() == 'kharif':
                        season_end_date = datetime(sowing_year, 10, 31)
                    elif season.lower() == 'rabi':
                        # If sowing in Oct-Dec, rabi ends in Mar of next year
                        if s_month >= 10:
                            season_end_date = datetime(sowing_year + 1, 3, 31)
                        else:
                            season_end_date = datetime(sowing_year, 3, 31)
                    elif season.lower() == 'zaid':
                        season_end_date = datetime(sowing_year, 6, 30)
                        
                    if harvest_date > season_end_date:
                        crop['selectable'] = False
                        crop['unselectable_reasons'].append(f"Crop duration ({duration_days} days) exceeds the end of {season.title()} season")
                        score -= 100
            except (ValueError, TypeError):
                pass
            
        # 2. Hard Constraint: Temperature Filtering
        if temperature is not None:
            min_t, max_t = crop.get('temp_range', [10, 40])
            if temperature < min_t or temperature > max_t:
                crop['selectable'] = False
                crop['unselectable_reasons'].append(f"Temperature Mismatch (Needs {min_t}-{max_t}°C)")
                score -= 100
            else:
                score += 20
                
        # 3. Hard Constraint: Soil Type Filtering
        if soil_type not in crop['soil_type']:
            crop['selectable'] = False
            crop['unselectable_reasons'].append(f"Incompatible Soil (Needs {', '.join(crop['soil_type']).title()})")
            score -= 100
        else:
            score += 20
            
        # 4. Hard Constraint: Water Availability Filtering
        water_map = {'low': 1, 'medium': 2, 'high': 3}
        crop_water_score = water_map.get(crop['water_need'], 2)
        avail_water_score = water_map.get(water_avail, 2)
        
        if crop_water_score > avail_water_score:
            crop['selectable'] = False
            crop['unselectable_reasons'].append(f"Insufficient Water (Needs {crop['water_need'].title()} availability)")
            score -= 100
        elif crop_water_score == avail_water_score:
            score += 30
        else:
            score += 15
            
        # Budget Check (Still just a score penalty, not a hard "cannot grow here" constraint)
        if crop['cost_per_acre'] * land_size > budget:
            score -= 40
            
        # Boost for Preferred crops
        if crop['name'].lower() in preferred_crops:
            score += 150
            
        # Profitability Score
        profit_per_acre = calculate_profit(crop['yield_per_acre'], crop['msp'], crop['cost_per_acre'], 1.0)
        profit_score = min(50, (profit_per_acre / 100000.0) * 50)
        score += profit_score
        
        # Include crop if it has positive score or is explicitly preferred
        # Also include some unselectable ones to show users what they are missing out on
        if score > -80 or crop['name'].lower() in preferred_crops:
            crop['total_score'] = score
            crop['profit_per_acre'] = profit_per_acre
            crop['calendar'] = generate_calendar(crop, sowing_date)
            scored_crops.append(crop)
            
    # Sort by descending score
    scored_crops.sort(key=lambda x: x['total_score'], reverse=True)
    
    # Return top 12 to show more options for the interactive UI
    top_crops = scored_crops[:12]
    
    return top_crops
