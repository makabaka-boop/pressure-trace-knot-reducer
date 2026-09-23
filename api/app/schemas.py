"""Pydantic schemas for the simplification API.

Validation is intentionally strict so that the problem statement is
enforced at the boundary:

* unknown fields are rejected;
* only genuine integers are accepted (floats, booleans and numeric
  strings are not silently coerced);
* the point count, coordinate ranges and time ordering are checked.
"""

from __future__ import annotations

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    model_validator,
)

MIN_POINTS = 2
MAX_POINTS = 120
MIN_TIME = 0
MAX_TIME = 10**9
MAX_ABS_VALUE = 10**6
MAX_TOLERANCE = 10**6


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time: StrictInt = Field(ge=MIN_TIME, le=MAX_TIME)
    value: StrictInt = Field(ge=-MAX_ABS_VALUE, le=MAX_ABS_VALUE)


class SimplifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    points: list[Point] = Field(min_length=MIN_POINTS, max_length=MAX_POINTS)
    tolerance: StrictInt = Field(ge=0, le=MAX_TOLERANCE)

    @model_validator(mode="after")
    def _check_strictly_increasing_times(self) -> "SimplifyRequest":
        previous = None
        for point in self.points:
            if previous is not None and point.time <= previous:
                raise ValueError(
                    "points.time must be strictly increasing"
                )
            previous = point.time
        return self


class SimplifyResponse(BaseModel):
    """Only the retained indices, retained points and segment count."""

    indices: list[int]
    points: list[Point]
    segment_count: int
