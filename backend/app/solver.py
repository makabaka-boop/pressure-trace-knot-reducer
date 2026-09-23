"""Trajectory simplification under a vertical-error tolerance.

All deviation checks use integer cross-multiplication only:

    point k deviates from segment (i, j) by more than `tolerance`  <=>
        |(v_k - v_i) * (t_j - t_i) - (v_j - v_i) * (t_k - t_i)|
            > tolerance * (t_j - t_i)

No floating point is involved anywhere in the decision.
"""

from __future__ import annotations

from typing import Sequence


def segment_ok(
    times: Sequence[int],
    values: Sequence[int],
    tolerance: int,
    i: int,
    j: int,
) -> bool:
    """True if every original point strictly between i and j lies within
    `tolerance` (inclusive) of the straight line from point i to point j."""
    ti, tj = times[i], times[j]
    vi, vj = values[i], values[j]
    dt = tj - ti
    dv = vj - vi
    limit = tolerance * dt
    for k in range(i + 1, j):
        cross = (values[k] - vi) * dt - dv * (times[k] - ti)
        if abs(cross) > limit:
            return False
    return True


def simplify(
    times: Sequence[int], values: Sequence[int], tolerance: int
) -> list[int]:
    """Return the lexicographically smallest index subsequence that:

    - contains index 0 and index n-1,
    - keeps every dropped point within `tolerance` of the polyline,
    - has the minimum possible length.
    """
    n = len(times)
    if n <= 2:
        return list(range(n))

    # valid[i][j]: segment i -> j satisfies the tolerance for all points between.
    valid = [[False] * n for _ in range(n)]
    for i in range(n - 1):
        for j in range(i + 1, n):
            valid[i][j] = segment_ok(times, values, tolerance, i, j)

    inf = n + 1
    # reach[j]: min kept-point count of a valid chain 0 -> ... -> j.
    reach = [inf] * n
    reach[0] = 1
    for j in range(1, n):
        best = inf
        for i in range(j):
            if valid[i][j] and reach[i] < best:
                best = reach[i]
        if best < inf:
            reach[j] = best + 1

    # remain[j]: min kept-point count of a valid chain j -> ... -> n-1.
    remain = [inf] * n
    remain[n - 1] = 1
    for j in range(n - 2, -1, -1):
        best = inf
        for k in range(j + 1, n):
            if valid[j][k] and remain[k] < best:
                best = remain[k]
        if best < inf:
            remain[j] = best + 1

    # Greedy forward scan: at each step take the smallest next index that can
    # still belong to an optimal chain. For an index `last` on an optimal
    # chain, any k with valid(last, k) and remain[k] == remain[last] - 1 also
    # satisfies reach[k] == reach[last] + 1 (otherwise reach[k] + remain[k] - 1
    # would beat the optimum), so such a continuation always exists.
    seq = [0]
    while seq[-1] != n - 1:
        last = seq[-1]
        for nxt in range(last + 1, n):
            if (
                valid[last][nxt]
                and reach[nxt] == reach[last] + 1
                and remain[nxt] == remain[last] - 1
            ):
                seq.append(nxt)
                break
        else:  # pragma: no cover - unreachable while a valid chain exists
            raise RuntimeError("no optimal continuation found")
    return seq
