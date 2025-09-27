# MobileByteLabs Translator

**MobileByteLabs Translator** is an intelligent translation service platform that provides advanced translation capabilities through a modern web interface. The application leverages AI-powered translation services and GitHub integration to help developers and teams manage multilingual content efficiently.

### Key Features

- **AI-Powered Translation**: Integrated with Google Gemini AI for high-quality translations
-  **GitHub Integration**: Seamless OAuth authentication, repository management and automated PR generation.
- **Repository Scanning**: Automated analysis of codebases for translation opportunities

### Technology Stack

**Frontend:**
- React with TypeScript
- React Router for navigation
- Axios for API communication

**Backend:**
- Node.js with Express
- GitHub OAuth integration
- Google Gemini AI integration (Extends in future).

## Project Setup

Follow these instructions to set up the project locally for development.

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Git
- GitHub account (for OAuth integration)
- Google Gemini AI API key

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/mobilebytelabs-translator.git
   cd mobilebytelabs-translator
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure GitHub OAuth (Required)**

   Update the following variables in `backend/.env`:
   ```env
   # GitHub OAuth (Get from https://github.com/settings/applications/new)
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   ```

### Manual Installation (Alternative)

If you prefer to set up manually:

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will start on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will start on `http://localhost:3000`

3. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`
   - The application should load 
   - Use GitHub OAuth to authenticate and access repository features

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```

The build files will be generated in the `frontend/build` directory.

### API Endpoints

The backend provides the following main API endpoints:

- `GET /health` - Health check endpoint
- `GET /api/test` - API test endpoint
- `POST /api/auth/github` - GitHub OAuth authentication
- `GET /api/repositories` - List user repositories
- `POST /api/scan/:owner/:repo` - Scan repository for translations
- `POST /api/translate` - Translation services

### Environment Variables Reference

**Backend Required Variables:**
- `GITHUB_CLIENT_ID` - GitHub OAuth application client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth application secret
- `JWT_SECRET` - Secret for JWT token generation

**Optional Variables:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `CORS_ORIGIN` - Frontend URL for CORS (default: http://localhost:3000)

### Troubleshooting

**Common Issues:**

1. **GitHub OAuth not working:**
   - Ensure your GitHub OAuth app is configured correctly
   - Check that the callback URL matches your settings
   - Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct

2. **Translation features not working:**
   - Verify your `GEMINI_API_KEY` is valid and has sufficient quota
   - Check the backend logs for API errors

3. **CORS errors:**
   - Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
   - For production, update this to your deployed frontend URL

4. **Build errors:**
   - Run `npm install` in both frontend and backend directories
   - Check that all environment variables are properly set
   - Ensure Node.js version is 16 or higher

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation in the codebase

---

**MobileByteLabs**