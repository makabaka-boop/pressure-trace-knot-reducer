"""Solver tests. Optimality is verified by exhaustive enumeration of all
index subsequences that contain the first and last point."""

from itertools import combinations

import pytest

from app.solver import segment_ok, simplify


def brute_force(times, values, tolerance):
    """Min-length, then lexicographically smallest valid kept subsequence."""
    n = len(times)
    for size in range(2, n + 1):
        best = None
        for middle in combinations(range(1, n - 1), size - 2):
            seq = (0,) + middle + (n - 1,)
            if all(
                segment_ok(times, values, tolerance, a, b)
                for a, b in zip(seq, seq[1:])
            ):
                best = seq
                break  # combinations yields lexicographic order
        if best is not None:
            return list(best)
    raise AssertionError("no valid subsequence found")


def test_two_points_always_kept():
    assert simplify([0, 5], [3, -4], 0) == [0, 1]


def test_collinear_collapses_to_endpoints():
    times = [0, 3, 7, 10, 12]
    values = [1, 4, 8, 11, 13]  # value = time + 1
    assert simplify(times, values, 0) == [0, 4]


def test_zero_tolerance_zigzag_keeps_everything():
    times = [0, 1, 2, 3, 4]
    values = [0, 5, 0, 5, 0]
    assert simplify(times, values, 0) == [0, 1, 2, 3, 4]


def test_deviation_equal_to_tolerance_is_allowed():
    # Point 1 deviates from chord (0,0)-(2,2) by exactly 2.
    times = [0, 1, 2]
    values = [0, 3, 2]
    assert simplify(times, values, 2) == [0, 2]
    assert simplify(times, values, 1) == [0, 1, 2]


def test_tie_broken_by_lexicographic_order():
    # Two optima exist: [0, 1, 4] and [0, 3, 4]; the former is lexicographically smaller.
    times = [0, 1, 2, 3, 4]
    values = [0, 6, 0, 6, 0]
    assert simplify(times, values, 5) == [0, 1, 4]


def test_large_integer_coordinates_exact_check():
    # Deviation from chord equals tolerance exactly; a float-based check with
    # rounding error could flip the decision either way.
    big = 10**9
    times = [0, big // 2, big]
    values = [-(10**6), 10**6, -(10**6)]
    # chord midpoint value is -10**6, actual is +10**6 -> deviation 2*10**6
    assert simplify(times, values, 2 * 10**6) == [0, 2]
    assert simplify(times, values, 2 * 10**6 - 1) == [0, 1, 2]


@pytest.mark.parametrize("seed", range(40))
def test_matches_brute_force_on_random_inputs(seed):
    import random

    rng = random.Random(seed)
    n = rng.randint(2, 10)
    times = sorted(rng.sample(range(0, 60), n))
    values = [rng.randint(-8, 8) for _ in range(n)]
    tolerance = rng.randint(0, 6)
    assert simplify(times, values, tolerance) == brute_force(
        times, values, tolerance
    )


@pytest.mark.parametrize("seed", range(100, 120))
def test_matches_brute_force_with_extreme_values(seed):
    import random

    rng = random.Random(seed)
    n = rng.randint(2, 9)
    times = sorted(rng.sample(range(0, 10**9), n))
    values = [rng.randint(-(10**6), 10**6) for _ in range(n)]
    tolerance = rng.choice([0, 1, 10**6, rng.randint(0, 10**6)])
    assert simplify(times, values, tolerance) == brute_force(
        times, values, tolerance
    )
