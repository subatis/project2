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
        document.querySelector('#chat').innerHTML = chats;
    };

    const currentChannel = new FormData();
    currentChannel.append('current_channel', localStorage.getItem('current_channel'));
    requestChats.send(currentChannel);
}

// Builds HTML & renders one chat at a time, when sending/receiving messages in a given channel
// @param chatMessage one chat message (dictionary) from Flask
function appendChat(chatMessage) {
    const newMessage = MESSAGE_TEMPLATE({'username': chatMessage.username, 'message': chatMessage.message,
                                            'timestamp': chatMessage.timestamp});
    document.querySelector('#chat').innerHTML += newMessage;

    // If we are displaying more than 100 messages, delete the oldest (topmost) one from DOM
    if (chatMessage.exceeded_limit) {
        document.querySelector('.card').remove();
    }
}

// Set Username
function setUsername(username) {
        // Start and send new AJAX request with username data
        const request = new XMLHttpRequest();
        request.open('POST', '/set_username');

        request.onload = () => {
            // Check for duplicates
            if (request.responseText === 'Duplicate') {
                alert('Sorry, this username is already taken');

                // Remove from local storage if this is a relic from a previous visit and the username has since been taken
                localStorage.removeItem('username');
            }
            // If successful, set local storage
            else {
                localStorage.setItem('username', username);
                document.querySelector('#username-display').innerHTML = `${username}`;
            }
        };

        const data = new FormData();
        data.append('username', username);
        data.append('sid', localStorage.getItem('sid'));
        request.send(data);
}

// *****************************************************************************************************************************
// ***** ON DOM LOAD    ********************************************************************************************************
// *****************************************************************************************************************************

document.addEventListener('DOMContentLoaded', () => {

    // Generate random ID for this session if we don't already have one
    if (!localStorage.getItem('sid'))
        localStorage.setItem('sid', 'i' + Math.random().toString(16).slice(2));

    // *****************************************************************************************************************************
    // ***** WEB SOCKET ON/EMITS    ************************************************************************************************
    // *****************************************************************************************************************************

    // Connect to socket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Once connected, configure forms
    socket.on('connect', () => {

        // Create channel - get new channel name, change to new channel, and emit event to Flask with channel name
        document.querySelector('#new-channel-form').onsubmit = () => {
            var newChannel = document.querySelector('#txt-new-channel').value;
            socket.emit('create_channel', {'channel_name': newChannel});

            return false;
        };

        // Send chat message - get message and emit event to Flask with username, channel and message
        document.querySelector('#chat-input-form').onsubmit = () => {
            var message = document.querySelector('#txt-chat-input').value;
            socket.emit('send_chat_message', {'username': localStorage.getItem('username'),
                                                'channel': localStorage.getItem('current_channel'), 'message': message});

            return false;
        };

        /* TODO
        // On disconnect, update user list on Flask (e.g. to free up username), if username is set in local storage
        socket.on('disconnect', () => {
            if (localStorage.getItem('username'))
                socket.emit('disconnect_user', {'username': localStorage.getItem('username')});
        });*/

    });

    // Listen for changes to channel list
    socket.on('channel_created', data => {
        showChannels(socket, data);
    });

    // Listen for changes to chat, but only update display if the new chat is in the user's current channel
    socket.on('received_chat_message', data => {
        if (data.channel == localStorage.getItem('current_channel'))
            appendChat(data);
    });

    // Listen for when a user leaves a channel
    socket.on('left_channel', data => {
        if (data.channel == localStorage.getItem('current_channel'))
            showUsers(data.users);
    });

    // Listen for when a user leaves a channel
    socket.on('joined_channel', data => {
        if (data.channel == localStorage.getItem('current_channel'))
            showUsers(data.users);
    });

    // Set username
    document.querySelector('#username-form').onsubmit = () => {
        username = document.querySelector('#txt-username').value;
        setUsername(username);

        return false;
    };

    // *****************************************************************************************************************************
    // ***** INITIAL DISPLAY    ****************************************************************************************************
    // *****************************************************************************************************************************

    // If a username is stored from previous session, check that it is still available and set accordingly (if same user)
    if (localStorage.getItem('username')) {
        //document.querySelector('#username-display').innerHTML = `${localStorage.getItem('username')}`;
        setUsername(localStorage.getItem('username'));
    }

    // Get and display current channels & chat
    const requestChannels = new XMLHttpRequest();
    requestChannels.open('GET', '/get_channels');

    requestChannels.onload = () => {
        const data = JSON.parse(requestChannels.responseText);

        // If locally stored channel doesn't exist, set to general
        if (!localStorage.getItem('current_channel') || !data.includes(localStorage.getItem('current_channel'))) {
            localStorage.setItem('current_channel', 'general');
        }

        // Notify Flask of user join
        socket.emit('join_channel', {'username': localStorage.getItem('username'),
                        'old_channel': false, 'new_channel': localStorage.getItem('current_channel')});

        showChannels(socket, data);
        showCurrentChannelChat();
    };

    requestChannels.send();

});