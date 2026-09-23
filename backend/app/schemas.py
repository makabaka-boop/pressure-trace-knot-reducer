from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_TIME = 10**9
MAX_VALUE = 10**6
MAX_TOLERANCE = 10**6
MAX_POINTS = 120


class Point(BaseModel):
    """One sample. `strict` rejects bools/floats/numeric strings; extra fields
    are forbidden so unknown keys fail with 422."""

    model_config = ConfigDict(strict=True, extra="forbid")

    time: int = Field(ge=0, le=MAX_TIME)
    value: int = Field(ge=-MAX_VALUE, le=MAX_VALUE)


class SimplifyRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    points: list[Point] = Field(min_length=2, max_length=MAX_POINTS)
    tolerance: int = Field(ge=0, le=MAX_TOLERANCE)

    @field_validator("points")
    @classmethod
    def times_strictly_increasing(cls, pts: list[Point]) -> list[Point]:
        for prev, cur in zip(pts, pts[1:]):
            if cur.time <= prev.time:
                raise ValueError("points must have strictly increasing time")
        return pts


class SimplifyResponse(BaseModel):
    indices: list[int]
    points: list[Point]
    segments: int
