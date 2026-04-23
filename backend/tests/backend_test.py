"""
Backend E2E tests for TNH - Lo Más Pro
Covers auth, products, filters, stats, barcode, orders, AI chat.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lo-mas-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDENTIALS = {
    "fernando": "fernando2026",
    "ernesto": "ernesto2026",
    "tienda": "tienda2026",
}


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def fernando_token(session):
    r = session.post(f"{API}/auth/login", json={"username": "fernando", "password": "fernando2026"})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def ernesto_token(session):
    r = session.post(f"{API}/auth/login", json={"username": "ernesto", "password": "ernesto2026"})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture
def auth_headers(fernando_token):
    return {"Authorization": f"Bearer {fernando_token}", "Content-Type": "application/json"}


@pytest.fixture
def ernesto_headers(ernesto_token):
    return {"Authorization": f"Bearer {ernesto_token}", "Content-Type": "application/json"}


# --------------------------------------------------------------------------- #
# Auth tests
# --------------------------------------------------------------------------- #
class TestAuth:
    def test_login_fernando(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "fernando", "password": "fernando2026"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["username"] == "fernando"
        assert data["user"]["role"] == "commercial"
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_ernesto(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "ernesto", "password": "ernesto2026"})
        assert r.status_code == 200
        assert r.json()["user"]["username"] == "ernesto"

    def test_login_tienda(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "tienda", "password": "tienda2026"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "shop"

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "fernando", "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_user(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "nobody", "password": "x"})
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        user = r.json()
        assert user["username"] == "fernando"
        assert "password_hash" not in user
        assert "_id" not in user

    def test_me_without_token(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code == 401


# --------------------------------------------------------------------------- #
# Products filters
# --------------------------------------------------------------------------- #
class TestFilters:
    def test_filters_structure(self, session, auth_headers):
        r = session.get(f"{API}/products/filters", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ["tipo", "denominacion", "zona", "pais", "bodega", "distribuidor", "categoria", "variedades", "price_min", "price_max", "total"]:
            assert k in data, f"Missing key: {k}"
        assert data["total"] == 1586, f"Expected 1586 products, got {data['total']}"
        assert data["price_min"] >= 0
        assert data["price_max"] > data["price_min"]
        assert isinstance(data["categoria"], list) and len(data["categoria"]) > 0
        # category values sanity
        cats = {c["value"] for c in data["categoria"]}
        assert "tinto" in cats

    def test_filters_requires_auth(self):
        r = requests.get(f"{API}/products/filters")
        assert r.status_code == 401


# --------------------------------------------------------------------------- #
# Products list
# --------------------------------------------------------------------------- #
class TestProducts:
    def test_list_default(self, session, auth_headers):
        r = session.get(f"{API}/products", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1586
        assert data["per_page"] == 30
        assert len(data["items"]) == 30
        # No _id or search_text
        for item in data["items"]:
            assert "_id" not in item
            assert "search_text" not in item
            assert "codigo" in item and "nombre" in item

    def test_filter_categoria_tinto(self, session, auth_headers):
        r = session.get(f"{API}/products?categoria=tinto", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        assert all(p["categoria"] == "tinto" for p in data["items"])

    def test_filter_multi_categoria(self, session, auth_headers):
        r = session.get(f"{API}/products?categoria=tinto,blanco", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        assert all(p["categoria"] in ("tinto", "blanco") for p in data["items"])

    def test_search_q(self, session, auth_headers):
        r = session.get(f"{API}/products?q=ribera", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        # At least one item should mention ribera
        found = any("ribera" in (p.get("nombre", "") + p.get("denominacion", "") + p.get("zona", "")).lower() for p in data["items"])
        assert found

    def test_combined_filter_price(self, session, auth_headers):
        r = session.get(
            f"{API}/products",
            headers=auth_headers,
            params={"denominacion": "RIBERA DEL DUERO, DOP.", "min_price": 10, "max_price": 50},
        )
        assert r.status_code == 200
        data = r.json()
        for p in data["items"]:
            assert p["denominacion"] == "RIBERA DEL DUERO, DOP."
            assert 10 <= p["pvp_tienda"] <= 50

    def test_sort_price_asc(self, session, auth_headers):
        r = session.get(f"{API}/products?sort=price_asc&per_page=20", headers=auth_headers)
        assert r.status_code == 200
        prices = [p["pvp_tienda"] for p in r.json()["items"]]
        assert prices == sorted(prices)

    def test_sort_price_desc(self, session, auth_headers):
        r = session.get(f"{API}/products?sort=price_desc&per_page=20", headers=auth_headers)
        assert r.status_code == 200
        prices = [p["pvp_tienda"] for p in r.json()["items"]]
        assert prices == sorted(prices, reverse=True)

    def test_pagination(self, session, auth_headers):
        r1 = session.get(f"{API}/products?page=1&per_page=10", headers=auth_headers)
        r2 = session.get(f"{API}/products?page=2&per_page=10", headers=auth_headers)
        assert r1.status_code == 200 and r2.status_code == 200
        ids1 = [p["codigo"] for p in r1.json()["items"]]
        ids2 = [p["codigo"] for p in r2.json()["items"]]
        assert len(ids1) == 10 and len(ids2) == 10
        assert set(ids1).isdisjoint(set(ids2))

    def test_get_product_by_codigo(self, session, auth_headers):
        r = session.get(f"{API}/products/20510", headers=auth_headers)
        assert r.status_code == 200
        p = r.json()
        assert p["codigo"] == "20510"
        assert "_id" not in p
        assert "search_text" not in p

    def test_get_product_not_found(self, session, auth_headers):
        r = session.get(f"{API}/products/ZZZZZ9999", headers=auth_headers)
        assert r.status_code == 404

    def test_products_requires_auth(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 401


# --------------------------------------------------------------------------- #
# Barcode
# --------------------------------------------------------------------------- #
class TestBarcode:
    def test_barcode_exact(self, session, auth_headers):
        r = session.get(f"{API}/products/barcode/20510", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["match_type"] == "exact"
        assert data["product"]["codigo"] == "20510"
        assert data["alternatives"] == []

    def test_barcode_fuzzy(self, session, auth_headers):
        r = session.get(f"{API}/products/barcode/luis felipe", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["match_type"] in ("fuzzy", "exact")
        assert data["product"] is not None

    def test_barcode_none(self, session, auth_headers):
        r = session.get(f"{API}/products/barcode/zzzzz999", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["match_type"] == "none"
        assert data["product"] is None


# --------------------------------------------------------------------------- #
# Stats
# --------------------------------------------------------------------------- #
class TestStats:
    def test_stats(self, session, auth_headers):
        r = session.get(f"{API}/products/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1586
        for k in ["by_categoria", "by_denominacion", "by_pais", "price_buckets"]:
            assert k in data
            assert isinstance(data[k], list)
        assert len(data["by_categoria"]) > 0
        assert "categoria" in data["by_categoria"][0]
        assert "count" in data["by_categoria"][0]
        assert "avg_price" in data["by_categoria"][0]


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class TestOrders:
    @pytest.fixture(scope="class")
    def created_order(self, session):
        # Log in fresh to get token at class scope
        r = session.post(f"{API}/auth/login", json={"username": "fernando", "password": "fernando2026"})
        token = r.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        body = {
            "comercial": "Fernando",
            "cliente": "TEST_Cliente E2E",
            "observaciones": "TEST order from backend_test",
            "tarifa": "PVP 5 (HORECA)",
            "items": [
                {"codigo": "20510", "nombre": "TEST Product", "cantidad": 2, "precio_unitario": 15.5, "tarifa": "PVP 5 (HORECA)"},
                {"codigo": "20511", "nombre": "TEST Product 2", "cantidad": 1, "precio_unitario": 10.0, "tarifa": "PVP 5 (HORECA)"},
            ],
        }
        r = session.post(f"{API}/orders", headers=headers, json=body)
        assert r.status_code == 200, f"Create order failed: {r.status_code} {r.text}"
        return r.json(), headers

    def test_create_order(self, created_order):
        order, _ = created_order
        assert "id" in order and order["id"]
        assert order["total"] == 41.0  # 2*15.5 + 1*10
        assert order["created_by"] == "fernando"
        assert "_id" not in order
        assert len(order["items"]) == 2

    def test_get_order_by_id(self, session, created_order):
        order, headers = created_order
        r = session.get(f"{API}/orders/{order['id']}", headers=headers)
        assert r.status_code == 200
        o = r.json()
        assert o["id"] == order["id"]
        assert o["cliente"] == "TEST_Cliente E2E"
        assert "_id" not in o

    def test_list_orders_mine(self, session, created_order):
        order, headers = created_order
        r = session.get(f"{API}/orders?mine=true", headers=headers)
        assert r.status_code == 200
        data = r.json()
        ids = [o["id"] for o in data["items"]]
        assert order["id"] in ids
        assert all(o["created_by"] == "fernando" for o in data["items"])

    def test_list_orders_isolation(self, session, created_order, ernesto_headers):
        # Ernesto should NOT see Fernando's order when mine=true
        order, _ = created_order
        r = session.get(f"{API}/orders?mine=true", headers=ernesto_headers)
        assert r.status_code == 200
        ids = [o["id"] for o in r.json()["items"]]
        assert order["id"] not in ids

    def test_get_order_not_found(self, session, auth_headers):
        r = session.get(f"{API}/orders/nonexistent-id-xyz", headers=auth_headers)
        assert r.status_code == 404

    def test_orders_requires_auth(self):
        r = requests.get(f"{API}/orders")
        assert r.status_code == 401


# --------------------------------------------------------------------------- #
# AI Chat
# --------------------------------------------------------------------------- #
class TestAI:
    def test_ai_chat_basic(self, session, auth_headers):
        body = {"message": "Hola, ¿qué vino tinto me recomiendas de Ribera del Duero?"}
        r = session.post(f"{API}/ai/chat", headers=auth_headers, json=body, timeout=120)
        assert r.status_code == 200, f"AI chat failed: {r.status_code} {r.text[:500]}"
        data = r.json()
        assert "session_id" in data and data["session_id"]
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 20
        # Response should be in Spanish — check for common Spanish word presence
        reply_lower = data["reply"].lower()
        spanish_hints = ["vino", "bodega", "recomiendo", "ribera", "tinto", "denominación", "para", "con"]
        assert any(w in reply_lower for w in spanish_hints), f"Reply not in Spanish: {data['reply'][:200]}"

    def test_ai_chat_session_continuation(self, session, auth_headers):
        # First message
        r1 = session.post(f"{API}/ai/chat", headers=auth_headers, json={"message": "Hola"}, timeout=120)
        assert r1.status_code == 200
        sid = r1.json()["session_id"]
        time.sleep(1)
        # Second message in same session
        r2 = session.post(
            f"{API}/ai/chat",
            headers=auth_headers,
            json={"session_id": sid, "message": "Dame una recomendación de blanco"},
            timeout=120,
        )
        assert r2.status_code == 200
        assert r2.json()["session_id"] == sid

    def test_ai_sessions_list(self, session, auth_headers):
        r = session.get(f"{API}/ai/sessions", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "sessions" in data and isinstance(data["sessions"], list)

    def test_ai_session_messages(self, session, auth_headers):
        # Create a session
        r = session.post(f"{API}/ai/chat", headers=auth_headers, json={"message": "Test mensaje"}, timeout=120)
        sid = r.json()["session_id"]
        time.sleep(1)
        r2 = session.get(f"{API}/ai/sessions/{sid}", headers=auth_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data["session_id"] == sid
        assert isinstance(data["messages"], list)
        assert len(data["messages"]) >= 2  # user + assistant
        roles = [m["role"] for m in data["messages"]]
        assert "user" in roles and "assistant" in roles

    def test_ai_requires_auth(self):
        r = requests.post(f"{API}/ai/chat", json={"message": "hola"})
        assert r.status_code == 401
