// Create a new file seed.js in backend directory
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
	  calories: Number,
      category: String,
      image: String
    }));

    await MenuItem.deleteMany();

	// Update the sample items in backend/seed.js
	const sampleItems = [
	  {
		name: 'Margherita Pizza',
		description: 'Classic Italian pizza with fresh tomatoes and basil',
		price: 12.99,
		calories: 850,
		category: 'food',
		image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
	  },
	  {
		name: 'Burger & Fries',
		description: 'Juicy beef burger with crispy french fries',
		price: 14.50,
		calories: 980,
		category: 'food',
		image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
	  },
	  {
		name: 'Iced Coffee',
		description: 'Cold brew coffee with milk and ice',
		price: 4.99,
		calories: 120,
		category: 'drink',
		image: 'https://www.allrecipes.com/thmb/aizVUz1JlBwSPI_hrH4Wu1XFXSE=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/21667-easy-iced-coffee-ddmfs-4x3-0093-7becf3932bd64ed7b594d46c02d0889f.jpg'
	  }
	];

    await MenuItem.insertMany(sampleItems);
    console.log('Database seeded!');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });