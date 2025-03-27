# EnviRon - AI-Powered Waste Classification System

EnviRon is an innovative web application that uses artificial intelligence to help users identify and properly dispose of different types of waste. The application combines Google Cloud Vision API for image recognition with Google Maps API to provide users with nearby disposal locations.

## 🌟 Features

### 1. AI-Powered Waste Classification
- Upload images of waste items
- Automatic classification using Google Cloud Vision API
- Categorizes waste into:
  - Recyclable (plastic, glass, metal, paper)
  - Hazardous (batteries, electronics, chemicals)
  - Donatable (clothes, furniture, books)
  - Organic (food, organic waste)
  - General Waste

### 2. Location-Based Disposal Guidance
- Uses browser geolocation to find nearby disposal locations
- Provides specific disposal instructions for each waste type
- Shows nearby facilities based on waste category:
  - Recycling centers
  - Hazardous waste facilities
  - Thrift stores
  - Compost facilities

### 3. User Progress Tracking
- Gamification system with points and badges
- Achievement badges:
  - Eco-Warrior
  - Recycler Pro
  - Climate Champion
- Progress tracking for waste classification history

### 4. Community Features
- Share classification results
- View community statistics
- Compare environmental impact
- Social interactions with other users

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Framer Motion (animations)
- React Router DOM
- Supabase Client

### Backend
- Node.js
- Express.js
- Google Cloud Vision API
- Google Maps API
- Supabase (Database & Auth)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Platform account
- Supabase account
- Google Maps API key

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/EnviRon.git
cd EnviRon
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
```

4. Set up environment variables:

Frontend (.env):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

Backend (.env):
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PORT=3000
```

## 🚀 Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:5173
```

## 📁 Project Structure

```
EnviRon/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   ├── assets/                 # Static assets
│   ├── App.jsx                 # Main application component
│   └── supabase.js             # Supabase client configuration
├── backend/                     # Backend server code
│   └── server.js               # Express server
├── public/                      # Public static files
└── [configuration files]        # Various config files
```

## 🔒 Security

- Image validation and size limits
- Secure API key handling
- User authentication via Supabase
- CORS configuration
- Rate limiting
- Input validation

## 🌐 Deployment

## Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy


### Database (Supabase)
1. Set up required tables:
   - users
   - classifications
   - challenges
   - challenge_participants
2. Configure storage buckets
3. Set up row-level security

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



## 🙏 Acknowledgments

- Google Cloud Vision API for image recognition
- Google Maps API for location services
- Supabase for database and authentication
- React and Vite communities for excellent tools

## 📞 Support

singhtanmay1202@gmail.com

## 🔄 Updates

- Version 1.0.0: Initial release
- Version 1.1.0: Added community features
- Version 1.2.0: Enhanced AI classification

---

Made with ❤️ by the EnviRon Team