import os
import datetime
import json

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Channel class -- maintains a list of messages and users currently in the channel, and the SID of the channel's creator
# MESSAGES (in lists) - dictionaries following the convention: channel, username, message, timestamp, if msg exceeds channel limit
class Channel:
    def __init__(self, creator):
        self.created_by = creator
        self.messages = []
        self.users = []

# Username dictionary - Usernames are unique names(keys) paired with the users session.sid generated on site visit
usernames = {}

# Channel list - add general channel by default
# KEYS/VALUES - channel names(unique keys, for easy duplicate catching) and actual class objects themselves
channel_list = { "general": Channel("default") }

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

# Sending a private message
@socketio.on("send_private_chat_message")
def send_private_chat_message(data):
    # Parse out target's username from message
    # Strip @ sign from message and find index of first space after that
    message = data["message"].strip("@")
    msg_start_index = message.find(" ")

    # Get target username by parsing out string before aforementioned space; if formatted incorrectly the msg simply won't reach user
    target_username = message[:msg_start_index]

    # Strip username to get rest of message and add (privately) label
    message = "(privately to " + target_username + ") " + message[msg_start_index:]

    # Create new message from incoming data as dictionary, including target user
    newMessage = {
                    "channel": data["channel"],
                    "username": data["username"],
                    "target_username": target_username,
                    "message": message,
                    "timestamp": datetime.datetime.now().strftime("%I:%M:%S %D"),
                    "exceeded_limit": False
                 }

    print(f"attempting to send private chat message: {message} to {target_username}")

    # Emit the newly received message
    emit("received_private_chat_message", newMessage, broadcast=True)

# Adding a new channel
@socketio.on("create_channel")
def create_channel(data):

    username = data["username"]
    old_channel = data["old_channel"]
    new_channel = data["new_channel"]
    sid = data["sid"]

    print(f"{username}/{sid} attempting to create {new_channel} | old channel: {old_channel}")

    # If channel does not exist, add new channel and set creator ID
    if data["new_channel"] not in channel_list:
        channel_list[data["new_channel"]] = Channel(data["sid"])

        # Emit event to update channel lists and user lists of respective channels and join creator to new channel
        emit("channel_created", {'new_channel': data["new_channel"], 'sid': data["sid"], 'channels': list(channel_list.keys())}, broadcast=True)
        join_channel(data)

# Update user lists on channel change and emit changed lists
@socketio.on("join_channel")
def join_channel(data):
    username = data["username"]
    old_channel = data["old_channel"]
    new_channel = data["new_channel"]

    print(f"{username} attempting to leave {old_channel} and join {new_channel}")

    # If attempting to join channel we are already in, simply return
    if data["old_channel"] == data["new_channel"]:
        return

    # Remove user from old channel if it exists and emit changed list ('old' channel does not exist on first visit)
    if old_channel:
        print(f"{old_channel} user list before leave:")
        print(channel_list[old_channel].users)
        channel_list[old_channel].users.remove(username)
        print(f"{old_channel} user list after leave:")
        print(channel_list[old_channel].users)
        emit("joined_or_left_channel", {'channel': old_channel, 'users': channel_list[old_channel].users}, broadcast=True)

    # If the user isn't already in the channel, add them and emit changed list
    if username not in channel_list[new_channel].users:
        print(f"{new_channel} user list before join:")
        print(channel_list[new_channel].users)
        channel_list[new_channel].users.append(username)
        print(f"{new_channel} channel user list after join:")
        print(channel_list[new_channel].users)
        emit("joined_or_left_channel", {'channel': new_channel, 'users': channel_list[new_channel].users}, broadcast=True)

# TODO
# Remove a username on disconnect
#@socketio.on("disconnect_user")
#def disconnect_user(data):
#    del usernames[data["username"]]

# Set username with session id and check for duplicates
@socketio.on("set_username")
def set_username(data):
    new_username = data["username"]
    sid = data["sid"]

    print(f"set username called: {new_username}, {sid}")

    # if a different sid is trying to use an already taken username, emit failure
    if (new_username in usernames and usernames["new_username"] != sid) or (new_username.strip() == ""):
        emit('created_username', {'sid': sid, 'success': False}, broadcast=True)
        return

    # otherwise, add username, assign sid and emit success
    usernames["new_username"] = sid
    emit('created_username', {'username': new_username, 'sid': sid, 'success': True}, broadcast=True)
    print("created username emitted")

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

# Get user list
@app.route("/get_users", methods=["POST"])
def get_users():
    current_channel = request.form.get("current_channel")

    # If channel doesn't exist, set to general
    if current_channel not in channel_list:
        current_channel = "general"

    return jsonify(channel_list[current_channel].users)
