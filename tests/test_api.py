import copy
from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)

# Keep original snapshot so tests can restore the in-memory DB
_original_activities = copy.deepcopy(activities)


@pytest.fixture(autouse=True)
def restore_activities():
    # Before each test, restore activities to original snapshot
    global activities
    activities.clear()
    activities.update(copy.deepcopy(_original_activities))
    yield
    # After test, restore again to be safe
    activities.clear()
    activities.update(copy.deepcopy(_original_activities))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Check a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    new_email = "test.user@example.com"

    # Ensure not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert new_email not in resp.json()[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={new_email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify present
    resp = client.get("/activities")
    assert new_email in resp.json()[activity]["participants"]

    # Attempt duplicate signup -> 400
    resp = client.post(f"/activities/{activity}/signup?email={new_email}")
    assert resp.status_code == 400

    # Unregister
    resp = client.delete(f"/activities/{activity}/signup?email={new_email}")
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")

    # Verify removed
    resp = client.get("/activities")
    assert new_email not in resp.json()[activity]["participants"]


def test_unregister_nonexistent_activity_or_student():
    # Nonexistent activity
    resp = client.delete("/activities/NoSuchActivity/signup?email=foo@bar.com")
    assert resp.status_code == 404

    # Nonexistent student in existing activity
    resp = client.delete("/activities/Chess%20Club/signup?email=nonexisting@example.com")
    assert resp.status_code == 404
