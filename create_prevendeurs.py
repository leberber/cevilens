#!/usr/bin/env python3
"""
Script to bulk create prevendeur accounts
"""
import requests
import json

# API Configuration
API_URL = "http://localhost:8000/api/v1"  # Change to your actual API URL
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Cevital2030"  # Change to your actual admin password

# Prevendeur data
PREVENDEURS = [
    {"code": "1501-VD204", "name": "AIFOUNE YACINE"},
    {"code": "1501-VH205", "name": "AIT SAILI AMINE"},
    {"code": "1501-VD203", "name": "AMEZIANE KAMEL"},
    {"code": "1501-VD205", "name": "OUALI SAID"},
    {"code": "1501-VD207", "name": "YOUCEFI YOUVA"},
    {"code": "1501-VD209", "name": "YOUCEFI TOUFIK"},
    {"code": "1501-VD201", "name": "BRAHITI MOHAND"},
    {"code": "1501-VD208", "name": "BOUTORA MUSTAPHA"},
    {"code": "1501-VD202", "name": "BECHOUCHE SALIM"},
    {"code": "1501-VD210", "name": "chetouane belkacem"},
    {"code": "1501-VD211", "name": "AMRRARE YACINE"},
    {"code": "1501-VD206", "name": "LAMINE RAMDANI"},
    {"code": "1501-VH201", "name": "KECILI MAKHLOUF"},
    {"code": "1501-VH202", "name": "MESSAOUDI MOHAMED"},
    {"code": "1501-VH207", "name": "Mohand Akli Ikhou"},
    {"code": "1501-VH203", "name": "SALMI MERZOUK"},
    {"code": "1501-H0203", "name": "TABTI BRAHIM"},
    {"code": "1501-VH204", "name": "IBESSAIENE LYES"},
    {"code": "1501-VH206", "name": "BIR ABDENOUR"},
]

def login(session):
    """Login and get auth token"""
    login_url = f"{API_URL}/auth/login"
    data = {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    }
    response = session.post(login_url, data=data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return None
    token = response.json().get("access_token")
    print(f"✅ Logged in successfully")
    return token

def create_prevendeurs_bulk(session, token):
    """Create all prevendeurs in bulk"""
    url = f"{API_URL}/users/bulk"
    headers = {"Authorization": f"Bearer {token}"}

    # Prepare user data
    users = [
        {
            "phone": prev["code"],  # Use code as phone since we don't have real phone numbers
            "full_name": prev["name"],
            "password": prev["code"],  # Use code as password
            "role": "prevendeur",
            "employe_code": prev["code"],
        }
        for prev in PREVENDEURS
    ]

    print(f"\n📤 Creating {len(users)} prevendeur accounts...")
    response = session.post(url, json=users, headers=headers)

    if response.status_code == 201:
        created = response.json()
        print(f"✅ Successfully created {len(created)} accounts:")
        for user in created:
            print(f"   - {user.get('full_name')} ({user.get('employe_code')})")
        return True
    else:
        print(f"❌ Failed to create accounts: {response.status_code}")
        print(f"   {response.text}")
        return False

def main():
    session = requests.Session()

    print("🚀 Prevendeur Bulk Creation Script")
    print(f"API URL: {API_URL}")
    print(f"Total prevendeurs to create: {len(PREVENDEURS)}\n")

    # Login
    token = login(session)
    if not token:
        return

    # Create prevendeurs
    create_prevendeurs_bulk(session, token)
    print("\n✨ Done!")

if __name__ == "__main__":
    main()
