  # Start PostgreSQL
  cd 7ala9i && docker-compose up -d

  # Backend
  cd backend && pip install -r requirements.txt
  python seed.py
  uvicorn app.main:app --reload

  # Frontend
  cd frontend && npm install
  npx expo start

  # Accounts

  Database seeded successfully!
  Admin: admin@halagi.mr / admin123
  Owner 1: ahmed@halagi.mr / owner123
  Owner 2: moussa@halagi.mr / owner123
  Owner 3: ibrahim@halagi.mr / owner123
  Client: client@halagi.mr / client123
  Created 5 salons with services and working hours