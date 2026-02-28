"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new_user@example.com",
            "password": "StrongPass123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new_user@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "StrongPass123",
        "full_name": "User One",
    }
    await client.post("/api/auth/register", json=payload)
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "вже зареєстровано" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    # Register first
    await client.post(
        "/api/auth/register",
        json={
            "email": "login_test@example.com",
            "password": "TestPass123",
            "full_name": "Login User",
        },
    )
    # Login
    response = await client.post(
        "/api/auth/login",
        data={"username": "login_test@example.com", "password": "TestPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrong_pass@example.com",
            "password": "TestPass123",
            "full_name": "Wrong Pass User",
        },
    )
    response = await client.post(
        "/api/auth/login",
        data={"username": "wrong_pass@example.com", "password": "WrongPass"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, auth_headers: dict):
    response = await client.put(
        "/api/auth/change-password",
        json={"old_password": "TestPass123", "new_password": "NewPass456"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    # Login with new password
    response = await client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "NewPass456"},
    )
    assert response.status_code == 200
