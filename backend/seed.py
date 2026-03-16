"""Seed script: creates admin, owners, salons, services, working hours, and sample data."""
import asyncio
from datetime import time
from uuid import uuid4

from sqlalchemy import select
from app.database import async_session_factory, engine, Base
from app.models import *  # noqa
from app.models.user import User, UserRole
from app.models.salon import Salon, SalonPhoto
from app.models.service import ServiceCategory, Service
from app.models.working_hours import WorkingHours
from app.utils.security import hash_password


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Check if already seeded
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # --- Admin ---
        admin = User(
            email="admin@halagi.mr",
            password_hash=hash_password("admin123"),
            first_name="Admin",
            last_name="7ala9i",
            phone="+22212345678",
            role=UserRole.admin,
            language_pref="ar",
            is_phone_verified=True,
        )
        db.add(admin)

        # --- Owners ---
        owner1 = User(
            email="ahmed@halagi.mr",
            password_hash=hash_password("owner123"),
            first_name="أحمد",
            last_name="ولد محمد",
            phone="+22234567890",
            role=UserRole.owner,
            language_pref="ar",
            is_phone_verified=True,
        )
        owner2 = User(
            email="moussa@halagi.mr",
            password_hash=hash_password("owner123"),
            first_name="موسى",
            last_name="ولد عبد الله",
            phone="+22245678901",
            role=UserRole.owner,
            language_pref="ar",
            is_phone_verified=True,
        )
        owner3 = User(
            email="ibrahim@halagi.mr",
            password_hash=hash_password("owner123"),
            first_name="إبراهيم",
            last_name="ولد سيدي",
            phone="+22256789012",
            role=UserRole.owner,
            language_pref="fr",
            is_phone_verified=True,
        )
        db.add_all([owner1, owner2, owner3])
        await db.flush()

        # --- Sample Client ---
        client = User(
            email="client@halagi.mr",
            password_hash=hash_password("client123"),
            first_name="محمد",
            last_name="ولد أحمد",
            phone="+22267890123",
            role=UserRole.client,
            language_pref="ar",
            is_phone_verified=True,
        )
        db.add(client)

        # --- Salons ---
        salons_data = [
            {
                "owner": owner1,
                "name": "Salon Al-Amir",
                "name_ar": "صالون الأمير",
                "description": "Premier barber salon in Tevragh Zeina, Nouakchott",
                "description_ar": "صالون حلاقة فاخر في تفرغ زينة، نواكشوط",
                "address": "Avenue Gamal Abdel Nasser, Tevragh Zeina",
                "city": "Nouakchott",
                "lat": 18.0866,
                "lng": -15.9785,
                "phone": "+22234567890",
                "avg_rating": 4.5,
                "total_reviews": 23,
            },
            {
                "owner": owner2,
                "name": "Barbershop Elegance",
                "name_ar": "حلاقة الأناقة",
                "description": "Modern barbershop in Ksar, Nouakchott",
                "description_ar": "صالون حلاقة عصري في لكصر، نواكشوط",
                "address": "Rue de l'Ambassade, Ksar",
                "city": "Nouakchott",
                "lat": 18.0735,
                "lng": -15.9582,
                "phone": "+22245678901",
                "avg_rating": 4.2,
                "total_reviews": 15,
            },
            {
                "owner": owner3,
                "name": "Le Coiffeur",
                "name_ar": "الحلاق",
                "description": "Traditional and modern cuts in Ilot K, Nouakchott",
                "description_ar": "قصات تقليدية وعصرية في إيلوت ك، نواكشوط",
                "address": "Ilot K, Tevragh Zeina",
                "city": "Nouakchott",
                "lat": 18.0901,
                "lng": -15.9732,
                "phone": "+22256789012",
                "avg_rating": 4.8,
                "total_reviews": 31,
            },
            {
                "owner": owner1,
                "name": "Salon Al-Noor",
                "name_ar": "صالون النور",
                "description": "Family-friendly barber in Arafat, Nouakchott",
                "description_ar": "صالون حلاقة عائلي في عرفات، نواكشوط",
                "address": "Carrefour Arafat",
                "city": "Nouakchott",
                "lat": 18.0543,
                "lng": -15.9436,
                "phone": "+22278901234",
                "avg_rating": 3.9,
                "total_reviews": 8,
            },
            {
                "owner": owner2,
                "name": "Style Studio",
                "name_ar": "ستوديو ستايل",
                "description": "Youth-oriented modern barbershop in Sebkha",
                "description_ar": "صالون حلاقة عصري للشباب في السبخة",
                "address": "Marché Capitale, Sebkha",
                "city": "Nouakchott",
                "lat": 18.0912,
                "lng": -15.9656,
                "phone": "+22289012345",
                "avg_rating": 4.0,
                "total_reviews": 12,
            },
        ]

        salon_objects = []
        for s in salons_data:
            owner = s.pop("owner")
            salon = Salon(owner_id=owner.id, **s)
            db.add(salon)
            salon_objects.append(salon)

        await db.flush()

        # --- Photos ---
        photo_urls = [
            "https://images.unsplash.com/photo-1585747860019-8e8ef4b0b0f3?w=800",
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800",
            "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800",
            "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800",
        ]

        for salon in salon_objects:
            salon.cover_photo_url = photo_urls[0]
            for i, url in enumerate(photo_urls):
                photo = SalonPhoto(salon_id=salon.id, photo_url=url, sort_order=i)
                db.add(photo)

        # --- Service Categories & Services ---
        services_template = [
            {
                "category": {"name": "Haircuts", "name_ar": "قص الشعر"},
                "services": [
                    {"name": "Regular Haircut", "name_ar": "قصة عادية", "price": 100, "duration": 30},
                    {"name": "Fade Haircut", "name_ar": "قصة فايد", "price": 150, "duration": 30},
                    {"name": "Kids Haircut", "name_ar": "قصة أطفال", "price": 80, "duration": 20},
                    {"name": "Buzz Cut", "name_ar": "حلاقة كاملة", "price": 80, "duration": 15},
                ],
            },
            {
                "category": {"name": "Beard", "name_ar": "اللحية"},
                "services": [
                    {"name": "Beard Trim", "name_ar": "تهذيب اللحية", "price": 50, "duration": 15},
                    {"name": "Full Shave", "name_ar": "حلاقة كاملة للحية", "price": 80, "duration": 20},
                    {"name": "Beard Design", "name_ar": "تصميم اللحية", "price": 100, "duration": 25},
                ],
            },
            {
                "category": {"name": "Packages", "name_ar": "باقات"},
                "services": [
                    {"name": "Haircut + Beard", "name_ar": "قصة + لحية", "price": 200, "duration": 45},
                    {"name": "VIP Package", "name_ar": "باقة VIP", "price": 350, "duration": 60},
                    {"name": "Groom Package", "name_ar": "باقة العريس", "price": 500, "duration": 90},
                ],
            },
        ]

        for salon in salon_objects:
            for sort_idx, cat_data in enumerate(services_template):
                category = ServiceCategory(
                    salon_id=salon.id,
                    name=cat_data["category"]["name"],
                    name_ar=cat_data["category"]["name_ar"],
                    sort_order=sort_idx,
                )
                db.add(category)
                await db.flush()

                for svc in cat_data["services"]:
                    service = Service(
                        category_id=category.id,
                        salon_id=salon.id,
                        name=svc["name"],
                        name_ar=svc["name_ar"],
                        price=svc["price"],
                        duration=svc["duration"],
                        is_active=True,
                    )
                    db.add(service)

        # --- Working Hours (closed Friday, open Sat-Thu 9:00-21:00) ---
        for salon in salon_objects:
            for day in range(7):
                is_closed = day == 4  # Friday (weekday index 4)
                wh = WorkingHours(
                    salon_id=salon.id,
                    day_of_week=day,
                    open_time=time(9, 0),
                    close_time=time(21, 0),
                    is_closed=is_closed,
                )
                db.add(wh)

        await db.commit()
        print("Database seeded successfully!")
        print(f"  Admin: admin@halagi.mr / admin123")
        print(f"  Owner 1: ahmed@halagi.mr / owner123")
        print(f"  Owner 2: moussa@halagi.mr / owner123")
        print(f"  Owner 3: ibrahim@halagi.mr / owner123")
        print(f"  Client: client@halagi.mr / client123")
        print(f"  Created {len(salon_objects)} salons with services and working hours")


if __name__ == "__main__":
    asyncio.run(seed())
