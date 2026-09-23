"""Optimal polyline simplification under a vertical error bound.

Given samples ``(time, value)`` with strictly increasing integer times,
choose the shortest index subsequence that contains both endpoints and
such that for every retained segment ``i -> j`` the vertical distance of
each intermediate sample to the linear interpolation between the two
endpoints does not exceed ``tolerance``.  Among all shortest solutions
the lexicographically smallest index sequence is returned.

Every error comparison is performed with integer cross multiplication;
no floating point arithmetic is involved.
"""

from __future__ import annotations


def within_segment(
    t_i: int,
    v_i: int,
    t_j: int,
    v_j: int,
    t_k: int,
    v_k: int,
    tolerance: int,
) -> bool:
    """Return whether sample *k* is within ``tolerance`` of segment i-j.

    The interpolated value at ``t_k`` is

        v_i + (v_j - v_i) * (t_k - t_i) / (t_j - t_i)

    so the condition ``|v_k - interp| <= tolerance`` is cross-multiplied
    by the positive denominator ``(t_j - t_i)``::

        |(v_k - v_i) * (t_j - t_i) - (v_j - v_i) * (t_k - t_i)|
            <= tolerance * (t_j - t_i)

    Every factor is an integer, hence the result is exact.
    """
    dt = t_j - t_i
    deviation = (v_k - v_i) * dt - (v_j - v_i) * (t_k - t_i)
    if deviation < 0:
        deviation = -deviation
    return deviation <= tolerance * dt


def _reachable(times: list[int], values: list[int], tolerance: int) -> list[int]:
    """Build the visibility graph as bit masks.

    Bit ``j`` of ``reachable[i]`` is set when every sample strictly
    between ``i`` and ``j`` is within ``tolerance`` of the straight
    segment connecting them.  A failing intermediate point does *not*
    permit an early break: a later point can come back inside the error
    corridor even when an earlier one lies outside it.
    """
    n = len(times)
    reachable = [0] * n
    for i in range(n - 1):
        mask = 0
        for j in range(i + 1, n):
            ok = True
            for k in range(i + 1, j):
                if not within_segment(
                    times[i], values[i],
                    times[j], values[j],
                    times[k], values[k],
                    tolerance,
                ):
                    ok = False
                    break
            if ok:
                mask |= 1 << j
        reachable[i] = mask
    return reachable


def simplify(
    times: list[int],
    values: list[int],
    tolerance: int,
) -> list[int]:
    """Return the optimal retained-index subsequence.

    The visibility graph is a DAG (all edges go forward in index).  The
    minimum number of segments from every node to the last node is found
    with dynamic programming in reverse index order.  Walking forward and
    always taking the *smallest* reachable next index that still lies on
    a shortest path yields the lexicographically smallest optimum.
    """
    n = len(times)
    if n < 2:
        raise ValueError("at least two samples are required")

    reachable = _reachable(times, values, tolerance)

    # dist[i] = minimum number of segments from i to n-1.
    infinity = n + 1
    dist = [infinity] * n
    dist[n - 1] = 0
    for i in range(n - 2, -1, -1):
        mask = reachable[i]
        best = infinity
        while mask:
            bit = mask & -mask
            j = bit.bit_length() - 1
            candidate = dist[j] + 1
            if candidate < best:
                best = candidate
            mask ^= bit
        dist[i] = best

    # Reconstruct the lexicographically smallest shortest path.
    path = [0]
    while path[-1] != n - 1:
        i = path[-1]
        mask = reachable[i]
        chosen = None
        while mask:
            bit = mask & -mask
            j = bit.bit_length() - 1
            if dist[j] == dist[i] - 1:
                chosen = j  # bits are inspected in ascending j
                break
            mask ^= bit
        if chosen is None:  # pragma: no cover - adjacent nodes always connect
            raise RuntimeError("internal error: path reconstruction failed")
        path.append(chosen)
    return path
