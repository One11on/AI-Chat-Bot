console.log('JavaScript file loaded!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Get all required elements
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    
    console.log('Message input:', messageInput);
    console.log('Send button:', sendButton);
    console.log('Chat messages:', chatMessages);
    
    // Check if all elements exist
    if (!messageInput) {
        console.error('Message input element not found!');
        return;
    }
    if (!sendButton) {
        console.error('Send button element not found!');
        return;
    }
    if (!chatMessages) {
        console.error('Chat messages element not found!');
        return;
    }
    
    console.log('All elements found, setting up event listeners...');
    
    // Function to add message to chat
    function addMessage(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = text;
        
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to get CSRF token
    function getCsrfToken() {
        const csrfTokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfTokenInput) {
            return csrfTokenInput.value;
        }
        
        // Alternative method to get CSRF token from cookie
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue || '';
    }
    
    // Send message function
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) {
            console.log('No message to send');
            return;
        }
        
        console.log('Sending message:', message);
        
        // Add user message to chat immediately
        addMessage(message, true);
        messageInput.value = '';
        sendButton.disabled = true;
        
        try {
            console.log('Making POST request to /send_message/');
            
            const csrfToken = getCsrfToken();
            console.log('CSRF Token:', csrfToken ? 'Found' : 'Not found');
            
            const response = await fetch('/send_message/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ message: message }),
                credentials: 'same-origin'  // Important for sessions and CSRF
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            // Add bot response to chat
            if (data.bot_response) {
                addMessage(data.bot_response, false);
            } else if (data.error) {
                addMessage('Error: ' + data.error, false);
            } else {
                addMessage('No response from server', false);
            }
            
        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, there was an error sending your message: ' + error.message, false);
        } finally {
            sendButton.disabled = false;
            messageInput.focus();
        }
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Test: Add a test message when page loads
    setTimeout(() => {
        console.log('Chatbot fully initialized!');
    }, 100);
    
    console.log('Event listeners set up successfully!');
});