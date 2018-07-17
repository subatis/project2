// Function definitions

// Display channels
function showChannels(channels) {
    let channelList = '';

    for (var i = 0; i < channels.length; ++i) {
        channelList += '<a href="#" class="list-group-item list-group-item-action">';
        channelList += channels[i];
        channelList += '</a>';
    }

    document.querySelector('#channel-list').innerHTML = channelList;

    // Set change channel functionality to each list item
    document.querySelectorAll('.list-group-item-action').forEach(function(channel) {
        channel.onclick = function() {
            localStorage.setItem('current_channel', this.innerHTML);
            showChat();
        };
    });
}

// Show channel chat
function showChat() {
    document.querySelector('#channel-display').innerHTML = localStorage.getItem('current_channel');
}

// Load main form/page - must get channel data from application.py

// Change channel - must get channel data from application.py (socket/AJAX)

// Create channel - must get channel from application.py (socket/AJAX)

document.addEventListener('DOMContentLoaded', () => {

    // Connect to socket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Socket connect - configure applicable buttons & forms
    socket.on('connect', () => {

        // Create channel
        document.querySelector('#new-channel-form').onsubmit = () => {
            // Get new channel name
            var newChannel = document.querySelector('#txt-new-channel').value;

            // Emit event to Flask with channel name
            socket.emit('create_channel', {'channel_name': newChannel});

            return false;
        };
    });

    // Socket - listen for changes to channel list
    socket.on('channel_created', data => {
        showChannels(data)
    });

    // Show username if it exists
    if (localStorage.getItem('username')) {
        document.querySelector('#username-display').innerHTML = `, ${localStorage.getItem('username')}`;
    }

    // Set channel to general if no current channel
    if (!localStorage.getItem('current_channel')) {
        localStorage.setItem('current_channel', 'general');
    }

    // Show current chat
    showChat();

    // Display current channels
    const request = new XMLHttpRequest();
    request.open('GET', '/get_channels');
    request.onload = () => {
        const data = JSON.parse(request.responseText);
        showChannels(data);
    };
    request.send();


    // Set page events

    // Set username
    document.querySelector('#username-form').onsubmit = () => {
        // Get username and set local storage
        username = document.querySelector('#txt-username').value;
        localStorage.setItem('username', username);

        // Start and send new AJAX request with username data TODO MAY NOT NEED
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

});