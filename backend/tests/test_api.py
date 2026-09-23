import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "points": [
        {"time": 0, "value": 0},
        {"time": 1, "value": 6},
        {"time": 2, "value": 0},
        {"time": 3, "value": 6},
        {"time": 4, "value": 0},
    ],
    "tolerance": 5,
}


def test_success_response_shape():
    resp = client.post("/simplify", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"indices", "points", "segments"}
    assert body["indices"] == [0, 1, 4]
    assert body["points"] == [
        {"time": 0, "value": 0},
        {"time": 1, "value": 6},
        {"time": 4, "value": 0},
    ]
    assert body["segments"] == 2


def test_response_points_match_input_at_indices():
    payload = {
        "points": [{"time": t, "value": (t * 7) % 11 - 5} for t in range(9)],
        "tolerance": 2,
    }
    resp = client.post("/simplify", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["indices"][0] == 0
    assert body["indices"][-1] == len(payload["points"]) - 1
    assert body["segments"] == len(body["indices"]) - 1
    for idx, pt in zip(body["indices"], body["points"]):
        assert pt == payload["points"][idx]


@pytest.mark.parametrize(
    "payload",
    [
        # unknown top-level field
        {**VALID_PAYLOAD, "unit": "Pa"},
        # unknown point field
        {**VALID_PAYLOAD, "points": [{"time": 0, "value": 1, "label": "a"}, {"time": 1, "value": 2}]},
        # missing field
        {"points": [{"time": 0}, {"time": 1, "value": 2}], "tolerance": 1},
        # non-integer time
        {"points": [{"time": 0.5, "value": 1}, {"time": 1, "value": 2}], "tolerance": 1},
        # bool is not an integer
        {"points": [{"time": 0, "value": True}, {"time": 1, "value": 2}], "tolerance": 1},
        # numeric string is not an integer
        {"points": [{"time": "0", "value": 1}, {"time": 1, "value": 2}], "tolerance": 1},
        # time not strictly increasing (equal)
        {"points": [{"time": 1, "value": 0}, {"time": 1, "value": 2}], "tolerance": 1},
        # time not strictly increasing (decreasing)
        {"points": [{"time": 2, "value": 0}, {"time": 1, "value": 2}], "tolerance": 1},
        # time out of range
        {"points": [{"time": 0, "value": 0}, {"time": 10**9 + 1, "value": 2}], "tolerance": 1},
        {"points": [{"time": -1, "value": 0}, {"time": 1, "value": 2}], "tolerance": 1},
        # value out of range
        {"points": [{"time": 0, "value": 10**6 + 1}, {"time": 1, "value": 2}], "tolerance": 1},
        # tolerance out of range
        {"points": [{"time": 0, "value": 0}, {"time": 1, "value": 2}], "tolerance": -1},
        {"points": [{"time": 0, "value": 0}, {"time": 1, "value": 2}], "tolerance": 10**6 + 1},
        # too few / too many points
        {"points": [{"time": 0, "value": 0}], "tolerance": 1},
        {"points": [{"time": t, "value": 0} for t in range(121)], "tolerance": 1},
        # points not a list
        {"points": {"time": 0}, "tolerance": 1},
    ],
)
def test_invalid_payloads_return_422(payload):
    resp = client.post("/simplify", json=payload)
    assert resp.status_code == 422


def test_boundary_payloads_accepted():
    resp = client.post(
        "/simplify",
        json={
            "points": [
                {"time": 0, "value": -(10**6)},
                {"time": 10**9, "value": 10**6},
            ],
            "tolerance": 10**6,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["indices"] == [0, 1]

    resp = client.post(
        "/simplify",
        json={
            "points": [{"time": t, "value": 0} for t in range(120)],
            "tolerance": 0,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["indices"] == [0, 119]
