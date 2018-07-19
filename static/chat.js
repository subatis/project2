// *****************************************************************************************************************************
// ***** HANDLEBARS TEMPLATES    ***********************************************************************************************
// *****************************************************************************************************************************

const MESSAGE_TEMPLATE = Handlebars.compile(document.querySelector('#template-chat-message').innerHTML);

// *****************************************************************************************************************************
// ***** FUNCTION DEFINITIONS    ***********************************************************************************************
// *****************************************************************************************************************************

// Display channels
// @param channels An array of channel names from Flask (list of dictionary keys)
function showChannels(channels) {
    let channelList = '';

    for (var i = 0; i < channels.length; ++i) {
        channelList += '<a href="#" class="list-group-item list-group-item-action">';
        channelList += channels[i];
        channelList += '</a>';
    }

    document.querySelector('#channel-list').innerHTML = channelList;

    // Set change channel functionality for each list item (e.g. to update channel display)
    document.querySelectorAll('.list-group-item-action').forEach(function(channel) {
        channel.onclick = function() {
            // Clear chat area and set current channel to selection
            document.querySelector('#chat').innerHTML = '';
            localStorage.setItem('current_channel', this.innerHTML);

            // Display chat for current channel
            const requestChats = new XMLHttpRequest();
            requestChats.open('POST', '/get_chats');
            requestChats.onload = () => {
                const data = JSON.parse(requestChats.responseText);
                showChat(data);
            };
            const currentChannel = new FormData();
            currentChannel.append('current_channel', localStorage.getItem('current_channel'));
            requestChats.send(currentChannel);

            return false;
        };
    });
}

// Show ALL channel chat when loading page or changing channels
// @param chatData an array of chat message dictionaries as parameter from Flask
function showChat(chatData) {
    // Set channel name (title)
    document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');

    // Build HTML from chat data using Handlebars template
    let chats = '';
    for (var i = chataData.length; i < chatData.length; ++i) {
        const newMessage = MESSAGE_TEMPLATE({'username': chatData[i].username, 'message': chatData[i].message});
        chats += newMessage;
    }

    // Update page
    document.querySelector('#chat').innerHTML = chats;
}

// Append one chat at a time when in a channel
// @param chatMessage one chat message (dictionary) from Flask
function appendChat(chatMessage) {
    const newMessage = MESSAGE_TEMPLATE({'username': chatMessage.username, 'message': chatMessage.message});
    document.querySelector('#chat').innerHTML += newMessage;
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

        // Create channel - get new channel name and emit event to Flask with channel name
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
        if (data[0].channel == localStorage.getItem('current_channel'))
            showChat(data);
    });

    // Set username
    document.querySelector('#username-form').onsubmit = () => {
        // Get username and set local storage
        username = document.querySelector('#txt-username').value;
        localStorage.setItem('username', username);

        // Start and send new AJAX request with username data
        const request = new XMLHttpRequest();
        request.open('POST', '/set_username');
        request.onload = () => {
            document.querySelector('#username-display').innerHTML = `, ${username}`;
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

    // Set channel to general if no current channel
    if (!localStorage.getItem('current_channel')) {
        localStorage.setItem('current_channel', 'general');
    }

    // Display current channels
    const requestChannels = new XMLHttpRequest();
    requestChannels.open('GET', '/get_channels');
    requestChannels.onload = () => {
        const data = JSON.parse(requestChannels.responseText);
        showChannels(data);
    };
    requestChannels.send();

    // Display current chat
    const requestChats = new XMLHttpRequest();
    requestChats.open('POST', '/get_chats');
    requestChats.onload = () => {
        const data = JSON.parse(requestChats.responseText);
        showChat(data);
    };
    const currentChannel = new FormData();
    currentChannel.append('current_channel', localStorage.getItem('current_channel'))
    requestChats.send(currentChannel);

});