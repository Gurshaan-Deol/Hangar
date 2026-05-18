import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "hangar-api"}
