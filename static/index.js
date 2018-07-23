// This is just to remove the (pointless and) annoying warnings in the online IDE
// See https://stackoverflow.com/questions/38270011/varname-is-not-defined-please-fix-or-add-global-varname-cloud9
/*global io*/
/*global localStorage*/
/*global location*/
/*global Handlebars */

// *****************************************************************************************************************************
// ***** ON DOM LOAD    ********************************************************************************************************
// *****************************************************************************************************************************

document.addEventListener('DOMContentLoaded', () => {

    // Generate random ID for this session if we don't already have one
    if (!localStorage.getItem('sid'))
        localStorage.setItem('sid', 'i' + Math.random().toString(16).slice(2));

    // Connect to socket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Once connected, configure forms/buttons
    socket.on('connect', () => {
        // Create channel - send new channel name and username/sid of creator as well as user's current channel
        document.querySelector('.btn-create-channel').onclick = () => {
            newChannelInput = document.querySelector('#txt-new-channel');

            if (newChannelInput.value !== '') {
                console.log("text in create channel detected");

                var newChannel = newChannelInput.value;
                socket.emit('create_channel', {'new_channel': newChannel, 'old_channel': localStorage.getItem('current_channel'),
                                                'username': localStorage.getItem('username'), 'sid': localStorage.getItem('sid')});
                // Clear textbox
                document.querySelector('#txt-new-channel').value = '';
            }
            return false;
        };

        // Set username - send username and sid
        document.querySelector('#btn-username').onclick = () => {
            usernameInput = document.querySelector('#txt-username');

            socket.emit('set_username', {'username': usernameInput.value, 'sid': localStorage.getItem('sid')});
            // Clear textbox
            usernameInput.value = '';

            return false;
        };

        // Send chat message - send username, channel and message
        document.querySelector('.btn-chat').onclick = () => {
            messageInput = document.querySelector('#txt-chat-input');

            // Check to ensure there is a value and process accordingly
            if (messageInput.value !== '') {

                // Check if we are trying to send a private message
                if (messageInput.value.charAt(0) === '@') {
                    socket.emit('send_private_chat_message', {'username': localStorage.getItem('username'),
                                                    'channel': localStorage.getItem('current_channel'),
                                                    'message': messageInput.value});
                }

                else {
                    socket.emit('send_chat_message', {'username': localStorage.getItem('username'),
                                                    'channel': localStorage.getItem('current_channel'),
                                                    'message': messageInput.value});
                }

                // Clear textbox
                messageInput.value = '';
            }

            return false;
        };


    });

    // ***** ON socket events    ***************************************************************************************************

    // Listen for changes to channel list
    socket.on('channel_created', data => {
        showChannels(socket, data.channels);

        // if the channel was created successfully, automatically put the creator into the channel
        if (data.sid === localStorage.getItem('sid')) {
            localStorage.setItem('current_channel', data.new_channel);
            showCurrentChannelChat();
        }
    });

    // Listen for when a user joins or leaves a channel
    socket.on('joined_or_left_channel', data => {
        if (data.channel === localStorage.getItem('current_channel'))
            showUsers(data.users);
    });

    // Listen for changes to chat, but only update display if the new chat is in the user's current channel
    socket.on('received_chat_message', data => {
        if (data.channel === localStorage.getItem('current_channel'))
            appendChat(data);
    });

    // Listen for private messages; note that these are "temporary" and will be cleared if leaving channel or site
    socket.on('received_private_chat_message', data => {
        if (data.target_username === localStorage.getItem('username') || data.username === localStorage.getItem('username'))
            appendChat(data);
    });

    // Listen for when user tries to create new username; when successful, start chat
    socket.on('created_username', data => {
        // Match sid
        if (data.sid === localStorage.getItem('sid')) {
            if (data.success) {
                localStorage.setItem('username', data["username"]);

                // Join locally stored channel if it exists, otherwise join general
                var channel = '';
                if (localStorage.getItem('current_channel')) {
                    channel = localStorage.getItem('current_channel');
                }
                else {
                    channel = 'general';
                    localStorage.setItem('current_channel', 'general');
                }

                // Join channel
                socket.emit('join_channel', {'username': localStorage.getItem('username'),
                                                'old_channel': false, 'new_channel': channel});

                // Show chat area and set welcome message
                document.querySelector('#main-page-body').style.visibility = 'visible';
                let username = localStorage.getItem('username');
                document.querySelector('#username-display').innerHTML = `${username}`;

                // Get channels and display
                const requestChannels = new XMLHttpRequest();
                requestChannels.open('GET', '/get_channels');
                requestChannels.onload = () => {
                    const data = JSON.parse(requestChannels.responseText);
                    showChannels(socket, data);
                };
                requestChannels.send();

                // Get users and display
                const requestUsers = new XMLHttpRequest();
                requestUsers.open('POST', '/get_users');
                requestUsers.onload = () => {
                    const data = JSON.parse(requestUsers.responseText);
                    showUsers(data);
                };
                const curChannel = new FormData();
                curChannel.append('current_channel', localStorage.getItem('current_channel'));
                requestUsers.send(curChannel);

                // Refresh chat
                showCurrentChannelChat();
            }

            // Duplicate username; hide page and alert user
            else {
                document.querySelector('#main-page-body').style.visibility = 'hidden';
                alert('Username already taken or invalid! Please choose a new alias.');

                // If this was a relic from a previous session and the name has since been taken, remove from local storage
                localStorage.removeItem('username');
            }
        }
    });

    // ***** INITIAL DISPLAY      **************************************************************************************************

    // If a username is stored from previous session, check that it is still available and set accordingly (if same user)
    if (localStorage.getItem('username')) {
        socket.emit('set_username', {'username': localStorage.getItem('username'), 'sid': localStorage.getItem('sid')});
    }

    // If no username available, hide chat area
    else {
        document.querySelector('#main-page-body').style.visibility = 'hidden';
    }

});

// *****************************************************************************************************************************
// ***** HANDLEBARS TEMPLATES    ***********************************************************************************************
// *****************************************************************************************************************************

const MESSAGE_TEMPLATE = Handlebars.compile(document.querySelector('#template-chat-message').innerHTML);
const CHANNEL_LIST_ITEM_TEMPLATE = Handlebars.compile(document.querySelector('#template-channel-list-item').innerHTML);
const USER_LIST_ITEM_TEMPLATE = Handlebars.compile(document.querySelector('#template-user-list-item').innerHTML);

// *****************************************************************************************************************************
// ***** FUNCTION DEFINITIONS    ***********************************************************************************************
// *****************************************************************************************************************************

// Display channel list & set onClick functionality for selecting a channel
// @param channels An array of channel names from Flask (list of dictionary keys)
function showChannels(socket, channels) {

    // Generate and display channel list
    let channelList = '';
    for (var i = 0; i < channels.length; ++i) {
        const newListItem = CHANNEL_LIST_ITEM_TEMPLATE({'channel': channels[i]});
        channelList += newListItem;
    }

    document.querySelector('#channel-list').innerHTML = channelList;

    // Set change channel functionality for each list item (e.g. to update channel display)
    document.querySelectorAll('.list-group-item-channel').forEach(function(channel) {
        channel.onclick = function() {
            // Clear chat area and get new channel name from id
            document.querySelector('#chat').innerHTML = '';
            var newChannel = this.id.replace('channel-list-item-', '');

            // Notify Flask of channel change and set local storage
            socket.emit('join_channel', {'username': localStorage.getItem('username'),
                        'old_channel': localStorage.getItem('current_channel'), 'new_channel': newChannel});
            localStorage.setItem('current_channel', newChannel);

            // Change display
            showCurrentChannelChat();

            return false;
        };
    });
}

// Display current channel chat in its entirety (e.g. refresh entire chat when changing channels or loading page)
function showCurrentChannelChat() {
    // Set channel name (title)
    document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');

    const requestChats = new XMLHttpRequest();

    requestChats.open('POST', '/get_chats');
    requestChats.onload = () => {
        const data = JSON.parse(requestChats.responseText);

        // Set channel name (title)
        document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');

        // Build HTML from chat data using Handlebars template
        let chats = '';
        for (var i = 0; i < data.length; ++i) {
            const newMessage = MESSAGE_TEMPLATE({ 'username': data[i].username, 'message': data[i].message,
                                                    'timestamp': data[i].timestamp});
            chats += newMessage;
        }

        // Update page
        chatroom = document.querySelector('#chat');
        chatroom.innerHTML = chats;

        // Ensure we are scrolled all the way down to show most recent chats 1st
        chatroom.scrollTop = chatroom.scrollHeight;
    };

    const currentChannel = new FormData();
    currentChannel.append('current_channel', localStorage.getItem('current_channel'));
    requestChats.send(currentChannel);
}

// Display list of users for current channel
function showUsers(users) {
    // Generate and display user list
    let userList = '';
    for (var i = 0; i < users.length; ++i) {
        const newListItem = USER_LIST_ITEM_TEMPLATE({'username': users[i]});
        userList += newListItem;
    }

    document.querySelector('#user-list').innerHTML = userList;
}

// Builds HTML & renders one chat at a time, when sending/receiving messages in a given channel
// @param chatMessage one chat message (dictionary) from Flask
function appendChat(chatMessage) {
    chatroom = document.querySelector('#chat');

    const newMessage = MESSAGE_TEMPLATE({'username': chatMessage.username, 'message': chatMessage.message,
                                            'timestamp': chatMessage.timestamp});
    chatroom.innerHTML += newMessage;

    // If we are displaying more than 100 messages, delete the oldest (topmost) one from DOM
    if (chatMessage.exceeded_limit) {
        document.querySelector('.card').remove();
    }

    // Ensure we are scrolled all the way down to show most recent chats 1st
    chatroom.scrollTop = chatroom.scrollHeight;
}
