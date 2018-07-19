import os
import datetime
import json

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Username set (to avoid duplicate usernames)
usernames = set()

# Channel list - add general channel by default
# KEYS/VALUES - channel names/lists of messages in each channel
# MESSAGES (in lists) - dictionaries following the convention: channel, username, message, timestamp, if msg exceeds channel limit
channel_list = { "general": [] }

# Maximum number of messages per channel
MAX_MESSAGES = 100

# Main route
@app.route("/")
def index():
    return render_template("index.html")

# Sending a chat message; receive event and emit chats to display
@socketio.on("send_chat_message")
def send_chat_message(data):
    # Create new message from incoming data as dictionary and append to message list in appropriate channel
    newMessage = {
                    "channel": data["channel"],
                    "username": data["username"],
                    "message": data["message"],
                    "timestamp": datetime.datetime.now().strftime("%I:%M:%S %D"),
                    "exceeded_limit": False
                 }

    channel_list[newMessage["channel"]].append(newMessage)

    # If we have exceeded max messages in a channel message list, remove oldest message
    if len(channel_list[newMessage["channel"]]) > MAX_MESSAGES:
        channel_list[newMessage["channel"]].pop(0)
        newMessage["exceeded_limit"] = True

    # Emit the newly received message
    emit("received_chat_message", newMessage, broadcast=True)

# Adding a new channel; receive event and emit list of channel names for rendering
@socketio.on("create_channel")
def create_channel(data):
    # If channel does not exist, add new channel
    if data["channel_name"] not in channel_list:
        channel_list[data["channel_name"]] = []

    emit("channel_created", list(channel_list.keys()), broadcast=True)

# Set username and check for duplicates
@app.route("/set_username", methods=["POST"])
def set_username():
    new_username = request.form.get("username")

    if new_username in usernames:
        return "Duplicate"

    usernames.add(new_username)
    return "Success"

# Get chat data for requested (current) channel
@app.route("/get_chats", methods=["POST"])
def get_chats():
    current_channel = request.form.get("current_channel")

    # If channel doesn't exist, set to general
    if current_channel not in channel_list:
        current_channel = "general"

    return jsonify(channel_list[current_channel])

# Get channel list
@app.route("/get_channels")
def get_channels():
    return jsonify(list(channel_list.keys()))
