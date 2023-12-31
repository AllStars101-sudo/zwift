import json
from os import environ as env
from urllib.parse import quote_plus, urlencode

from authlib.integrations.flask_client import OAuth
from dotenv import find_dotenv, load_dotenv
from flask import Flask, redirect, render_template, session, url_for, request, jsonify
import requests
import polyline
from datetime import datetime
import openai
from transformers import BertTokenizer


if ENV_FILE := find_dotenv():
    load_dotenv(ENV_FILE)

app = Flask(__name__)
app.secret_key = env.get("APP_SECRET_KEY")

openai.api_key = env.get("OPENAI_API_KEY")
oauth = OAuth(app)

oauth.register(
    "auth0",
    client_id=env.get("AUTH0_CLIENT_ID"),
    client_secret=env.get("AUTH0_CLIENT_SECRET"),
    client_kwargs={
        "scope": "openid profile email",
    },
    server_metadata_url=f'https://{env.get("AUTH0_DOMAIN")}/.well-known/openid-configuration',
)

def truncate_text(text, max_tokens=15000):
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased') # replace 'bert-base-uncased' with a model that suits your needs
    tokens = tokenizer.encode(text, return_tensors='pt')[0]
    if len(tokens) > max_tokens:
        tokens = tokens[:max_tokens]
        text = tokenizer.decode(tokens)
    return text

# Controllers API
@app.route("/")
def home():
    return render_template(
        "welcome.html",
        session=session.get("user"),
        pretty=json.dumps(session.get("user"), indent=4),
    )


@app.route("/home")
def test():
    given_name = ''
    if 'userinfo' in session:  # <-- Check here if 'userinfo' in session
        given_name = session['userinfo']['given_name']
    return render_template(
        "home.html",
        session=session.get("user"),
        pretty=json.dumps(session.get("user"), indent=4),
        google_maps_key=env.get("GOOGLE_API_KEY"),
        given_name=given_name
    )

@app.route("/callback", methods=["GET", "POST"])
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user"] = token
    return redirect("/home")


@app.route("/login")
def login():
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True)
    )


@app.route("/logout")
def logout():
    session.clear()
    return redirect(
        "https://"
        + env.get("AUTH0_DOMAIN")
        + "/v2/logout?"
        + urlencode(
            {
                "returnTo": url_for("home", _external=True),
                "client_id": env.get("AUTH0_CLIENT_ID"),
            },
            quote_via=quote_plus,
        )
    )


@app.route('/calculate', methods=['GET', 'POST'])
def calculate():
    if request.method == 'POST':
        data = request.get_json()
        start = data['start']
        end = data['end']
    else:
        start = session.get('start')
        end = session.get('end')

    print(f"Start Location: {start}")
    print(f"End Location: {end}")

    url = f"https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins={start}&destinations={end}&mode=bicycling&key={env.get('GOOGLE_API_KEY')}"

    response = requests.get(url)
    data = response.json()

    distance = data.get('rows', [])[0].get('elements', [])[0].get('distance', {}).get('text', 'unknown')

    session['start'] = start
    session['end'] = end

    return jsonify({
        'start': start,
        'end': end,
        #'distance': distance
    })

@app.route("/directions")
def directions():
    print(session.get('start'))  # debug statement
    print(session.get('end'))    # debug statement
    return render_template(
        "directions.html",
        session=session.get("user"),
        pretty=json.dumps(session.get("user"), indent=4),
        google_maps_key=env.get("GOOGLE_API_KEY"),
    )

@app.route('/route_info', methods=['GET'])
def route_info():
    start = request.args.get('start')
    end = request.args.get('end')

    # Initialize data
    directions_data = places_data = elevation_data = weather_data = traffic_data = roadworks_data = None

    try:
        # Get route from Google Directions API
        directions_response = requests.get(f'https://maps.googleapis.com/maps/api/directions/json?origin={start}&destination={end}&key={env.get("GOOGLE_API_KEY")}')
        directions_data = directions_response.json()
        print("Directions Data:", directions_data)
        # Check if the response contains the expected data
        if 'routes' not in directions_data or not directions_data['routes']:
            return jsonify({'error': 'No routes found from Google Directions API'})


        #codec = PolylineCodec()
        for leg in directions_data['routes'][0]['legs']:
            for step in leg['steps']:
                # Decode the polyline for this step
                points = polyline.decode(step['polyline']['points'])
                # Generate points along the step every 10 km
                for i in range(0, len(points), 20):
                    point = points[i]

                    # Get points of interest near this point from Google Places API
                     # Get points of interest near this point from Google Places API
        places_response = requests.get(f'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={point[0]},{point[1]}&radius=5000&key={env.get("GOOGLE_API_KEY")}')
        places_json = places_response.json()

        places_data = [places_json['results'][:20]]
        print("Places Data:", places_data)

        # Get latitude and longitude of start location from Google Geocoding API
        geocoding_response = requests.get(f'https://maps.googleapis.com/maps/api/geocode/json?address={start}&key={env.get("GOOGLE_API_KEY")}')
        geocoding_data = geocoding_response.json()
        start_lat = geocoding_data['results'][0]['geometry']['location']['lat']
        start_lng = geocoding_data['results'][0]['geometry']['location']['lng']
        # Get latitude and longitude of end location from Google Geocoding API
        geocoding_response_end = requests.get(f'https://maps.googleapis.com/maps/api/geocode/json?address={end}&key={env.get("GOOGLE_API_KEY")}')
        geocoding_data_end = geocoding_response_end.json()
        end_lat = geocoding_data_end['results'][0]['geometry']['location']['lat']
        end_lng = geocoding_data_end['results'][0]['geometry']['location']['lng']

        # Get elevation data from Google Elevation API
        # Get elevation data from Google Elevation API
        elevation_response = requests.get(f'https://maps.googleapis.com/maps/api/elevation/json?path=enc:{polyline.encode([(start_lat, start_lng), (end_lat, end_lng)])}&samples=100&key={env.get("GOOGLE_API_KEY")}')
        elevation_data = elevation_response.json()

        # Calculate average elevation
        elevations = [result['elevation'] for result in elevation_data['results']]
        average_elevation = sum(elevations) / len(elevations)
        print("Elevation Data:", elevation_data)

        # Get weather data from OpenWeatherMap API
        weather_response = requests.get(f'http://api.openweathermap.org/data/2.5/weather?lat={start_lat}&lon={start_lng}&appid={env.get("OPENWEATHERMAP_API_KEY")}')
        weather_data = weather_response.json()

        # Get traffic data from Bing Maps API
        traffic_response = requests.get(f'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/{start},{end}?key={env.get("BING_MAPS_API_KEY")}')
        traffic_data = traffic_response.json()
        print("Traffic Data:", traffic_data)

        # Get roadworks data from Sydney Roadwork API
        roadworks_response = requests.get(
            'https://api.transport.nsw.gov.au/v1/live/hazards/roadwork/all',
            headers={'Authorization': f'Bearer {env.get("SYDNEY_API_KEY")}'},
        )
        roadworks_data = roadworks_response.json()
        print("Roadworks Data:", roadworks_data)

    except Exception as e:
        return jsonify({'error': str(e)})

    # Calculate health metrics
    distance = directions_data['routes'][0]['legs'][0]['distance']['value'] / 1000  # Distance in km
    calories_burned = distance * 50  # Rough estimate of calories burned per km

    # Prepare the data for the OpenAI API
    data = f"I have collected the following data for a route from {start} to {end}. Can you summarize this information with a focus on health benefits of cycling? What about cycling on this route given its elevation? Give as much information about these as possible. Give a fun fact about cycling as well: {directions_data}, {places_data}, {elevation_data}, {weather_data}, {traffic_data}, {roadworks_data}."

    # Truncate the data to fit within the token limit
    data = truncate_text(data)

    # Generate a summary with GPT-3.5
    response = openai.ChatCompletion.create(
      model="gpt-3.5-turbo-16k",
      messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": data},
        ]
    )
    response_text = response['choices'][0]['message']['content']
    response_text_html = response_text.replace('\n', '<br>')

    return jsonify({
        'start': start,
        'end': end,
        #'directions': directions_data,
        #'points_of_interest': places_data,
        'elevation': int(average_elevation),
        'weather': weather_data,
        'traffic': traffic_data,
        'roadworks': roadworks_data,
        'calories_burned': int(calories_burned),
        'response': response_text_html,
    })


@app.errorhandler(500)
def server_error(e):
    return jsonify(error=str(e)), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=env.get("PORT", 3000), debug=True)