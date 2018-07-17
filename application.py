import os

from flask import Flask, render_template, request, session, jsonify
from flask_session import Session
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# list of all channels
channel_list = ['general']

# Main route
@app.route("/")
def index():
    return render_template("index.html")

# Adding a new channel; returns the channel list for rendering
@app.route("/new_channel", methods=["POST"])
def new_channel():
    print ("new channel route called")

    new_channel = request.form.get("channel_name")
    channel_list.append(new_channel)

    print(f"/new_channel added {new_channel}")

    return jsonify(channel_list)

# Set username; sets session name
@app.route("/set_username", methods=["POST"])
def set_username():
    print ("username route called")

    session["username"] = request.form.get("username")

    print(f"/set_username set username {session['username']}")

    return "Success"
