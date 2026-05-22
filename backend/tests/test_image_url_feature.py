"""
Test image_url field in materials
Verifies: Materials have image_url field, Admin can create materials with image_url
"""
import pytest
import requests
from pathlib import Path

def get_backend_url():
    env_file = Path('/app/frontend/.env')
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return ''

BASE_URL = get_backend_url().rstrip('/')

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@curtain.uz",
        "password": "admin123"
    })
    assert response.status_code == 200
    return response.json()["token"]

@pytest.fixture
def dealer_token(api_client):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "dealer@test.uz",
        "password": "dealer123"
    })
    assert response.status_code == 200
    return response.json()["token"]

class TestImageURLFeature:
    """Test image_url field in materials"""

    def test_seeded_materials_have_image_urls(self, api_client, dealer_token):
        """Verify seeded materials have image_url field"""
        response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        materials = response.json()
        
        # Filter only seeded materials (not test materials)
        seeded_materials = [m for m in materials if not m['name'].startswith('TEST_')]
        assert len(seeded_materials) >= 6, f"Expected at least 6 seeded materials, got {len(seeded_materials)}"
        
        print(f"\n✓ Found {len(seeded_materials)} seeded materials")
        
        # Verify all seeded materials have image_url field
        for mat in seeded_materials:
            assert "image_url" in mat, f"Material {mat['name']} missing image_url field"
            assert isinstance(mat["image_url"], str), f"image_url should be string, got {type(mat['image_url'])}"
            if mat["image_url"]:  # If not empty, should be valid URL
                assert mat["image_url"].startswith("http"), f"image_url should be valid URL: {mat['image_url']}"
            print(f"  - {mat['name']}: {mat['image_url'][:50]}..." if len(mat['image_url']) > 50 else f"  - {mat['name']}: {mat['image_url']}")
        
        print(f"✓ All seeded materials have image_url field")

    def test_create_material_with_image_url(self, api_client, admin_token):
        """Test POST /materials with image_url field"""
        test_image_url = "https://images.pexels.com/photos/4814070/pexels-photo-4814070.jpeg"
        
        response = api_client.post(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Material_With_Image",
                "category": "Parda",
                "price_per_sqm": 12.5,
                "stock_quantity": 150,
                "unit": "kv.m",
                "description": "Test material with image URL",
                "image_url": test_image_url
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Material_With_Image"
        assert data["image_url"] == test_image_url
        assert "id" in data
        
        print(f"\n✓ Material created with image_url: {data['id']}")
        print(f"  - Name: {data['name']}")
        print(f"  - Image URL: {data['image_url']}")
        print(f"  - Price: ${data['price_per_sqm']}/sq.m")
        
        # Verify material can be retrieved with image_url
        get_response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        materials = get_response.json()
        
        created_mat = next((m for m in materials if m["id"] == data["id"]), None)
        assert created_mat is not None, "Created material not found in list"
        assert created_mat["image_url"] == test_image_url
        
        print(f"✓ Material retrieved successfully with image_url")

    def test_create_material_without_image_url(self, api_client, admin_token):
        """Test POST /materials without image_url (should default to empty string)"""
        response = api_client.post(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Material_No_Image",
                "category": "Jalyuzi",
                "price_per_sqm": 8.0,
                "stock_quantity": 200,
                "unit": "kv.m",
                "description": "Test material without image"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Material_No_Image"
        assert "image_url" in data
        assert data["image_url"] == ""  # Should default to empty string
        
        print(f"\n✓ Material created without image_url (defaults to empty string)")
        print(f"  - Name: {data['name']}")
        print(f"  - Image URL: '{data['image_url']}' (empty)")
