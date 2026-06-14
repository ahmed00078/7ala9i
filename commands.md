# Start PostgreSQL
cd 7ala9i && docker-compose up -d

# Backend
cd backend && source venv/Scripts/activate && pip install -r requirements.txt
uvicorn app.main:app --reload

python seed.py

# Frontend
cd frontend && npm install
npx expo start --clear

# Accounts
Database seeded successfully!
Admin: 22568841 / admin123
Admin: admin@halagi.mr / admin123
Admin: admin@7ala9i.com / admin123
Owner 1: ahmed@halagi.mr / owner123
Owner 2: moussa@halagi.mr / owner123
Owner 3: 22789012 / owner123
Client: client@halagi.mr / client123
Created 5 salons with services and working hours

### Cloud build

#### APK Preview
rm -rf ~/7ala9i-build
cp -r /mnt/c/Users/asidimoh/Documents/Moi/planity3/7ala9i/frontend ~/7ala9i-build
cd ~/7ala9i-build
rm -rf android node_modules package-lock.json
npm install
export EAS_NO_VCS=1
eas build --platform android --profile preview

#### AAB Production
rm -rf ~/7ala9i-build-prod
cp -r /mnt/c/Users/asidimoh/Documents/Moi/planity3/7ala9i/frontend ~/7ala9i-build-prod
cd ~/7ala9i-build-prod
rm -rf android node_modules package-lock.json
npm install
export EAS_NO_VCS=1
eas build --platform android --profile production