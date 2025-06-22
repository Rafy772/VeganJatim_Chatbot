# Vegan Jatim AI Consultation Platform
System Development and Implementation - UAS - PPS - Moch Rafy Adhipramana Effendy - 6026242012. 

Source code Ulangan Akhir Semester Mata Kuliah Penerapan dan Pengembangan Sistem yang diampu oleh Bapak Dr. Ir. Aris Tjahyanto, M.Kom.

Aplikasi MERN stack (MongoDB, Express, React, Node.js) dengan integrasi AI Ollama. Proyek ini menyediakan sistem pemesanan menu vegan tempat pengguna dapat mengobrol dengan asisten AI untuk mendapatkan rekomendasi menu, menambahkan atau menghapus item dari keranjang belanja, dan mengelola pesanan mereka dengan mudah.

# Fitur
Autentikasi Pengguna:  
Daftar, masuk, dan keluar dengan sesi berbasis JWT yang aman.

AI Chatbot:  
Berkomunikasi dalam Bahasa Indonesia dengan asisten AI (didukung oleh model Gemma 4B milik Google) untuk menanyakan menu, mendapatkan rekomendasi, dan menangani tindakan keranjang belanja menggunakan tag [CART_ACTION] khusus.

Cart Management:  
Secara otomatis menambahkan atau menghapus item menu berdasarkan instruksi AI dalam obrolan.

Database:  
Database MongoDB dengan contoh item menu vegan.

Protected Routes:  
Endpoint yang aman untuk pengambilan menu dan dasbor pengguna.

# Prerequisites
Node.js (v14 or higher)
npm or Yarn  
MongoDB instance (locally) 
Ollama CLI (locally)

#Environment Variables
Buat file .env di dalam directory backend/ dengan variabel berikut:
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
OLLAMA_URL=http://localhost:11434

#Installation & Setup
Clone the repository
git clone https://github.com/Rafy772/VeganJatim_Chatbot.git
cd VeganJatim_Chatbot
cd cd auth-system

Backend Setup
cd backend
npm install
node seed.js (cukup sekali sebagai sample item untuk database)
node server.js

Frontend Setup
cd frontend
npm install
npm start

# Contoh Penggunaan Chatbot
Tambah 2 Iced Coffee ke keranjang saya (Add 2 Iced Coffees to my cart)
Hapus 1 Margherita Pizza (Remove 1 Margherita Pizza)
Rekomendasikan menu makanan rendah kalori (Recommend low-calorie menu items)
Berapa asupan kalori harian saya jika usia saya 20 tahun, berat badan 68 kg, tinggi badan 185 cm, dan saya laki-laki? (What is my daily calorie intake if my age is 20 years old, weight 68 kg, height 185 cm, and I am male?)

# Dependencies

Backend:

express  
mongoose  
bcryptjs  
jsonwebtoken  
cors  
dotenv  
node.js  

Frontend:

react  
react-dom  
axios  
