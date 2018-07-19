// *****************************************************************************************************************************
// ***** HANDLEBARS TEMPLATES    ***********************************************************************************************
// *****************************************************************************************************************************

const MESSAGE_TEMPLATE = Handlebars.compile(document.querySelector('#template-chat-message').innerHTML);
const CHANNEL_LIST_ITEM_TEMPLATE = Handlebars.compile(document.querySelector('#template-channel-list-item').innerHTML);

// *****************************************************************************************************************************
// ***** FUNCTION DEFINITIONS    ***********************************************************************************************
// *****************************************************************************************************************************

// Display channel list & set onClick functionality for selecting a channel
// @param channels An array of channel names from Flask (list of dictionary keys)
function showChannels(channels) {

    // Generate and display channel list
    let channelList = '';
    for (var i = 0; i < channels.length; ++i) {
        const newListItem = CHANNEL_LIST_ITEM_TEMPLATE({'channel': channels[i]});
        channelList += newListItem;
    }

    document.querySelector('#channel-list').innerHTML = channelList;

    // Set change channel functionality for each list item (e.g. to update channel display)
    document.querySelectorAll('.list-group-item-action').forEach(function(channel) {
        channel.onclick = function() {
            // Clear chat area and set current channel to selection
            document.querySelector('#chat').innerHTML = '';
            var newChannel = this.id.replace('channel-list-item-', '');
            localStorage.setItem('current_channel', newChannel);

            showCurrentChannelChat();

            return false;
        };
    });
}

// Builds HTML & renders ALL messages in a channel (for changing channels/loading page)
// @param chatData an array of chat message dictionaries as parameter from Flask
function showChat(chatData) {
    // Set channel name (title)
    document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');

    // Build HTML from chat data using Handlebars template
    let chats = '';
    for (var i = 0; i < chatData.length; ++i) {
        const newMessage = MESSAGE_TEMPLATE({ 'username': chatData[i].username, 'message': chatData[i].message,
                                                'timestamp': chatData[i].timestamp});
        chats += newMessage;
    }

    // Update page
    document.querySelector('#chat').innerHTML = chats;
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

// Display current channel chat, when page is loaded or channel is changed
function showCurrentChannelChat() {
    // Set channel name (title)
    document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');

    const requestChats = new XMLHttpRequest();

    requestChats.open('POST', '/get_chats');
    requestChats.onload = () => {
        const data = JSON.parse(requestChats.responseText);
        showChat(data);
    };

    const currentChannel = new FormData();
    currentChannel.append('current_channel', localStorage.getItem('current_channel'));
    requestChats.send(currentChannel);
}

// *****************************************************************************************************************************
// ***** ON DOM LOAD    ********************************************************************************************************
// *****************************************************************************************************************************

document.addEventListener('DOMContentLoaded', () => {

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

    });

    // Listen for changes to channel list
    socket.on('channel_created', data => {
        showChannels(data);
    });

    // Listen for changes to chat, but only update display if the new chat is in the user's current channel
    socket.on('received_chat_message', data => {
        if (data.channel == localStorage.getItem('current_channel'))
            appendChat(data);
    });

    // Set username
    document.querySelector('#username-form').onsubmit = () => {
        username = document.querySelector('#txt-username').value;

        // Start and send new AJAX request with username data
        const request = new XMLHttpRequest();
        request.open('POST', '/set_username');

        request.onload = () => {
            document.querySelector('#username-display').innerHTML = `, ${username}`;

            // Check for duplicates
            if (request.responseText === 'Duplicate') {
                alert('Sorry, this username is already taken');
            }
            // If successful, set local storage
            else {
                localStorage.setItem('username', username);
            }

        };

        const data = new FormData();
        data.append('username', username);
        request.send(data);

        return false;
    };

    // *****************************************************************************************************************************
    // ***** INITIAL DISPLAY    ****************************************************************************************************
    // *****************************************************************************************************************************

    // Show username if it exists
    if (localStorage.getItem('username')) {
        document.querySelector('#username-display').innerHTML = `, ${localStorage.getItem('username')}`;
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

        showChannels(data);
        showCurrentChannelChat();
    };

    requestChannels.send();

});