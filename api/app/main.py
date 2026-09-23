"""FastAPI application exposing the optimal trajectory simplifier."""

from __future__ import annotations

from fastapi import FastAPI

from .schemas import SimplifyRequest, SimplifyResponse
from .simplifier import simplify

app = FastAPI(title="Pressure Trajectory Simplifier", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/simplify", response_model=SimplifyResponse)
def simplify_trajectory(request: SimplifyRequest) -> SimplifyResponse:
    times = [point.time for point in request.points]
    values = [point.value for point in request.points]

    indices = simplify(times, values, request.tolerance)
    retained = [request.points[i] for i in indices]

    return SimplifyResponse(
        indices=indices,
        points=retained,
        segment_count=len(indices) - 1,
    )
