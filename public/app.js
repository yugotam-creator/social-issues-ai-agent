const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const sendButton = document.getElementById('sendButton');

function addMessage(text, isUser = false, agentName = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (isUser) {
        contentDiv.textContent = text;
    } else {
        contentDiv.innerHTML = formatText(text);
        if (agentName) {
            const agentInfo = document.createElement('div');
            agentInfo.className = 'agent-info';
            agentInfo.textContent = `🤖 ${agentName}が対応`;
            contentDiv.appendChild(agentInfo);
        }
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatText(text) {
    let formatted = text
        .split('\n').join('<br>')
        .replace(/【(.+?)】/g, '<strong>【$1】</strong>')
        .replace(/^\s*[-•]\s+/gm, '• ');

    return formatted;
}

function showLoading() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'loading-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <div class="loading">
            <span>レポート生成中</span>
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
    `;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoading() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

function showError(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content error-message';
    contentDiv.innerHTML = `<strong>⚠️ エラーが発生しました</strong><p>${message}</p>`;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setButtonLoading(isLoading) {
    sendButton.disabled = isLoading;
    if (isLoading) {
        sendButton.querySelector('span:first-child').style.display = 'none';
        sendButton.querySelector('.spinner').style.display = 'inline-block';
    } else {
        sendButton.querySelector('span:first-child').style.display = 'inline';
        sendButton.querySelector('.spinner').style.display = 'none';
    }
}

async function sendMessage(text) {
    try {
        setButtonLoading(true);
        showLoading();

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        removeLoading();

        if (data.success) {
            addMessage(data.message, false, data.agent);
        } else {
            showError(data.error || '回答を生成できませんでした');
        }

    } catch (error) {
        removeLoading();
        console.error('Error:', error);

        let errorMessage = '通信エラーが発生しました';

        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'サーバーに接続できません。Wi-Fiに接続しているか確認してください。';
        } else if (error.message.includes('401')) {
            errorMessage = 'API キーが無効です。サーバーの設定を確認してください。';
        } else if (error.message.includes('429')) {
            errorMessage = 'リクエストが多すぎます。少し待ってから再度試してください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度試してください。';
        }

        showError(errorMessage);

    } finally {
        setButtonLoading(false);
    }
}

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();

    if (message.length === 0) {
        alert('メッセージを入力してください');
        return;
    }

    addMessage(message, true);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendMessage(message);
});

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

console.log('✅ Chat application initialized');