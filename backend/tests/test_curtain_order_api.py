"""
Backend API Tests for CurtainOrderApp
Tests: Auth, Statistics, Materials, Dealers, Orders, Chat
"""
import pytest
import requests
import os
from pathlib import Path

# Read BASE_URL from frontend .env file
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
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@curtain.uz",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

@pytest.fixture
def dealer_token(api_client):
    """Get dealer auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "dealer@test.uz",
        "password": "dealer123"
    })
    assert response.status_code == 200, f"Dealer login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@curtain.uz",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@curtain.uz"
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")

    def test_dealer_login_success(self, api_client):
        """Test dealer login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "dealer@test.uz",
            "password": "dealer123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "dealer@test.uz"
        assert data["user"]["role"] == "dealer"
        assert "credit_limit" in data["user"]
        assert "debt" in data["user"]
        print("✓ Dealer login successful")

    def test_login_wrong_password(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@curtain.uz",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Wrong password rejected correctly")

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.uz",
            "password": "password123"
        })
        assert response.status_code == 401
        print("✓ Non-existent user rejected correctly")

    def test_get_me_with_admin_token(self, api_client, admin_token):
        """Test /auth/me endpoint with admin token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print("✓ GET /auth/me works for admin")

    def test_get_me_without_token(self, api_client):
        """Test /auth/me without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthorized access blocked correctly")

class TestStatistics:
    """Statistics endpoint tests (Admin only)"""

    def test_get_statistics_as_admin(self, api_client, admin_token):
        """Test GET /statistics as admin"""
        response = api_client.get(
            f"{BASE_URL}/api/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify all required fields
        assert "total_orders" in data
        assert "total_dealers" in data
        assert "total_materials" in data
        assert "total_revenue" in data
        assert "pending_orders" in data
        assert "approved_orders" in data
        assert "preparing_orders" in data
        assert "delivered_orders" in data
        assert "rejected_orders" in data
        assert isinstance(data["total_orders"], int)
        assert isinstance(data["total_revenue"], (int, float))
        print(f"✓ Statistics retrieved: {data['total_orders']} orders, {data['total_dealers']} dealers, {data['total_materials']} materials")

    def test_get_statistics_as_dealer(self, api_client, dealer_token):
        """Test GET /statistics as dealer (should fail)"""
        response = api_client.get(
            f"{BASE_URL}/api/statistics",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 403
        print("✓ Dealer blocked from accessing statistics")

class TestMaterials:
    """Materials CRUD tests"""

    def test_list_materials_as_dealer(self, api_client, dealer_token):
        """Test GET /materials as dealer"""
        response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # Should have seeded materials
        # Verify material structure
        if len(data) > 0:
            mat = data[0]
            assert "id" in mat
            assert "name" in mat
            assert "category" in mat
            assert "price_per_sqm" in mat
            assert "stock_quantity" in mat
            assert "_id" not in mat  # MongoDB _id should be excluded
        print(f"✓ Materials list retrieved: {len(data)} materials")

    def test_create_material_as_admin(self, api_client, admin_token):
        """Test POST /materials as admin"""
        response = api_client.post(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Material_Pytest",
                "category": "Test",
                "price_per_sqm": 50000,
                "stock_quantity": 100,
                "unit": "kv.m",
                "description": "Test material for pytest"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Material_Pytest"
        assert data["price_per_sqm"] == 50000
        assert "id" in data
        print(f"✓ Material created: {data['id']}")

    def test_create_material_as_dealer(self, api_client, dealer_token):
        """Test POST /materials as dealer (should fail)"""
        response = api_client.post(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"},
            json={
                "name": "Unauthorized Material",
                "category": "Test",
                "price_per_sqm": 50000,
                "stock_quantity": 100
            }
        )
        assert response.status_code == 403
        print("✓ Dealer blocked from creating materials")

class TestDealers:
    """Dealers CRUD tests (Admin only)"""

    def test_list_dealers_as_admin(self, api_client, admin_token):
        """Test GET /dealers as admin"""
        response = api_client.get(
            f"{BASE_URL}/api/dealers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Should have demo dealer
        # Verify dealer structure
        if len(data) > 0:
            dealer = data[0]
            assert "id" in dealer
            assert "name" in dealer
            assert "email" in dealer
            assert "role" in dealer
            assert dealer["role"] == "dealer"
            assert "password_hash" not in dealer  # Should be excluded
            assert "_id" not in dealer
        print(f"✓ Dealers list retrieved: {len(data)} dealers")

    def test_create_dealer_as_admin(self, api_client, admin_token):
        """Test POST /dealers as admin"""
        import random
        email = f"TEST_dealer_{random.randint(1000, 9999)}@test.uz"
        response = api_client.post(
            f"{BASE_URL}/api/dealers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST Dealer Pytest",
                "email": email,
                "password": "testpass123",
                "phone": "+998901234567",
                "address": "Test Address",
                "credit_limit": 10000000
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email.lower()
        assert data["role"] == "dealer"
        assert data["credit_limit"] == 10000000
        assert "password_hash" not in data
        print(f"✓ Dealer created: {data['id']}")

    def test_create_dealer_duplicate_email(self, api_client, admin_token):
        """Test creating dealer with existing email"""
        response = api_client.post(
            f"{BASE_URL}/api/dealers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Duplicate Dealer",
                "email": "dealer@test.uz",
                "password": "testpass123",
                "credit_limit": 5000000
            }
        )
        assert response.status_code == 400
        print("✓ Duplicate email rejected correctly")

    def test_list_dealers_as_dealer(self, api_client, dealer_token):
        """Test GET /dealers as dealer (should fail)"""
        response = api_client.get(
            f"{BASE_URL}/api/dealers",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 403
        print("✓ Dealer blocked from listing dealers")

class TestOrders:
    """Orders CRUD tests with sq.m calculation"""

    def test_create_order_as_dealer(self, api_client, dealer_token):
        """Test POST /orders as dealer with sq.m calculation"""
        # First get materials to use in order
        materials_response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert materials_response.status_code == 200
        materials = materials_response.json()
        assert len(materials) > 0
        
        mat = materials[0]
        
        # Create order with sq.m calculation
        response = api_client.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {dealer_token}"},
            json={
                "items": [
                    {
                        "material_id": mat["id"],
                        "material_name": mat["name"],
                        "width": 2.5,
                        "height": 3.0,
                        "quantity": 2,
                        "price_per_sqm": mat["price_per_sqm"],
                        "notes": "Test order"
                    }
                ],
                "notes": "TEST order from pytest"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "kutilmoqda"
        assert len(data["items"]) == 1
        # Verify sq.m calculation: 2.5 * 3.0 * 2 = 15 sq.m
        assert data["items"][0]["sqm"] == 15.0
        expected_price = 15.0 * mat["price_per_sqm"]
        assert data["items"][0]["price"] == expected_price
        assert data["total_sqm"] == 15.0
        assert data["total_price"] == expected_price
        print(f"✓ Order created: {data['id']}, {data['total_sqm']} sq.m, {data['total_price']} sum")
        return data["id"]

    def test_list_orders_as_dealer(self, api_client, dealer_token):
        """Test GET /orders as dealer (only own orders)"""
        response = api_client.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All orders should belong to this dealer
        for order in data:
            assert "dealer_id" in order
            assert "status" in order
            assert "total_sqm" in order
            assert "total_price" in order
        print(f"✓ Dealer orders retrieved: {len(data)} orders")

    def test_list_orders_as_admin(self, api_client, admin_token):
        """Test GET /orders as admin (all orders)"""
        response = api_client.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can see all orders: {len(data)} orders")

    def test_update_order_status_as_admin(self, api_client, admin_token, dealer_token):
        """Test PUT /orders/{id}/status as admin"""
        # First create an order as dealer
        materials_response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        materials = materials_response.json()
        mat = materials[0]
        
        create_response = api_client.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {dealer_token}"},
            json={
                "items": [{
                    "material_id": mat["id"],
                    "material_name": mat["name"],
                    "width": 1.0,
                    "height": 1.0,
                    "quantity": 1,
                    "price_per_sqm": mat["price_per_sqm"]
                }]
            }
        )
        order_id = create_response.json()["id"]
        
        # Update status as admin
        response = api_client.put(
            f"{BASE_URL}/api/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "tasdiqlangan"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "tasdiqlangan"
        print(f"✓ Order status updated to: {data['status']}")

class TestChat:
    """Chat/Messages tests"""

    def test_send_message_dealer_to_admin(self, api_client, dealer_token, admin_token):
        """Test POST /messages from dealer to admin"""
        # Get admin ID
        admin_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_id = admin_response.json()["user"]["id"]
        
        # Send message
        response = api_client.post(
            f"{BASE_URL}/api/messages",
            headers={"Authorization": f"Bearer {dealer_token}"},
            json={
                "receiver_id": admin_id,
                "text": "TEST message from pytest dealer"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["text"] == "TEST message from pytest dealer"
        assert data["receiver_id"] == admin_id
        print(f"✓ Message sent: {data['id']}")

    def test_get_chat_partners_as_admin(self, api_client, admin_token):
        """Test GET /chat/partners as admin"""
        response = api_client.get(
            f"{BASE_URL}/api/chat/partners",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Admin should see dealers
        for partner in data:
            assert partner["role"] == "dealer"
            assert "last_message" in partner
            assert "unread_count" in partner
        print(f"✓ Chat partners retrieved: {len(data)} dealers")

    def test_get_chat_partners_as_dealer(self, api_client, dealer_token):
        """Test GET /chat/partners as dealer"""
        response = api_client.get(
            f"{BASE_URL}/api/chat/partners",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Dealer should see only admin
        assert len(data) == 1
        assert data[0]["role"] == "admin"
        print("✓ Dealer sees admin as chat partner")

    def test_get_messages_between_dealer_and_admin(self, api_client, dealer_token, admin_token):
        """Test GET /messages/{partner_id}"""
        # Get admin ID
        admin_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_id = admin_response.json()["user"]["id"]
        
        # Get messages as dealer
        response = api_client.get(
            f"{BASE_URL}/api/messages/{admin_id}",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Messages retrieved: {len(data)} messages")
