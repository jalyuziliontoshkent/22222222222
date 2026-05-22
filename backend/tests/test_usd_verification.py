"""
Verify USD ($) prices after currency conversion
Tests: Materials have $ prices, Dealer credit limit is $5000, Statistics show $ revenue
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

class TestUSDPrices:
    """Verify all prices are in USD ($)"""

    def test_materials_have_usd_prices(self, api_client, dealer_token):
        """Verify materials have $ prices (7.0, 3.5, 10.0, 8.0, 6.0, 9.0)"""
        response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        materials = response.json()
        assert len(materials) == 6, f"Expected 6 materials, got {len(materials)}"
        
        expected_prices = {7.0, 3.5, 10.0, 8.0, 6.0, 9.0}
        actual_prices = {m["price_per_sqm"] for m in materials}
        
        print(f"\n✓ Materials found: {len(materials)}")
        for mat in materials:
            print(f"  - {mat['name']}: ${mat['price_per_sqm']:.2f} per sq.m")
        
        assert actual_prices == expected_prices, f"Expected prices {expected_prices}, got {actual_prices}"
        print(f"✓ All material prices are in USD: {expected_prices}")

    def test_dealer_credit_limit_is_5000_usd(self, api_client, dealer_token):
        """Verify dealer credit limit is $5,000"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        assert response.status_code == 200
        user = response.json()["user"]
        
        assert user["credit_limit"] == 5000, f"Expected credit_limit $5000, got ${user['credit_limit']}"
        assert user["debt"] == 0, f"Expected debt $0, got ${user['debt']}"
        
        print(f"\n✓ Dealer credit limit: ${user['credit_limit']:,.2f}")
        print(f"✓ Dealer debt: ${user['debt']:.2f}")

    def test_statistics_revenue_in_usd(self, api_client, admin_token):
        """Verify statistics show revenue in USD"""
        response = api_client.get(
            f"{BASE_URL}/api/statistics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        stats = response.json()
        
        assert "total_revenue" in stats
        assert isinstance(stats["total_revenue"], (int, float))
        
        print(f"\n✓ Statistics retrieved:")
        print(f"  - Total Orders: {stats['total_orders']}")
        print(f"  - Total Revenue: ${stats['total_revenue']:,.2f}")
        print(f"  - Total Dealers: {stats['total_dealers']}")
        print(f"  - Total Materials: {stats['total_materials']}")

    def test_order_calculation_with_usd(self, api_client, dealer_token):
        """Verify order calculation uses USD prices"""
        # Get materials
        materials_response = api_client.get(
            f"{BASE_URL}/api/materials",
            headers={"Authorization": f"Bearer {dealer_token}"}
        )
        materials = materials_response.json()
        mat = materials[0]  # Blackout Parda: $7.0
        
        # Create order: 2.5m x 3.0m x 1 qty = 7.5 sq.m
        response = api_client.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {dealer_token}"},
            json={
                "items": [{
                    "material_id": mat["id"],
                    "material_name": mat["name"],
                    "width": 2.5,
                    "height": 3.0,
                    "quantity": 1,
                    "price_per_sqm": mat["price_per_sqm"],
                    "notes": "USD verification test"
                }],
                "notes": "TEST_USD_ORDER"
            }
        )
        assert response.status_code == 200
        order = response.json()
        
        expected_sqm = 2.5 * 3.0 * 1  # 7.5 sq.m
        expected_price = expected_sqm * mat["price_per_sqm"]  # 7.5 * $7.0 = $52.50
        
        assert order["total_sqm"] == expected_sqm, f"Expected {expected_sqm} sq.m, got {order['total_sqm']}"
        assert order["total_price"] == expected_price, f"Expected ${expected_price}, got ${order['total_price']}"
        
        print(f"\n✓ Order calculation verified:")
        print(f"  - Material: {mat['name']} @ ${mat['price_per_sqm']:.2f}/sq.m")
        print(f"  - Dimensions: 2.5m x 3.0m x 1 qty = {expected_sqm} sq.m")
        print(f"  - Total Price: ${expected_price:.2f}")
