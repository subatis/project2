import os
import datetime
import json

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

# Username set (to avoid duplicate usernames)
usernames = {}

# Channel list - add general channel by default
# KEYS - channel names
# VALUES - lists of messages
# MESSAGES - dictionaries following convention: channel, username, message, timestamp
channel_list = { "general": [] }

# Main route
@app.route("/")
def index():
    return render_template("index.html")

# Sending a chat message; receive event and emit chats to display
@socketio.on("send_chat_message")
def send_chat_message(data):
    print("Socket IO: send chat called")

    message_text = data["message"]
    username = data["username"]
    channel = data["channel"]

    print (f"Adding new message to {channel} by {username}: {message_text}")

    channel_list[channel].append({
                                    "channel": channel,
                                    "username": username,
                                    "message": message_text,
                                    "timestamp": datetime.datetime.now().strftime("%I:%M:%S %D")
                                })

    # only emits chat list for channel where new message was received
    emit("received_chat_message", channel_list[channel], broadcast=True)

# Adding a new channel; receive event and emit list of channel names for rendering
@socketio.on("create_channel")
def create_channel(data):
    print("Socket IO: create channel called")

    new_channel = data["channel_name"]
    channel_list[new_channel] = []

    print(f"Appended channel {new_channel}")

    emit("channel_created", list(channel_list.keys()), broadcast=True)

# Set username and check for duplicates
@app.route("/set_username", methods=["POST"])
def set_username():
    print ("username route called")

    session["username"] = request.form.get("username")

    print(f"/set_username set username {session['username']}")

    return "Success"

# Get chat data
@app.route("/get_chats", methods=["POST"])
def get_chats():
    current_channel = request.form.get("current_channel")

    print(f"/get chats: getting chat data from {current_channel}")

    # If channel doesn't exist, set to general
    if current_channel not in channel_list:
        current_channel = "general"

    return jsonify(channel_list[current_channel])

# Get channel list
@app.route("/get_channels")
def get_channels():
    return jsonify(list(channel_list.keys()))
