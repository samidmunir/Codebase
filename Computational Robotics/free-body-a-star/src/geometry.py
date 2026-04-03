import math


def rotate_point(x, y, angle_deg):
    """
    Rotate a point (x, y) about the origin by angle_deg degrees.
    """
    theta = math.radians(angle_deg)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    xr = x * cos_t - y * sin_t
    yr = x * sin_t + y * cos_t
    return xr, yr


def get_rectangle_corners(cx, cy, width, height, angle_deg):
    """
    Compute the 4 world-space corners of a rectangle centered at (cx, cy),
    with the given width, height, and rotation angle in degrees.

    Corner order:
        bottom-left, bottom-right, top-right, top-left
        in the rectangle's local frame before rotation.
    """
    half_w = width / 2.0
    half_h = height / 2.0

    local_corners = [
        (-half_w, -half_h),
        (half_w, -half_h),
        (half_w, half_h),
        (-half_w, half_h),
    ]

    world_corners = []
    for x_local, y_local in local_corners:
        x_rot, y_rot = rotate_point(x_local, y_local, angle_deg)
        x_world = cx + x_rot
        y_world = cy + y_rot
        world_corners.append((x_world, y_world))

    return world_corners


def subtract_points(a, b):
    """
    Return vector a - b for 2D points/vectors.
    """
    return (a[0] - b[0], a[1] - b[1])


def dot(a, b):
    """
    Dot product of 2D vectors.
    """
    return a[0] * b[0] + a[1] * b[1]


def length(v):
    """
    Euclidean length of a 2D vector.
    """
    return math.hypot(v[0], v[1])


def normalize(v):
    """
    Return a unit vector in the direction of v.
    """
    mag = length(v)
    if mag == 0:
        raise ValueError("Cannot normalize a zero-length vector.")
    return (v[0] / mag, v[1] / mag)


def perpendicular(v):
    """
    Return a perpendicular vector to v.
    For (x, y), one perpendicular is (-y, x).
    """
    return (-v[1], v[0])


def get_polygon_axes(corners):
    """
    Given polygon corners in order, return the set of normalized axes
    perpendicular to each edge.

    For a rectangle, this produces 4 axes, though opposite edges will
    generate duplicate directions up to sign. That is okay.
    """
    axes = []
    n = len(corners)

    for i in range(n):
        p1 = corners[i]
        p2 = corners[(i + 1) % n]

        edge = subtract_points(p2, p1)
        axis = perpendicular(edge)
        axis = normalize(axis)
        axes.append(axis)

    return axes


def project_polygon_onto_axis(corners, axis):
    """
    Project all polygon corners onto the given axis and return
    the scalar interval [min_proj, max_proj].
    """
    projections = [dot(corner, axis) for corner in corners]
    return min(projections), max(projections)


def intervals_overlap(interval_a, interval_b):
    """
    Return True if 1D intervals overlap, else False.

    Intervals overlap if:
        max_a >= min_b and max_b >= min_a
    """
    min_a, max_a = interval_a
    min_b, max_b = interval_b
    return max_a >= min_b and max_b >= min_a


def polygons_collide_sat(corners_a, corners_b):
    """
    Use the Separating Axis Theorem to test collision between
    two convex polygons.

    Returns:
        True  -> polygons collide
        False -> polygons do not collide
    """
    axes_a = get_polygon_axes(corners_a)
    axes_b = get_polygon_axes(corners_b)
    axes = axes_a + axes_b

    for axis in axes:
        projection_a = project_polygon_onto_axis(corners_a, axis)
        projection_b = project_polygon_onto_axis(corners_b, axis)

        if not intervals_overlap(projection_a, projection_b):
            return False

    return True


def rectangles_collide(rect_a, rect_b):
    """
    Convenience function for SAT collision between two rectangles.
    Each rectangle is a dict with:
        cx, cy, width, height, angle
    """
    corners_a = get_rectangle_corners(
        rect_a["cx"], rect_a["cy"], rect_a["width"], rect_a["height"], rect_a["angle"]
    )
    corners_b = get_rectangle_corners(
        rect_b["cx"], rect_b["cy"], rect_b["width"], rect_b["height"], rect_b["angle"]
    )

    return polygons_collide_sat(corners_a, corners_b)


def rectangle_within_bounds(rect, world_width, world_height):
    """
    Return True if all rectangle corners lie within the world bounds.
    """
    corners = get_rectangle_corners(
        rect["cx"], rect["cy"], rect["width"], rect["height"], rect["angle"]
    )

    for x, y in corners:
        if x < 0 or x > world_width or y < 0 or y > world_height:
            return False

    return True