from fastapi import FastAPI

from .schemas import SimplifyRequest, SimplifyResponse
from .solver import simplify

app = FastAPI(title="Wind Tunnel Trajectory Simplifier")


@app.post("/simplify", response_model=SimplifyResponse)
def simplify_endpoint(req: SimplifyRequest) -> SimplifyResponse:
    times = [p.time for p in req.points]
    values = [p.value for p in req.points]
    indices = simplify(times, values, req.tolerance)
    return SimplifyResponse(
        indices=indices,
        points=[req.points[i] for i in indices],
        segments=len(indices) - 1,
    )
