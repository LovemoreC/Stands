import pytest

from tests.test_submission_email import setup_agents


@pytest.mark.parametrize(
    "initial_env",
    ["deposits@example.com"],
    ids=["default"],
)
def test_contact_settings_crud_flow(client, initial_env):
    headers = setup_agents(client)

    response = client.get("/contact-settings/deposit", headers=headers["admin"])
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is False
    assert data["recipients"] == [initial_env]

    create_payload = {
        "recipients": [
            "primary@example.com",
            "secondary@example.com ",
            "PRIMARY@example.com",
        ]
    }
    create_response = client.post(
        "/contact-settings/deposit",
        json=create_payload,
        headers=headers["admin"],
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["configured"] is True
    assert created["recipients"] == [
        "primary@example.com",
        "secondary@example.com",
    ]

    conflict_response = client.post(
        "/contact-settings/deposit",
        json=create_payload,
        headers=headers["admin"],
    )
    assert conflict_response.status_code == 409

    update_payload = {"recipients": ["updated@example.com"]}
    update_response = client.put(
        "/contact-settings/deposit",
        json=update_payload,
        headers=headers["admin"],
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["recipients"] == ["updated@example.com"]
    assert updated["configured"] is True

    after_update = client.get("/contact-settings/deposit", headers=headers["admin"])
    assert after_update.status_code == 200
    assert after_update.json()["recipients"] == ["updated@example.com"]

    delete_response = client.delete(
        "/contact-settings/deposit",
        headers=headers["admin"],
    )
    assert delete_response.status_code == 204

    fallback_response = client.get(
        "/contact-settings/deposit",
        headers=headers["admin"],
    )
    assert fallback_response.status_code == 200
    fallback = fallback_response.json()
    assert fallback["configured"] is False
    assert fallback["recipients"] == [initial_env]
