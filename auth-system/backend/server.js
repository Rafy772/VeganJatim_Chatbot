const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// User Model

const CartActionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    price: Number,
    quantity: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const CartAction = mongoose.model('CartAction', CartActionSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  calories: Number,
  category: { type: String, enum: ['food', 'drink'] },
  image: String
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
const ConversationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  messages: [{
    role: { type: String, enum: ['user', 'ai', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

// Sample menu data (would typically come from a database)
const menuItems = [
  {
    name: "Margherita Pizza",
    description: "Pizza klasik Italia yang sederhana namun lezat. Terbuat dari adonan tipis yang dipanggang sempurna, ditutup dengan saus tomat, mozzarella segar, dan daun basil. Warna merah, putih, dan hijau dari bahan-bahan ini melambangkan bendera Italia.",
    price: 12.99,
    calories: 850,
    category: "food"
  },
  {
    name: "Burger & Fries",
    description: "Burger daging sapi yang juicy dengan kentang goreng yang renyah",
    price: 14.5,
    calories: 980,
    category: "food"
  },
  {
    name: "Iced Coffee",
    description: "Iced coffee adalah minuman kopi dingin yang menyegarkan. Dibuat dari kopi yang diseduh, kemudian didinginkan dengan es. Ditambahkan gula dan susu untuk menambah rasa manis dan lembut. Cocok dinikmati saat cuaca panas!",
    price: 4.99,
    calories: 120,
    category: "drink"
  }
];

// Format menu items into a string
const menuString = menuItems.map(item => 
  `NAME: ${item.name}\nDESCRIPTION: ${item.description}\nPRICE: $${item.price.toFixed(2)}\nCALORIES: ${item.calories}\nCATEGORY: ${item.category}\n`
).join('\n');

let fullPrompt;

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check username availability
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Existing password check
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ error: `${field} already exists` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body; // Changed from email to username
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update the /api/consult route to handle cart actions
app.post('/api/consult', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Get or create a conversation for this user
    let conversation = await Conversation.findOne({ userId }).sort({ createdAt: -1 });
    
    // If no conversation exists or the last one is older than 24 hours, create a new one
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (!conversation || conversation.createdAt < oneDayAgo) {
      conversation = new Conversation({ userId, messages: [] });
    }
    
    // Add the user message to the conversation
    conversation.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date()
    });
    
    // Prepare the context for the AI by formatting previous messages
    const contextMessages = conversation.messages
      .slice(-10) // Only use the last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    // Fetch all menu items from the database
    const menuItems = await MenuItem.find();
    
    // Format menu items as a structured list for the AI
    const menuString = menuItems.map(item => 
      `Item ID: ${item._id}\nItem: ${item.name}\nDescription: ${item.description}\nPrice: $${item.price.toFixed(2)}\nCalories: ${item.calories}\nCategory: ${item.category}`
    ).join('\n\n');

    // Create the full prompt with cart action instructions
    let fullPrompt;
    
// Update the cart instructions section in server.js
	const cartInstructions = `
IMPORTANT CART INSTRUCTIONS:
When a user asks to add or remove items from their cart, you should:
1. Identify the menu items they want to add/remove
2. Include a special CART_ACTION section in your response
3. Format it exactly like this:

For adding items:
[CART_ACTION]
ADD|ITEM_ID|ITEM_NAME|QUANTITY
[/CART_ACTION]

For removing items:
[CART_ACTION]
REMOVE|ITEM_ID|ITEM_NAME|QUANTITY
[/CART_ACTION]

Examples: 
- If user says "add 2 coffee to cart": ADD|COFFEE_ITEM_ID|Iced Coffee|2
- If user says "remove 1 pizza from cart": REMOVE|PIZZA_ITEM_ID|Margherita Pizza|1
- If user says "remove 2 coffee": REMOVE|COFFEE_ITEM_ID|Iced Coffee|2

Use the exact Item ID from the menu database above.
Multiple actions can be included by using multiple ADD/REMOVE lines.

IMPORTANT: If a user asks for an item that is NOT in the menu, politely explain that the item is not available and suggest similar items from the menu instead. Do NOT include CART_ACTION for unavailable items.
`;

	if (conversation.messages.length > 1) {
	  // For continuing conversations
	  fullPrompt = "Jawab menggunakan bahasa indonesia. Anda adalah asisten AI untuk sebuah website bernama vegan jatim. Anda memiliki akses ke database menu item di bawah ini, dan Anda harus menggunakan informasi ini untuk menjawab pertanyaan tentang menu dan memberikan rekomendasi, atau membantu dengan pesanan.\n\n" +
		"MENU ITEMS DATABASE:\n" + menuString + "\n\n" +
		cartInstructions + "\n\n" +
		"This is a continuation of a conversation. Previous messages:\n\n" +
		contextMessages + "\n\n" +
		"Human: " + prompt + "\n\nAssistant:";
	} else {
	  // For new conversations
	  fullPrompt = "Jawab menggunakan bahasa indonesia. Anda adalah asisten AI untuk sebuah website bernama vegan jatim. Anda memiliki akses ke database menu item di bawah ini, dan Anda harus menggunakan informasi ini untuk menjawab pertanyaan tentang menu dan memberikan rekomendasi, atau membantu dengan pesanan.\n\n" +
		"MENU ITEMS DATABASE:\n" + menuString + "\n\n" +
		cartInstructions + "\n\n" +
		"Human: " + prompt + "\n\nAssistant:";
	}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        prompt: fullPrompt,
        stream: false,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!ollamaResponse.ok) {
      const errorData = await ollamaResponse.json();
      throw new Error(`Ollama error: ${errorData.error}`);
    }

    const data = await ollamaResponse.json();
    const cleanResponse = data.response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    
    // Validate that we have a non-empty response
    if (!cleanResponse || cleanResponse.length === 0) {
      throw new Error('AI generated an empty response');
    }
    
    // Process cart actions
	let cartActions = [];
	const cartActionMatch = cleanResponse.match(/\[CART_ACTION\]([\s\S]*?)\[\/CART_ACTION\]/);

	if (cartActionMatch) {
	  const actionLines = cartActionMatch[1].trim().split('\n');
	  for (const line of actionLines) {
		const parts = line.trim().split('|');
		if (parts.length === 4 && (parts[0] === 'ADD' || parts[0] === 'REMOVE')) {
		  const [action, itemId, itemName, quantity] = parts;
		  const menuItem = menuItems.find(item => item._id.toString() === itemId);
		  if (menuItem) {
			cartActions.push({
			  action: action, // 'ADD' or 'REMOVE'
			  itemId: itemId,
			  name: menuItem.name,
			  price: menuItem.price,
			  quantity: parseInt(quantity) || 1
			});
		  }
		}
	  }
	}
    
    // Remove cart action from the displayed response
    let displayResponse = cleanResponse.replace(/\[CART_ACTION\][\s\S]*?\[\/CART_ACTION\]/g, '').trim();
    
    // Ensure we still have content after removing cart actions
    if (!displayResponse || displayResponse.length === 0) {
      displayResponse = 'Permintaan Anda telah diproses.'; // Default response in Indonesian
    }
    
    // Add the AI response to the conversation - only if we have valid content
    if (displayResponse && displayResponse.length > 0) {
      conversation.messages.push({
        role: 'ai',
        content: displayResponse,
        timestamp: new Date()
      });
      
      // Save the updated conversation
      await conversation.save();
    } else {
      // If somehow we still don't have content, don't save but still return a response
      console.warn('Empty response after cleaning, not saving to conversation');
      displayResponse = 'Maaf, saya tidak dapat memberikan respons yang tepat. Silakan coba lagi.';
    }
    
    res.json({
      response: displayResponse,
      cartActions: cartActions
    });

  } catch (error) {
    console.error('Consultation error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      return res.status(500).json({ 
        error: 'Terjadi kesalahan dalam menyimpan percakapan. Silakan coba lagi.' 
      });
    }
    
    const errorMessage = error.message.includes('aborted') 
      ? 'Request timed out' 
      : error.message;
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    res.json({ available: !user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/menu', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // Clear all conversations for this user
    await Conversation.deleteMany({ userId });
    
    res.json({ message: 'Logged out successfully and conversations cleared' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout properly' });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});