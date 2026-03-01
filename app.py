from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from optimizer import recommend
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/crops', methods=['GET'])
def get_crops():
    from optimizer import load_crops
    crops = load_crops()
    names = sorted(list(set([c['name'] for c in crops])))
    return jsonify(names)

@app.route('/recommend', methods=['POST'])
def get_recommendation():
    try:
        data = request.json
        
        # Extract fields
        land_size = float(data.get('land_size', 1.0))
        soil_type = data.get('soil_type', '').lower()
        water_avail = data.get('water_avail', '').lower()
        season = data.get('season', '')
        budget = float(data.get('budget', 50000))
        preferred_crops = data.get('preferred_crops', [])
        sowing_date = data.get('sowing_date', '')
        temperature = data.get('temperature')
        if temperature: 
            temperature = float(temperature)
        
        # Run optimization
        top_crops = recommend(land_size, soil_type, water_avail, season, budget, preferred_crops, sowing_date, temperature)
        
        # Return raw crops; Frontend handles interactive allocation & math
        response = {
            "success": True,
            "crops": top_crops,
            "land_size": land_size
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    # Ensure templates and static directories exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    app.run(debug=True, port=5001)
