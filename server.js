const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const agents = {
  childRights: {
    name: '子どもの権利・教育問題エージェント',
    keywords: ['子ども', '教育', '学校', '学習', '格差', '貧困', '権利', '児童'],
    systemPrompt: `あなたは「子どもの権利」と「教育問題」の専門家です。
教育格差、児童虐待、学習支援、学校環境について専門的に分析してください。
統計データ、具体例、政策提案を含めた詳細なレポート（800～1000字）を日本語で生成してください。`
  },

  media: {
    name: 'メディアのあり方エージェント',
    keywords: ['メディア', 'ニュース', 'ジャーナリズム', '報道', 'フェイク', 'SNS'],
    systemPrompt: `あなたはメディア・ジャーナリズムの専門家です。
フェイクニュース、報道倫理、メディアリテラシー、情報問題について専門的に分析してください。
具体例、メディア理論、改善提案を含めた詳細なレポート（800～1000字）を日本語で生成してください。`
  },

  addiction: {
    name: '依存症問題エージェント',
    keywords: ['依存症', 'ギャンブル', 'ゲーム', '薬物', 'アルコール'],
    systemPrompt: `あなたは依存症問題の専門家です。
ギャンブル、ゲーム、薬物、アルコール依存症について専門的に分析してください。
医学知識、統計、治療方法、支援制度を含めた詳細なレポート（800～1000字）を日本語で生成してください。`
  },

  general: {
    name: '社会問題総合エージェント',
    keywords: [],
    systemPrompt: `あなたは社会問題全般の専門家です。
問題の背景、統計データ、政策、解決策を含めた詳細で バランスの取れたレポート（800～1000字）を日本語で生成してください。`
  }
};

function selectAgent(userMessage) {
  const message = userMessage.toLowerCase();
  let scores = {};
  
  for (const [key, agent] of Object.entries(agents)) {
    if (key === 'general') continue;
    scores[key] = 0;
    agent.keywords.forEach(keyword => {
      if (message.includes(keyword)) {
        scores[key]++;
      }
    });
  }

  const selectedKey = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  return scores[selectedKey] > 0 ? agents[selectedKey] : agents.general;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'メッセージが空です' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API キーが設定されていません' });
    }

    const selectedAgent = selectAgent(message);
    console.log(`Selected Agent: ${selectedAgent.name}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const fullPrompt = `${selectedAgent.systemPrompt}

ユーザーの質問: "${message}"

以下の形式でレポートを生成してください：

【レポートタイトル】
適切なタイトルを付けてください

【概要】
問題の概要を簡潔にまとめる（100字程度）

【現状分析】
統計データ、事例、具体的な状況を含める（300字程度）

【課題と問題点】
主な課題を複数挙げて説明する（250字程度）

【解決策・改善提案】
具体的な解決策や政策提案を挙げる（250字程度）

【結論】
全体をまとめ、行動を促す形で締める（100字程度）`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    res.json({
      success: true,
      agent: selectedAgent.name,
      message: text
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'エラーが発生しました'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📌 Gemini API configured: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
});