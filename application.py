import os
import datetime
import json

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Channel class -- maintains a list of messages and users currently in the channel
# MESSAGES (in lists) - dictionaries following the convention: channel, username, message, timestamp, if msg exceeds channel limit
class Channel:
    def __init__(self):
        self.messages = []
        self.users = []

# Username dictionary - Usernames are unique names(keys) paired with the users session.sid generated on site visit
usernames = {}

# Channel list - add general channel by default
# KEYS/VALUES - channel names(unique keys, for easy duplicate catching) and actual class objects themselves
channel_list = { "general": Channel() }

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

    channel_list[newMessage["channel"]].messages.append(newMessage)

    # If we have exceeded max messages in a channel message list, remove oldest message and flag to update client side
    if len(channel_list[newMessage["channel"]].messages) > MAX_MESSAGES:
        channel_list[newMessage["channel"]].messages.pop(0)
        newMessage["exceeded_limit"] = True

    # Emit the newly received message
    emit("received_chat_message", newMessage, broadcast=True)

# Adding a new channel; receive event and emit list of channel names for rendering
@socketio.on("create_channel")
def create_channel(data):
    # If channel does not exist, add new channel
    if data["channel_name"] not in channel_list:
        channel_list[data["channel_name"]] = Channel()

    emit("channel_created", list(channel_list.keys()), broadcast=True)

# Update user lists on channel change and emit changed lists
@socketio.on("join_channel")
def join_channel(data):
    username = data["username"]
    old_channel = data["old_channel"]
    new_channel = data["new_channel"]

    print(f"called join_channel: {username} leaving {old_channel}, joining {new_channel}")

    # Remove user from old channel if it exists and emit changed list
    if old_channel:
        channel_list[old_channel].users.remove(username)
        old_channel_users = { "channel": old_channel, "users": channel_list[old_channel].users }
        emit("left_channel", old_channel_users, broadcast=True)

    # Add user to new channel and emit changed list
    channel_list[new_channel].users.append(username)
    new_channel_users = { "channel": new_channel, "users": channel_list[new_channel].users }
    emit("joined_channel", new_channel_users, broadcast=True)

# TODO
# Remove a username on disconnect
#@socketio.on("disconnect_user")
#def disconnect_user(data):
#    del usernames[data["username"]]

# Set username with session id and check for duplicates
@app.route("/set_username", methods=["POST"])
def set_username():
    new_username = request.form.get("username")
    sid = request.form.get("sid")

    # if a different sid is trying to use an already taken username, return duplicate
    if new_username in usernames and usernames["new_username"] != sid:
        return "Duplicate"

    # otherwise, add username, assign sid and return success
    usernames["new_username"] = sid
    return "Success"

# Get chat messages for requested (current) channel
@app.route("/get_chats", methods=["POST"])
def get_chats():
    current_channel = request.form.get("current_channel")

    # If channel doesn't exist, set to general
    if current_channel not in channel_list:
        current_channel = "general"

    return jsonify(channel_list[current_channel].messages)

# Get channel list
@app.route("/get_channels")
def get_channels():
    return jsonify(list(channel_list.keys()))
