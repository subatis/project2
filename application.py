import os
import datetime

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

#### TODO: store messages

# list of channels
channel_list = ['general']

# Message class
class Message:
    def __init__(self, msg, timestamp):
        self.msg = msg;
        self.timestamp = datetime.datetime.now()

# Main route
@app.route("/")
def index():
    return render_template("index.html")

# Adding a new channel; receive event and emit channel list for rendering
@socketio.on("create_channel")
def create_channel(data):
    print("Socket IO: create channel called")

    new_channel = data["channel_name"]
    channel_list.append(data["channel_name"])

    print(f"Appended channel {new_channel}")

    emit("channel_created", channel_list, broadcast=True)

# Set username; sets session name
@app.route("/set_username", methods=["POST"])
def set_username():
    print ("username route called")

    session["username"] = request.form.get("username")

    print(f"/set_username set username {session['username']}")

    return "Success"

# Get channel list
@app.route("/get_channels")
def get_channels():
    return jsonify(channel_list);