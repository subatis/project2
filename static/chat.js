// Function definitions

// Load main form/page - must get channel data from application.py

// Change channel - must get channel data from application.py (socket/AJAX)

// Create channel - must get channel from application.py (socket/AJAX)

document.addEventListener('DOMContentLoaded', () => {

    // Set page events

    // Set username
    document.querySelector('#username-form').onsubmit = () => {
        // Get username and set local storage
        var username = document.querySelector('#txt-username').value;
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

    // Create channel
    document.querySelector('#new-channel-form').onsubmit = () => {
        // Get new channel name and send to Flask via AJAX
        var newChannel = document.querySelector('#txt-new-channel').value;

        const request = new XMLHttpRequest();
        request.open('POST', '/new_channel');

        // Refresh channel list
        request.onload = () => {
            const data = JSON.parse(request.responseText);
            let channelList = '';

            for (var i = 0; i < data.length; ++i) {
                channelList += '<a href="#" class="list-group-item list-group-item-action">';
                channelList += data[i];
                channelList += '</a>';
            }

            document.querySelector('#channel-list').innerHTML = channelList;
        };

        const data = new FormData();
        data.append('channel_name', newChannel);
        request.send(data);

        return false;
    };

});