import os
import json
from flask import Flask, request, send_from_directory, jsonify

import torch
from model.autoencoder import MovieLensAutoencoder

MOVIES_PATH = "data/ml-1m/movies.json"
MODEL_PATH = "data/ml-1m/model.pth"

app = Flask(__name__, static_url_path="")


@app.route("/")
def index():
    return send_from_directory("", "index.html")

@app.route("/static/<path:path>")
def send_static(path):
    return send_from_directory("static", path)

@app.route("/movies")
def send_movies():
    movies = None
    with open(MOVIES_PATH, "r") as json_file:
        movies = json.load(json_file)
    return jsonify([movie for k, movie in movies.items()])

@app.route("/predict")
def predict():
    model = torch.load(MODEL_PATH)
    iids = request.args.getlist('iid', type=int)
    return jsonify(model.predict(iids).tolist())

# -----------------------------------------------------------------------------
# ----------------------------- MAIN ------------------------------------------ 
# -----------------------------------------------------------------------------
if __name__ == "__main__":

    app.run(host = "0.0.0.0", port=8899)